import pool, { ensurePhotosTable } from './db.js';
import { extractBearerToken, verifyAdminToken, UnauthorizedError } from './admin-auth.js';
import { isConfigError, sendSafeConfigError } from './config.js';
import { logOperationalError, mapOperationalError } from './operational-error.js';
import { listAssets } from './cloudinary-assets.js';

const withCors = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

const parseBody = async (req) => {
  if (req.body) return req.body;
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        reject(err);
      }
    });
  });
};

const cleanMissingCloudinary = async (rows) => {
  const assets = await listAssets();
  const assetUrlSet = new Set(assets.map((a) => (a.url || '').trim()).filter(Boolean));

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

const readPublications = async () => {
  await ensurePhotosTable();
  const { rows } = await pool.query('SELECT id, urls, created_at FROM carousel_photos ORDER BY created_at DESC');
  const cleaned = await cleanMissingCloudinary(rows);
  return cleaned.map((row) => ({
    id: row.id,
    urls: Array.isArray(row.urls) ? row.urls : [],
    createdAt: row.created_at,
  }));
};

const writePhotos = async (urls) => {
  await ensurePhotosTable();
  await pool.query('INSERT INTO carousel_photos (urls) VALUES ($1)', [urls]);
};

export default async function handler(req, res) {
  withCors(res);
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const token = extractBearerToken(req);
    if (!token) {
      res.status(401).json({ error: 'No autorizado', code: 'UNAUTHORIZED' });
      return;
    }
    verifyAdminToken(token);

    if (req.method === 'GET') {
      const publications = await readPublications();
      res.status(200).json({ publications });
      return;
    }

    if (req.method === 'POST') {
      const body = await parseBody(req);
      const photos = Array.isArray(body.photos)
        ? body.photos
            .map((p) => (typeof p === 'string' ? p.trim() : ''))
            .filter((p) => p)
            .slice(0, 8)
        : [];
      if (!photos.length) {
        res.status(400).json({ error: 'Envia un arreglo de URLs de fotos.' });
        return;
      }
      if (photos.length > 8) {
        res.status(400).json({ error: 'Maximo 8 fotos por publicacion.' });
        return;
      }
      await writePhotos(photos);
      res.status(200).json({ ok: true, count: photos.length });
      return;
    }

    res.status(405).json({ error: 'Metodo no permitido' });
  } catch (err) {
    if (isConfigError(err)) {
      sendSafeConfigError(res);
      return;
    }
    if (err instanceof UnauthorizedError) {
      res.status(401).json({ error: err.message, code: err.code });
      return;
    }
    const mapped = mapOperationalError(err);
    logOperationalError('admin-photos', err, mapped);
    res.status(mapped.status).json({
      error: mapped.error,
      code: mapped.code,
      hint: mapped.hint,
    });
  }
}
