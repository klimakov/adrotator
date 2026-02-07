import { FastifyInstance } from 'fastify';
import { query, queryOne } from '../db';
import { incrImpression, incrClick } from '../redis';

export async function trackRoutes(app: FastifyInstance) {
  // Трекинг показа (1×1 пиксель)
  app.get('/track/impression/:creativeId', async (req, reply) => {
    const { creativeId } = req.params as { creativeId: string };
    const { p: placementId } = req.query as { p?: string };
    const ip = req.headers['x-real-ip'] as string || req.ip;
    const ua = req.headers['user-agent'] || '';
    const referer = req.headers['referer'] || '';

    const cid = parseInt(creativeId, 10);
    if (Number.isNaN(cid)) return reply.code(400).send({ error: 'Invalid creative id' });
    const pid = placementId ? parseInt(placementId, 10) : null;
    if (placementId != null && Number.isNaN(Number(placementId))) return reply.code(400).send({ error: 'Invalid placement id' });

    // Асинхронно записать в БД
    query(
      'INSERT INTO impressions (creative_id, placement_id, ip_address, user_agent, referer) VALUES ($1,$2,$3,$4,$5)',
      [cid, pid, ip, ua, referer]
    ).catch((err) => console.error('Impression log error:', err.message));

    // Инкремент в Redis
    if (pid) {
      incrImpression(cid, pid).catch(() => {});
    }

    // Вернуть прозрачный 1×1 GIF
    const pixel = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    );
    reply.header('Content-Type', 'image/gif');
    reply.header('Cache-Control', 'no-store, no-cache, must-revalidate');
    reply.header('Access-Control-Allow-Origin', '*');
    return reply.send(pixel);
  });

  // Трекинг клика + редирект
  app.get('/track/click/:creativeId', async (req, reply) => {
    const { creativeId } = req.params as { creativeId: string };
    const { zone, redirect } = req.query as { zone?: string; redirect?: string };
    const ip = req.headers['x-real-ip'] as string || req.ip;
    const ua = req.headers['user-agent'] || '';
    const referer = req.headers['referer'] || '';

    const cid = parseInt(creativeId, 10);
    if (Number.isNaN(cid)) return reply.code(400).send({ error: 'Invalid creative id' });

    // Определить placement_id по zone
    let pid: number | null = null;
    if (zone) {
      const pl = await queryOne<{ id: number }>('SELECT id FROM placements WHERE zone_key = $1', [zone]);
      pid = pl?.id ?? null;
    }

    // Записать клик
    query(
      'INSERT INTO clicks (creative_id, placement_id, ip_address, user_agent, referer) VALUES ($1,$2,$3,$4,$5)',
      [cid, pid, ip, ua, referer]
    ).catch((err) => console.error('Click log error:', err.message));

    if (pid) {
      incrClick(cid, pid).catch(() => {});
    }

    // Редирект на целевую страницу
    if (redirect) {
      return reply.redirect(redirect);
    }
    return reply.code(204).send();
  });
}
