import { isConfigError, sendSafeConfigError } from '../server/config.js';
import { withCors } from '../server/http.js';
import { logOperationalError, mapOperationalError } from '../server/operational-error.js';
import { readPublishedPhotoUrls } from '../server/services/carousel-service.js';

export default async function handler(req, res) {
  withCors(res, 'GET, OPTIONS', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Metodo no permitido' });
    return;
  }

  try {
    res.status(200).json({ photos: await readPublishedPhotoUrls() });
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
