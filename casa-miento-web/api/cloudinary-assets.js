import 'dotenv/config';
import { extractBearerToken, verifyOrganizerToken, UnauthorizedError } from '../server/admin-auth.js';
import { isConfigError, requiredEnv, sendSafeConfigError } from '../server/config.js';
import { parseJsonBody, withCors } from '../server/http.js';
import { deleteAssets, listAssets, uploadAsset } from '../server/services/cloudinary-service.js';

const cloudinaryCloudName = () => requiredEnv('CLOUDINARY_CLOUD_NAME');

export default async function handler(req, res) {
  withCors(res, 'GET, POST, DELETE, OPTIONS');
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
    verifyOrganizerToken(token);

    if (req.method === 'GET') {
      const assets = await listAssets();
      res.status(200).json({
        assets,
        cloudName: cloudinaryCloudName(),
      });
      return;
    }

    if (req.method === 'POST') {
      const body = await parseJsonBody(req);
      const fileName = (body.fileName || '').trim();
      const mimeType = (body.mimeType || '').trim();
      const base64Data = (body.base64Data || '').trim();

      if (!mimeType || !base64Data) {
        res.status(400).json({ error: 'Envia mimeType y base64Data para subir la imagen.' });
        return;
      }

      res.status(200).json({
        asset: await uploadAsset({ fileName, mimeType, base64Data }),
      });
      return;
    }

    if (req.method === 'DELETE') {
      const body = await parseJsonBody(req);
      const ids = Array.isArray(body.publicIds)
        ? body.publicIds.map((value) => (typeof value === 'string' ? value.trim() : '')).filter(Boolean)
        : [];

      if (!ids.length) {
        res.status(400).json({ error: 'Envia publicIds para borrar.' });
        return;
      }

      await deleteAssets(ids);
      res.status(200).json({ ok: true, deleted: ids.length });
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
    res.status(500).json({ error: err.message || 'Error interno' });
  }
}
