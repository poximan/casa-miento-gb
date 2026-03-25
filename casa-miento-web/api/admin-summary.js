import { extractBearerToken, verifyOrganizerToken, UnauthorizedError } from '../server/admin-auth.js';
import { isConfigError, sendSafeConfigError } from '../server/config.js';
import { withCors } from '../server/http.js';
import { logOperationalError, mapOperationalError } from '../server/operational-error.js';
import { readAdminSummary } from '../server/services/admin-summary-service.js';

export default async function handler(req, res) {
  withCors(res, 'GET, OPTIONS');
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

    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Metodo no permitido' });
      return;
    }

    res.status(200).json(await readAdminSummary());
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
    logOperationalError('admin-summary', err, mapped);
    res.status(mapped.status).json({
      error: mapped.error,
      code: mapped.code,
      hint: mapped.hint,
    });
  }
}
