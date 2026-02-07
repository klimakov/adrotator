import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
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

  await app.register(cors, { origin: config.corsOrigin });
  await app.register(rateLimit, {
    max: 300,
    timeWindow: '1 minute',
  });
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

  // Опциональная аутентификация по API Key для админских роутов
  app.addHook('onRequest', async (req, reply) => {
    if (!config.apiKey) return;
    const pathname = req.url?.split('?')[0] || '';
    const adminPaths = ['/campaigns', '/creatives', '/placements', '/stats'];
    const isAdmin = adminPaths.some((p) => pathname === p || pathname.startsWith(p + '/'));
    if (!isAdmin) return;
    const key = req.headers['x-api-key'] as string;
    if (key !== config.apiKey) {
      return reply.code(401).send({ error: 'Missing or invalid X-API-Key' });
    }
  });

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
        const impressions = parseInt(data.impressions || '0', 10);
        const clicks = parseInt(data.clicks || '0', 10);
        const viewable = parseInt(data.viewable || '0', 10);
        if (impressions || clicks || viewable) {
          await pool.query(
            `INSERT INTO daily_stats (date, creative_id, placement_id, impressions, clicks, viewable_impressions)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (date, creative_id, placement_id)
             DO UPDATE SET impressions = daily_stats.impressions + $4,
                           clicks = daily_stats.clicks + $5,
                           viewable_impressions = daily_stats.viewable_impressions + $6`,
            [date, creativeId, placementId, impressions, clicks, viewable]
          );
          await redis.del(key);
        }
      }
    } catch (err: any) {
      app.log.error('Stats flush error:', err.message);
    }
  }, 5 * 60 * 1000);

  // A/B: пересчёт effective_weight по CTR за последние 48ч (раз в час)
  const abInterval = setInterval(async () => {
    try {
      await pool.query(`
        WITH stats AS (
          SELECT creative_id, SUM(impressions)::int AS imp, SUM(clicks)::int AS cl
          FROM daily_stats WHERE date >= CURRENT_DATE - 2
          GROUP BY creative_id
          HAVING SUM(impressions) >= 50
        )
        UPDATE creatives cr SET effective_weight = LEAST(100, GREATEST(1,
          ROUND((cr.weight::numeric * (1 + (s.cl::numeric / NULLIF(s.imp, 0)) * 20))::numeric)::int))
        FROM stats s WHERE cr.id = s.creative_id
      `);
      await pool.query(`
        UPDATE creatives SET effective_weight = NULL
        WHERE id NOT IN (
          SELECT creative_id FROM daily_stats WHERE date >= CURRENT_DATE - 2
          GROUP BY creative_id HAVING SUM(impressions) >= 50
        )
      `);
    } catch (err: any) {
      app.log.error('A/B weight update error:', err.message);
    }
  }, 60 * 60 * 1000);

  // Применить миграции при старте
  try {
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      await pool.query(sql);
      app.log.info(`Migration applied: ${file}`);
    }
  } catch (err: any) {
    app.log.error('Migration error:', err.message);
  }

  // Запуск
  app.addHook('onClose', async () => {
    clearInterval(flushInterval);
    clearInterval(abInterval);
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
