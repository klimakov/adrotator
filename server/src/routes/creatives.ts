import { FastifyInstance } from 'fastify';
import { queryMany, queryOne, query } from '../db';
import { config } from '../config';
import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';

export async function creativeRoutes(app: FastifyInstance) {
  // Список креативов (опционально фильтр по campaign_id)
  app.get('/creatives', async (req, _reply) => {
    const { campaign_id } = req.query as { campaign_id?: string };
    if (campaign_id) {
      return queryMany(
        `SELECT cr.*, c.name AS campaign_name
         FROM creatives cr JOIN campaigns c ON c.id = cr.campaign_id
         WHERE cr.campaign_id = $1 ORDER BY cr.created_at DESC`,
        [campaign_id]
      );
    }
    return queryMany(
      `SELECT cr.*, c.name AS campaign_name
       FROM creatives cr JOIN campaigns c ON c.id = cr.campaign_id
       ORDER BY cr.created_at DESC`
    );
  });

  // Один креатив
  app.get('/creatives/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = await queryOne(
      `SELECT cr.*, c.name AS campaign_name
       FROM creatives cr JOIN campaigns c ON c.id = cr.campaign_id
       WHERE cr.id = $1`,
      [id]
    );
    if (!row) return reply.code(404).send({ error: 'Creative not found' });
    return row;
  });

  // Создать креатив
  app.post('/creatives', async (req, reply) => {
    const { campaign_id, name, type, width, height, image_url, click_url, html_content, weight, status } = req.body as any;
    const row = await queryOne(
      `INSERT INTO creatives (campaign_id, name, type, width, height, image_url, click_url, html_content, weight, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [campaign_id, name, type || 'image', width || 300, height || 250, image_url, click_url, html_content, weight || 1, status || 'active']
    );
    return reply.code(201).send(row);
  });

  const ALLOWED_IMAGE_EXT = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
  app.post('/creatives/upload', async (req, reply) => {
    const data = await req.file();
    if (!data) return reply.code(400).send({ error: 'No file uploaded' });

    const rawExt = path.extname(data.filename).toLowerCase();
    const ext = ALLOWED_IMAGE_EXT.includes(rawExt) ? rawExt : '.png';
    const filename = `${uuid()}${ext}`;
    const uploadDir = config.uploadDir;

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, filename);
    const writeStream = fs.createWriteStream(filePath);
    await data.file.pipe(writeStream);

    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    return { url: `/uploads/${filename}` };
  });

  // Обновить креатив
  app.put('/creatives/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { campaign_id, name, type, width, height, image_url, click_url, html_content, weight, status } = req.body as any;
    const row = await queryOne(
      `UPDATE creatives SET campaign_id=$1, name=$2, type=$3, width=$4, height=$5,
       image_url=$6, click_url=$7, html_content=$8, weight=$9, status=$10, updated_at=NOW()
       WHERE id=$11 RETURNING *`,
      [campaign_id, name, type, width, height, image_url, click_url, html_content, weight, status, id]
    );
    if (!row) return reply.code(404).send({ error: 'Creative not found' });
    return row;
  });

  // Удалить креатив
  app.delete('/creatives/:id', async (req, _reply) => {
    const { id } = req.params as { id: string };
    await query('DELETE FROM creatives WHERE id = $1', [id]);
    return { ok: true };
  });
}
