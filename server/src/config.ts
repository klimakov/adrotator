export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  databaseUrl: process.env.DATABASE_URL || 'postgres://adrotator:secret@localhost:5432/adrotator',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  nodeEnv: process.env.NODE_ENV || 'development',
  /** Если задан — для /campaigns, /creatives, /placements, /stats требуется заголовок X-API-Key */
  apiKey: process.env.API_KEY || '',
};
