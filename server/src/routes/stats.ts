import { FastifyInstance } from 'fastify';
import { queryMany, query } from '../db';
import { redis } from '../redis';

export async function statsRoutes(app: FastifyInstance) {
  // Общая статистика (дашборд)
  app.get('/stats/summary', async (_req, _reply) => {
    const [campaigns, creatives, placements, today, total] = await Promise.all([
      query('SELECT COUNT(*)::int AS count FROM campaigns WHERE status = $1', ['active']),
      query('SELECT COUNT(*)::int AS count FROM creatives WHERE status = $1', ['active']),
      query('SELECT COUNT(*)::int AS count FROM placements WHERE status = $1', ['active']),
      query(
        `SELECT COALESCE(SUM(impressions),0)::int AS impressions, COALESCE(SUM(clicks),0)::int AS clicks,
                COALESCE(SUM(viewable_impressions),0)::int AS viewable_impressions
         FROM daily_stats WHERE date = CURRENT_DATE`
      ),
      query(
        `SELECT COALESCE(SUM(impressions),0)::int AS impressions, COALESCE(SUM(clicks),0)::int AS clicks,
                COALESCE(SUM(viewable_impressions),0)::int AS viewable_impressions
         FROM daily_stats`
      ),
    ]);

    return {
      active_campaigns: campaigns.rows[0].count,
      active_creatives: creatives.rows[0].count,
      active_placements: placements.rows[0].count,
      today_impressions: today.rows[0].impressions,
      today_clicks: today.rows[0].clicks,
      today_viewable: today.rows[0].viewable_impressions,
      total_impressions: total.rows[0].impressions,
      total_clicks: total.rows[0].clicks,
      total_viewable: total.rows[0].viewable_impressions,
    };
  });

  // Статистика по дням (для графиков)
  app.get('/stats/daily', async (req, _reply) => {
    const { days = '30', campaign_id, placement_id } = req.query as any;
    let sql = `SELECT date, SUM(impressions)::int AS impressions, SUM(clicks)::int AS clicks, SUM(viewable_impressions)::int AS viewable_impressions
               FROM daily_stats WHERE date >= CURRENT_DATE - $1::int`;
    const params: any[] = [parseInt(days, 10)];

    if (campaign_id) {
      params.push(parseInt(campaign_id, 10));
      sql += ` AND creative_id IN (SELECT id FROM creatives WHERE campaign_id = $${params.length})`;
    }
    if (placement_id) {
      params.push(parseInt(placement_id, 10));
      sql += ` AND placement_id = $${params.length}`;
    }

    sql += ' GROUP BY date ORDER BY date';
    return queryMany(sql, params);
  });

  // Флашим счётчики из Redis в PostgreSQL (вызывается по cron или вручную)
  app.post('/stats/flush', async (_req, _reply) => {
    const date = new Date().toISOString().slice(0, 10);
    const pattern = `stats:${date}:*`;
    const keys = await redis.keys(pattern);

    let flushed = 0;
    for (const key of keys) {
      const parts = key.split(':');
      const creativeId = parseInt(parts[2], 10);
      const placementId = parseInt(parts[3], 10);
      const data = await redis.hgetall(key);

      const impressions = parseInt(data.impressions || '0', 10);
      const clicks = parseInt(data.clicks || '0', 10);
      const viewable = parseInt(data.viewable || '0', 10);
      if (impressions || clicks || viewable) {
        await query(
          `INSERT INTO daily_stats (date, creative_id, placement_id, impressions, clicks, viewable_impressions)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (date, creative_id, placement_id)
           DO UPDATE SET impressions = daily_stats.impressions + $4,
                         clicks = daily_stats.clicks + $5,
                         viewable_impressions = daily_stats.viewable_impressions + $6`,
          [date, creativeId, placementId, impressions, clicks, viewable]
        );
        await redis.del(key);
        flushed++;
      }
    }

    return { flushed, date };
  });
}
