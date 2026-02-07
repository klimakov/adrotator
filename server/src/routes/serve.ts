import { FastifyInstance } from 'fastify';
import { createHash } from 'crypto';
import { queryMany, queryOne } from '../db';
import { redis, incrImpression } from '../redis';

function escapeHtmlAttr(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Экранирование для атрибута srcdoc: только " и &, чтобы не выйти из атрибута. HTML внутри iframe рендерится как есть. */
function escapeSrcdoc(html: string): string {
  return String(html)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;');
}

interface Creative {
  id: number;
  campaign_id: number;
  name: string;
  type: string;
  width: number;
  height: number;
  image_url: string | null;
  click_url: string | null;
  html_content: string | null;
  weight: number;
  effective_weight?: number | null;
  campaign_frequency_cap?: number | null;
}

function getWeight(c: Creative): number {
  const w = c.effective_weight ?? c.weight;
  return Math.max(1, w);
}

/**
 * Взвешенный случайный выбор креатива (A/B: используем effective_weight при наличии)
 */
function weightedRandom(creatives: Creative[]): Creative {
  const totalWeight = creatives.reduce((sum, c) => sum + getWeight(c), 0);
  let random = Math.random() * totalWeight;
  for (const c of creatives) {
    random -= getWeight(c);
    if (random <= 0) return c;
  }
  return creatives[creatives.length - 1];
}

function getUid(req: any): string {
  const q = req.query || {};
  const uid = typeof q.uid === 'string' && /^[a-zA-Z0-9_-]{8,64}$/.test(q.uid) ? q.uid : '';
  if (uid) return uid;
  const ip = (req.headers && req.headers['x-real-ip']) || req.ip || '';
  const ua = (req.headers && req.headers['user-agent']) || '';
  return createHash('sha256').update(ip + ua).digest('hex').slice(0, 32);
}

export async function serveRoutes(app: FastifyInstance) {
  // Выдать баннер для зоны (JSON API)
  app.get('/serve/:zoneKey', async (req, reply) => {
    const { zoneKey } = req.params as { zoneKey: string };
    const uid = getUid(req);

    // Попробовать кэш в Redis
    const cacheKey = `zone:${zoneKey}:creatives`;
    let creatives: Creative[] | null = null;

    const cached = await redis.get(cacheKey);
    if (cached) {
      creatives = JSON.parse(cached);
    }

    if (!creatives || creatives.length === 0) {
      // Получить площадку
      const placement = await queryOne<{ id: number; width: number; height: number }>(
        'SELECT id, width, height FROM placements WHERE zone_key = $1 AND status = $2',
        [zoneKey, 'active']
      );

      if (!placement) {
        reply.header('Access-Control-Allow-Origin', '*');
        return reply.code(204).send();
      }

      // Получить активные креативы с effective_weight и frequency_cap кампании
      creatives = await queryMany<Creative>(
        `SELECT cr.*, camp.frequency_cap AS campaign_frequency_cap FROM creatives cr
         JOIN placement_creatives pc ON pc.creative_id = cr.id
         JOIN campaigns camp ON camp.id = cr.campaign_id
         WHERE pc.placement_id = $1
           AND cr.status = 'active'
           AND camp.status = 'active'
           AND (camp.start_date IS NULL OR camp.start_date <= NOW())
           AND (camp.end_date IS NULL OR camp.end_date >= NOW())`,
        [placement.id]
      );

      // Кэш на 60 секунд
      if (creatives.length > 0) {
        await redis.set(cacheKey, JSON.stringify(creatives), 'EX', 60);
      }
    }

    // Frequency cap: убрать креативы кампаний, у которых лимит показов на юзера исчерпан
    const campaignCaps = new Map<number, number>();
    for (const c of creatives!) {
      const cap = c.campaign_frequency_cap;
      if (cap != null && cap > 0 && !campaignCaps.has(c.campaign_id)) campaignCaps.set(c.campaign_id, cap);
    }
    if (campaignCaps.size > 0) {
      const overCap = new Set<number>();
      for (const [campId, cap] of campaignCaps) {
        const key = `fcap:${campId}:${uid}`;
        const n = parseInt(await redis.get(key) || '0', 10);
        if (n >= cap) overCap.add(campId);
      }
      creatives = creatives!.filter((c) => !overCap.has(c.campaign_id));
    }

    reply.header('Access-Control-Allow-Origin', '*');
    reply.header('Cache-Control', 'no-store');

    if (!creatives || creatives.length === 0) {
      return reply.code(204).send();
    }

    // Выбрать креатив по весам (A/B: effective_weight)
    const creative = weightedRandom(creatives);

    // Получить placement_id для трекинга
    const placement = await queryOne<{ id: number }>(
      'SELECT id FROM placements WHERE zone_key = $1',
      [zoneKey]
    );

    // Асинхронно: счётчик показа + frequency cap
    if (placement) {
      incrImpression(creative.id, placement.id).catch(() => {});
      const cap = creative.campaign_frequency_cap;
      if (cap != null && cap > 0) {
        const key = `fcap:${creative.campaign_id}:${uid}`;
        redis.incr(key).then(() => redis.expire(key, 86400)).catch(() => {});
      }
    }

    // Вернуть JSON для SDK
    return {
      id: creative.id,
      type: creative.type,
      width: creative.width,
      height: creative.height,
      image_url: creative.image_url,
      click_url: creative.click_url,
      html_content: creative.html_content,
      zone: zoneKey,
      placement_id: placement?.id,
    };
  });

  // Рендер баннера в iframe (альтернативный способ)
  app.get('/serve/:zoneKey/html', async (req, reply) => {
    const { zoneKey } = req.params as { zoneKey: string };
    const uid = getUid(req);

    const placement = await queryOne<{ id: number; width: number; height: number }>(
      'SELECT id, width, height FROM placements WHERE zone_key = $1 AND status = $2',
      [zoneKey, 'active']
    );

    if (!placement) {
      return reply.type('text/html').send('<html><body></body></html>');
    }

    let creatives = await queryMany<Creative>(
      `SELECT cr.*, camp.frequency_cap AS campaign_frequency_cap FROM creatives cr
       JOIN placement_creatives pc ON pc.creative_id = cr.id
       JOIN campaigns camp ON camp.id = cr.campaign_id
       WHERE pc.placement_id = $1
         AND cr.status = 'active'
         AND camp.status = 'active'
         AND (camp.start_date IS NULL OR camp.start_date <= NOW())
         AND (camp.end_date IS NULL OR camp.end_date >= NOW())`,
      [placement.id]
    );

    const campaignCaps = new Map<number, number>();
    for (const c of creatives) {
      const cap = c.campaign_frequency_cap;
      if (cap != null && cap > 0 && !campaignCaps.has(c.campaign_id)) campaignCaps.set(c.campaign_id, cap);
    }
    if (campaignCaps.size > 0) {
      const overCap = new Set<number>();
      for (const [campId, cap] of campaignCaps) {
        const key = `fcap:${campId}:${uid}`;
        const n = parseInt(await redis.get(key) || '0', 10);
        if (n >= cap) overCap.add(campId);
      }
      creatives = creatives.filter((c) => !overCap.has(c.campaign_id));
    }

    if (creatives.length === 0) {
      return reply.type('text/html').send('<html><body></body></html>');
    }

    const creative = weightedRandom(creatives);

    incrImpression(creative.id, placement.id).catch(() => {});
    const cap = creative.campaign_frequency_cap;
    if (cap != null && cap > 0) {
      const key = `fcap:${creative.campaign_id}:${uid}`;
      redis.incr(key).then(() => redis.expire(key, 86400)).catch(() => {});
    }

    const w = placement.width;
    const h = placement.height;
    let body: string;
    if (creative.type === 'html' && creative.html_content) {
      // HTML-креатив показываем в sandbox iframe: изоляция от родителя, защита от XSS
      const sandboxed = escapeSrcdoc(creative.html_content);
      body = `<iframe sandbox="allow-scripts allow-popups" srcdoc="${sandboxed}" width="${w}" height="${h}" style="border:0;display:block;" title="Реклама"></iframe>`;
    } else {
      const safeRedirect = creative.click_url ? encodeURIComponent(creative.click_url) : '';
      const clickTag = creative.click_url
        ? `<a href="/track/click/${creative.id}?zone=${zoneKey}&redirect=${safeRedirect}" target="_blank">`
        : '<span>';
      const clickEnd = creative.click_url ? '</a>' : '</span>';
      const safeImgSrc = escapeHtmlAttr(creative.image_url || '');
      body = `${clickTag}<img src="${safeImgSrc}" width="${creative.width}" height="${creative.height}" style="display:block;border:0;" />${clickEnd}`;
    }

    const html = `<!DOCTYPE html>
<html><head><style>body{margin:0;padding:0;overflow:hidden;}</style></head>
<body>${body}
<script>new Image().src="/track/impression/${creative.id}?p=${placement.id}&t="+Date.now();</script>
</body></html>`;

    return reply.type('text/html').send(html);
  });
}
