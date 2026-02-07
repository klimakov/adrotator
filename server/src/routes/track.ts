import { FastifyInstance } from 'fastify';
import { query, queryOne } from '../db';
import { incrImpression, incrClick, incrViewable } from '../redis';
import { isRedirectUrlAllowed, isWebhookUrlSafe } from '../url-validate';

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

    let clickId: number | null = null;
    try {
      const res = await query(
        'INSERT INTO clicks (creative_id, placement_id, ip_address, user_agent, referer) VALUES ($1,$2,$3,$4,$5) RETURNING id',
        [cid, pid, ip, ua, referer]
      );
      clickId = (res.rows[0] as { id: number })?.id ?? null;
    } catch (err) {
      req.log?.error?.(err, 'Click log error');
    }

    if (pid) {
      incrClick(cid, pid).catch(() => {});
    }

    // Webhook: асинхронный POST на URL кампании при клике
    const campaign = await queryOne<{ campaign_id: number; webhook_url: string | null }>(
      'SELECT c.id AS campaign_id, c.webhook_url FROM campaigns c JOIN creatives cr ON cr.campaign_id = c.id WHERE cr.id = $1',
      [cid]
    );
    if (campaign?.webhook_url && isWebhookUrlSafe(campaign.webhook_url)) {
      const payload = JSON.stringify({
        event: 'click',
        campaign_id: campaign.campaign_id,
        creative_id: cid,
        placement_id: pid,
        click_id: clickId,
        ip,
        user_agent: ua,
        referer: referer || null,
        timestamp: new Date().toISOString(),
      });
      fetch(campaign.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      }).catch((err) => req.log?.warn?.(err, 'Webhook POST failed'));
    }

    // Редирект на целевую страницу (только разрешённые URL — защита от Open Redirect)
    if (redirect) {
      if (!isRedirectUrlAllowed(redirect)) {
        return reply.code(400).send({ error: 'Invalid redirect URL' });
      }
      return reply.redirect(redirect);
    }
    return reply.code(204).send();
  });

  // Видимый показ (MRC: ≥50% баннера в viewport ≥1 сек) — вызывается из SDK после Intersection Observer
  const pixelGif = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
  );
  app.get('/track/viewable/:creativeId', async (req, reply) => {
    const { creativeId } = req.params as { creativeId: string };
    const { p: placementId } = req.query as { p?: string };
    const cid = parseInt(creativeId, 10);
    if (Number.isNaN(cid)) return reply.code(400).send({ error: 'Invalid creative id' });
    const pid = placementId ? parseInt(placementId, 10) : null;
    if (placementId != null && Number.isNaN(Number(placementId))) return reply.code(400).send({ error: 'Invalid placement id' });

    if (pid) incrViewable(cid, pid).catch(() => {});

    reply.header('Content-Type', 'image/gif');
    reply.header('Cache-Control', 'no-store, no-cache, must-revalidate');
    reply.header('Access-Control-Allow-Origin', '*');
    return reply.send(pixelGif);
  });
}
