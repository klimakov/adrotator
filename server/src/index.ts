import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import staticPlugin from '@fastify/static';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import { pool } from './db';
import { redis } from './redis';
import { campaignRoutes } from './routes/campaigns';
import { creativeRoutes } from './routes/creatives';
import { placementRoutes } from './routes/placements';
import { serveRoutes } from './routes/serve';
import { trackRoutes } from './routes/track';
import { statsRoutes } from './routes/stats';

async function main() {
  const app = Fastify({
    logger: {
      level: config.nodeEnv === 'production' ? 'info' : 'debug',
    },
    trustProxy: true,
  });

  // Плагины
  await app.register(cors, { origin: config.corsOrigin });
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });

  // Статические файлы (загруженные креативы)
  const uploadDir = path.resolve(config.uploadDir);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  await app.register(staticPlugin, {
    root: uploadDir,
    prefix: '/uploads/',
    decorateReply: false,
  });

  // Роуты
  await app.register(campaignRoutes);
  await app.register(creativeRoutes);
  await app.register(placementRoutes);
  await app.register(serveRoutes);
  await app.register(trackRoutes);
  await app.register(statsRoutes);

  // Хелсчек
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // Автоматический флаш статистики каждые 5 минут
  const flushInterval = setInterval(async () => {
    try {
      const date = new Date().toISOString().slice(0, 10);
      const keys = await redis.keys(`stats:${date}:*`);
      for (const key of keys) {
        const parts = key.split(':');
        const creativeId = parseInt(parts[2], 10);
        const placementId = parseInt(parts[3], 10);
        const data = await redis.hgetall(key);
        if (data.impressions || data.clicks) {
          await pool.query(
            `INSERT INTO daily_stats (date, creative_id, placement_id, impressions, clicks)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (date, creative_id, placement_id)
             DO UPDATE SET impressions = daily_stats.impressions + $4,
                           clicks = daily_stats.clicks + $5`,
            [date, creativeId, placementId, parseInt(data.impressions || '0', 10), parseInt(data.clicks || '0', 10)]
          );
          await redis.del(key);
        }
      }
    } catch (err: any) {
      app.log.error('Stats flush error:', err.message);
    }
  }, 5 * 60 * 1000);

  // Применить миграции при старте
  try {
    const migrationPath = path.join(__dirname, 'migrations', '001_initial.sql');
    if (fs.existsSync(migrationPath)) {
      const sql = fs.readFileSync(migrationPath, 'utf-8');
      await pool.query(sql);
      app.log.info('Migrations applied');
    }
  } catch (err: any) {
    app.log.error('Migration error:', err.message);
  }

  // Запуск
  app.addHook('onClose', async () => {
    clearInterval(flushInterval);
    await pool.end();
    redis.disconnect();
  });

  await app.listen({ port: config.port, host: config.host });
  app.log.info(`AdRotator server running on http://${config.host}:${config.port}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
