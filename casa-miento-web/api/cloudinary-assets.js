import 'dotenv/config';
import { extractBearerToken, verifyAdminToken, UnauthorizedError } from './admin-auth.js';
import { isConfigError, sendSafeConfigError } from './config.js';

const {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  CLOUDINARY_FOLDER,
} = process.env;

const logConfigSnapshot = (context) => {
  console.info('[cloudinary-assets]', context, {
    cloudName: CLOUDINARY_CLOUD_NAME || '(empty)',
    hasPreset: Boolean(process.env.CLOUDINARY_UPLOAD_PRESET),
    hasApiKey: Boolean(CLOUDINARY_API_KEY),
    hasApiSecret: Boolean(CLOUDINARY_API_SECRET),
    folder: CLOUDINARY_FOLDER || '(none)',
  });
};

const withCors = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

const requireConfig = () => {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error('CLOUDINARY_CONFIG_MISSING');
  }
};

const requestCloudinary = async (url, options = {}) => {
  const auth = Buffer.from(`${CLOUDINARY_API_KEY}:${CLOUDINARY_API_SECRET}`).toString('base64');
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Basic ${auth}`,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Cloudinary HTTP ${res.status} | ${text.slice(0, 200)}`);
  }
  return res.json();
};

export const listAssets = async () => {
  requireConfig();
  const folder = CLOUDINARY_FOLDER || '';
  const searchUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/resources/search`;

  const payload = {
    expression: `resource_type:image AND folder:${folder}`,
    max_results: 100,
    sort_by: [{ public_id: 'desc' }],
  };

  const res = await fetch(searchUrl, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${CLOUDINARY_API_KEY}:${CLOUDINARY_API_SECRET}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Cloudinary search HTTP ${res.status} | ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const resources = Array.isArray(data.resources) ? data.resources : [];

  return resources.map((r) => ({
    publicId: r.public_id,
    url: r.secure_url || r.url,
  }));
};

const deleteAssets = async (publicIds) => {
  requireConfig();
  const params = publicIds.map((id) => `public_ids[]=${encodeURIComponent(id)}`).join('&');
  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/resources/image/upload?${params}`;
  await requestCloudinary(url, { method: 'DELETE' });
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
      logConfigSnapshot('GET');
      const assets = await listAssets();
      res.status(200).json({
        assets,
        cloudName: CLOUDINARY_CLOUD_NAME || '',
        uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET || '',
      });
      return;
    }

    if (req.method === 'DELETE') {
      logConfigSnapshot('DELETE');
      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', async () => {
        try {
          const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
          const ids = Array.isArray(body.publicIds)
            ? body.publicIds.map((p) => (typeof p === 'string' ? p.trim() : '')).filter(Boolean)
            : [];
          if (!ids.length) {
            res.status(400).json({ error: 'Envía publicIds para borrar.' });
            return;
          }
          await deleteAssets(ids);
          res.status(200).json({ ok: true, deleted: ids.length });
        } catch (err) {
          res.status(400).json({ error: err.message || 'Solicitud inválida' });
        }
      });
      return;
    }

    res.status(405).json({ error: 'Metodo no permitido' });
  } catch (err) {
    if (err.message === 'CLOUDINARY_CONFIG_MISSING') {
      res.status(500).json({ error: 'Config de Cloudinary incompleta.' });
      return;
    }
    if (isConfigError(err)) {
      sendSafeConfigError(res);
      return;
    }
    if (err instanceof UnauthorizedError) {
      res.status(401).json({ error: err.message, code: err.code });
      return;
    }
    res.status(500).json({ error: err.message || 'Error interno' });
  }
}
