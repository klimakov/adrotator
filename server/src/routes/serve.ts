import { FastifyInstance } from 'fastify';
import { queryMany, queryOne } from '../db';
import { redis, incrImpression } from '../redis';

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
}

/**
 * Взвешенный случайный выбор креатива
 */
function weightedRandom(creatives: Creative[]): Creative {
  const totalWeight = creatives.reduce((sum, c) => sum + c.weight, 0);
  let random = Math.random() * totalWeight;
  for (const c of creatives) {
    random -= c.weight;
    if (random <= 0) return c;
  }
  return creatives[creatives.length - 1];
}

export async function serveRoutes(app: FastifyInstance) {
  // Выдать баннер для зоны (JSON API)
  app.get('/serve/:zoneKey', async (req, reply) => {
    const { zoneKey } = req.params as { zoneKey: string };

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

      // Получить активные креативы для площадки
      creatives = await queryMany<Creative>(
        `SELECT cr.* FROM creatives cr
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

    reply.header('Access-Control-Allow-Origin', '*');
    reply.header('Cache-Control', 'no-store');

    if (!creatives || creatives.length === 0) {
      return reply.code(204).send();
    }

    // Выбрать креатив по весам
    const creative = weightedRandom(creatives);

    // Получить placement_id для трекинга
    const placement = await queryOne<{ id: number }>(
      'SELECT id FROM placements WHERE zone_key = $1',
      [zoneKey]
    );

    // Асинхронно увеличить счётчик показа
    if (placement) {
      incrImpression(creative.id, placement.id).catch(() => {});
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

    const placement = await queryOne<{ id: number; width: number; height: number }>(
      'SELECT id, width, height FROM placements WHERE zone_key = $1 AND status = $2',
      [zoneKey, 'active']
    );

    if (!placement) {
      return reply.type('text/html').send('<html><body></body></html>');
    }

    const creatives = await queryMany<Creative>(
      `SELECT cr.* FROM creatives cr
       JOIN placement_creatives pc ON pc.creative_id = cr.id
       JOIN campaigns camp ON camp.id = cr.campaign_id
       WHERE pc.placement_id = $1
         AND cr.status = 'active'
         AND camp.status = 'active'
         AND (camp.start_date IS NULL OR camp.start_date <= NOW())
         AND (camp.end_date IS NULL OR camp.end_date >= NOW())`,
      [placement.id]
    );

    if (creatives.length === 0) {
      return reply.type('text/html').send('<html><body></body></html>');
    }

    const creative = weightedRandom(creatives);

    // Запись показа
    incrImpression(creative.id, placement.id).catch(() => {});

    let body: string;
    if (creative.type === 'html' && creative.html_content) {
      body = creative.html_content;
    } else {
      const clickTag = creative.click_url
        ? `<a href="/track/click/${creative.id}?zone=${zoneKey}&redirect=${encodeURIComponent(creative.click_url)}" target="_blank">`
        : '<span>';
      const clickEnd = creative.click_url ? '</a>' : '</span>';
      body = `${clickTag}<img src="${creative.image_url}" width="${creative.width}" height="${creative.height}" style="display:block;border:0;" />${clickEnd}`;
    }

    const html = `<!DOCTYPE html>
<html><head><style>body{margin:0;padding:0;overflow:hidden;}</style></head>
<body>${body}
<script>new Image().src="/track/impression/${creative.id}?p=${placement.id}&t="+Date.now();</script>
</body></html>`;

    return reply.type('text/html').send(html);
  });
}
