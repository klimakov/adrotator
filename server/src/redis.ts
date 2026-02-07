import Redis from 'ioredis';
import { config } from './config';

export const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    return Math.min(times * 200, 5000);
  },
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err.message);
});

// Инкремент счётчика показов с TTL 2 дня (для агрегации)
export async function incrImpression(creativeId: number, placementId: number): Promise<void> {
  const date = new Date().toISOString().slice(0, 10);
  const key = `stats:${date}:${creativeId}:${placementId}`;
  await redis.hincrby(key, 'impressions', 1);
  await redis.expire(key, 172800);
}

export async function incrClick(creativeId: number, placementId: number): Promise<void> {
  const date = new Date().toISOString().slice(0, 10);
  const key = `stats:${date}:${creativeId}:${placementId}`;
  await redis.hincrby(key, 'clicks', 1);
  await redis.expire(key, 172800);
}

/** Видимый показ (≥50% в viewport ≥1 сек, стандарт MRC) */
export async function incrViewable(creativeId: number, placementId: number): Promise<void> {
  const date = new Date().toISOString().slice(0, 10);
  const key = `stats:${date}:${creativeId}:${placementId}`;
  await redis.hincrby(key, 'viewable', 1);
  await redis.expire(key, 172800);
}
