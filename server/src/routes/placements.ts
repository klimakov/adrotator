import { FastifyInstance } from 'fastify';
import { queryMany, queryOne, query } from '../db';

export async function placementRoutes(app: FastifyInstance) {
  // Список площадок
  app.get('/placements', async (_req, _reply) => {
    return queryMany(
      `SELECT p.*,
              COUNT(DISTINCT pc.creative_id) AS creatives_count,
              COALESCE(SUM(ds.impressions), 0)::int AS total_impressions,
              COALESCE(SUM(ds.clicks), 0)::int AS total_clicks,
              COALESCE(SUM(ds.viewable_impressions), 0)::int AS total_viewable
       FROM placements p
       LEFT JOIN placement_creatives pc ON pc.placement_id = p.id
       LEFT JOIN daily_stats ds ON ds.placement_id = p.id
       GROUP BY p.id
       ORDER BY p.created_at DESC`
    );
  });

  // Одна площадка
  app.get('/placements/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = await queryOne('SELECT * FROM placements WHERE id = $1', [id]);
    if (!row) return reply.code(404).send({ error: 'Placement not found' });

    // Привязанные креативы
    const creatives = await queryMany(
      `SELECT cr.* FROM creatives cr
       JOIN placement_creatives pc ON pc.creative_id = cr.id
       WHERE pc.placement_id = $1`,
      [id]
    );

    return { ...row, creatives };
  });

  // Создать площадку
  app.post('/placements', async (req, reply) => {
    const { name, site_domain, zone_key, width, height, status } = req.body as any;
    const row = await queryOne(
      `INSERT INTO placements (name, site_domain, zone_key, width, height, status)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, site_domain, zone_key, width || 300, height || 250, status || 'active']
    );
    return reply.code(201).send(row);
  });

  // Обновить площадку
  app.put('/placements/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { name, site_domain, zone_key, width, height, status } = req.body as any;
    const row = await queryOne(
      `UPDATE placements SET name=$1, site_domain=$2, zone_key=$3, width=$4, height=$5, status=$6
       WHERE id=$7 RETURNING *`,
      [name, site_domain, zone_key, width, height, status, id]
    );
    if (!row) return reply.code(404).send({ error: 'Placement not found' });
    return row;
  });

  const MAX_CREATIVES_PER_PLACEMENT = 500;
  app.post('/placements/:id/creatives', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { creative_ids } = req.body as { creative_ids: number[] };
    if (!Array.isArray(creative_ids) || creative_ids.length > MAX_CREATIVES_PER_PLACEMENT) {
      return reply.code(400).send({ error: `creative_ids must be an array with at most ${MAX_CREATIVES_PER_PLACEMENT} items` });
    }

    await query('DELETE FROM placement_creatives WHERE placement_id = $1', [id]);
    for (const cid of creative_ids) {
      await query(
        'INSERT INTO placement_creatives (placement_id, creative_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [id, cid]
      );
    }

    return { ok: true, count: creative_ids.length };
  });

  // Удалить площадку
  app.delete('/placements/:id', async (req, _reply) => {
    const { id } = req.params as { id: string };
    await query('DELETE FROM placements WHERE id = $1', [id]);
    return { ok: true };
  });
}
