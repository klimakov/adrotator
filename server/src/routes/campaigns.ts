import { FastifyInstance } from 'fastify';
import { queryMany, queryOne, query } from '../db';
import { isWebhookUrlSafe } from '../url-validate';

export async function campaignRoutes(app: FastifyInstance) {
  // Список кампаний
  app.get('/campaigns', async (_req, reply) => {
    const rows = await queryMany(
      `SELECT c.*, 
              COUNT(DISTINCT cr.id) AS creatives_count,
              COALESCE(SUM(ds.impressions), 0)::int AS total_impressions,
              COALESCE(SUM(ds.clicks), 0)::int AS total_clicks,
              COALESCE(SUM(ds.viewable_impressions), 0)::int AS total_viewable
       FROM campaigns c
       LEFT JOIN creatives cr ON cr.campaign_id = c.id
       LEFT JOIN daily_stats ds ON ds.creative_id = cr.id
       GROUP BY c.id
       ORDER BY c.created_at DESC`
    );
    return rows;
  });

  // Одна кампания
  app.get('/campaigns/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = await queryOne('SELECT * FROM campaigns WHERE id = $1', [id]);
    if (!row) return reply.code(404).send({ error: 'Campaign not found' });
    return row;
  });

  // Создать кампанию
  app.post('/campaigns', async (req, reply) => {
    const { name, status, daily_budget, total_budget, start_date, end_date, frequency_cap, webhook_url } = req.body as any;
    const fc = frequency_cap === '' || frequency_cap == null ? null : parseInt(String(frequency_cap), 10);
    let wu: string | null = webhook_url === '' || webhook_url == null ? null : (webhook_url || null);
    if (wu && !isWebhookUrlSafe(wu)) {
      return reply.code(400).send({ error: 'webhook_url is not allowed (use a public http/https URL)' });
    }
    const row = await queryOne(
      `INSERT INTO campaigns (name, status, daily_budget, total_budget, start_date, end_date, frequency_cap, webhook_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [name, status || 'active', daily_budget || 0, total_budget || 0, start_date, end_date, fc, wu]
    );
    return reply.code(201).send(row);
  });

  // Обновить кампанию
  app.put('/campaigns/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { name, status, daily_budget, total_budget, start_date, end_date, frequency_cap, webhook_url } = req.body as any;
    const fc = frequency_cap === '' || frequency_cap == null ? null : parseInt(String(frequency_cap), 10);
    let wu: string | null = webhook_url === '' || webhook_url == null ? null : (webhook_url || null);
    if (wu && !isWebhookUrlSafe(wu)) {
      return reply.code(400).send({ error: 'webhook_url is not allowed (use a public http/https URL)' });
    }
    const row = await queryOne(
      `UPDATE campaigns SET name=$1, status=$2, daily_budget=$3, total_budget=$4,
       start_date=$5, end_date=$6, frequency_cap=$7, webhook_url=$8, updated_at=NOW()
       WHERE id=$9 RETURNING *`,
      [name, status, daily_budget, total_budget, start_date, end_date, fc, wu, id]
    );
    if (!row) return reply.code(404).send({ error: 'Campaign not found' });
    return row;
  });

  // Удалить кампанию
  app.delete('/campaigns/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    await query('DELETE FROM campaigns WHERE id = $1', [id]);
    return { ok: true };
  });
}
