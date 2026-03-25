import pool, { ensurePhotosTable } from '../server/db.js';
import { isConfigError, sendSafeConfigError } from '../server/config.js';
import { logOperationalError, mapOperationalError } from '../server/operational-error.js';
import { listAssets } from './cloudinary-assets.js';

const withCors = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

const cleanMissingCloudinary = async (rows) => {
  const assets = await listAssets();
  const assetUrlSet = new Set(assets.map((a) => (a.url || '').trim()).filter(Boolean));

  // Si Cloudinary no devolvio nada, evitamos vaciar la base por un fallo externo.
  if (!assetUrlSet.size) return rows;

  const updates = [];
  const cleanedRows = rows.map((row) => {
    const urls = Array.isArray(row.urls) ? row.urls : [];
    const filtered = urls.filter((u) => assetUrlSet.has((u || '').trim()));
    if (filtered.length !== urls.length) {
      updates.push(pool.query('UPDATE carousel_photos SET urls = $1 WHERE id = $2', [filtered, row.id]));
    }
    return { ...row, urls: filtered };
  });

  if (updates.length) {
    await Promise.allSettled(updates);
  }

  return cleanedRows;
};

const readAllPhotos = async () => {
  await ensurePhotosTable();
  const { rows } = await pool.query('SELECT id, urls FROM carousel_photos ORDER BY created_at DESC');
  const cleaned = await cleanMissingCloudinary(rows);

  const aggregated = cleaned.reduce((acc, row) => {
    if (Array.isArray(row.urls)) {
      row.urls.forEach((u) => {
        if (typeof u === 'string' && u.trim()) acc.push(u.trim());
      });
    }
    return acc;
  }, []);
  return Array.from(new Set(aggregated));
};

export default async function handler(req, res) {
  withCors(res);
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Metodo no permitido' });
    return;
  }

  try {
    const photos = await readAllPhotos();
    res.status(200).json({ photos });
  } catch (err) {
    if (isConfigError(err)) {
      sendSafeConfigError(res);
      return;
    }
    const mapped = mapOperationalError(err);
    logOperationalError('photos', err, mapped);
    res.status(mapped.status).json({
      error: mapped.error,
      code: mapped.code,
      hint: mapped.hint,
    });
  }
}
