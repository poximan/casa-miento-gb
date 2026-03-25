import { extractBearerToken, verifyOrganizerToken, UnauthorizedError } from '../server/admin-auth.js';
import { isConfigError, sendSafeConfigError } from '../server/config.js';
import { parseJsonBody, withCors } from '../server/http.js';
import { logOperationalError, mapOperationalError } from '../server/operational-error.js';
import { publishCarouselPhotos, readCarouselPublications } from '../server/services/carousel-service.js';

export default async function handler(req, res) {
  withCors(res, 'GET, POST, OPTIONS');
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
      res.status(200).json({ publications: await readCarouselPublications() });
      return;
    }

    if (req.method === 'POST') {
      const body = await parseJsonBody(req);
      const photos = Array.isArray(body.photos)
        ? body.photos
            .map((photo) => (typeof photo === 'string' ? photo.trim() : ''))
            .filter(Boolean)
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

      await publishCarouselPhotos(photos);
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
