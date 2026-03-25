import pool, { ensurePhotosTable } from '../db.js';
import { listAssets } from './cloudinary-service.js';

const cleanMissingCloudinary = async (rows) => {
  const assets = await listAssets();
  const assetUrlSet = new Set(assets.map((asset) => (asset.url || '').trim()).filter(Boolean));

  const updates = [];
  const cleanedRows = rows.map((row) => {
    const urls = Array.isArray(row.urls) ? row.urls : [];
    const filtered = urls.filter((url) => assetUrlSet.has((url || '').trim()));
    if (filtered.length !== urls.length) {
      updates.push(pool.query('UPDATE carousel_photos SET urls = $1 WHERE id = $2', [filtered, row.id]));
    }
    return { ...row, urls: filtered };
  });

  if (updates.length) {
    await Promise.all(updates);
  }

  return cleanedRows;
};

export const readCarouselPublications = async () => {
  await ensurePhotosTable();
  const { rows } = await pool.query('SELECT id, urls, created_at FROM carousel_photos ORDER BY created_at DESC');
  const cleanedRows = await cleanMissingCloudinary(rows);
  return cleanedRows.map((row) => ({
    id: row.id,
    urls: Array.isArray(row.urls) ? row.urls : [],
    createdAt: row.created_at,
  }));
};

export const readPublishedPhotoUrls = async () => {
  const publications = await readCarouselPublications();
  const aggregated = publications.flatMap((publication) => publication.urls || []);
  return Array.from(new Set(aggregated.map((url) => (url || '').trim()).filter(Boolean)));
};

export const publishCarouselPhotos = async (urls) => {
  await ensurePhotosTable();
  await pool.query('INSERT INTO carousel_photos (urls) VALUES ($1)', [urls]);
};
