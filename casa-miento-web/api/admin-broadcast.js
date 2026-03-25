import { extractBearerToken, verifyOrganizerToken, UnauthorizedError } from '../server/admin-auth.js';
import { isConfigError, sendSafeConfigError } from '../server/config.js';
import { parseJsonBody, withCors } from '../server/http.js';
import { logOperationalError, mapOperationalError } from '../server/operational-error.js';
import { allowedBroadcastFilters, sendBroadcast } from '../server/services/admin-broadcast-service.js';

export default async function handler(req, res) {
  withCors(res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Metodo no permitido' });
    return;
  }

  try {
    const token = extractBearerToken(req);
    if (!token) {
      res.status(401).json({ error: 'No autorizado', code: 'UNAUTHORIZED' });
      return;
    }
    verifyOrganizerToken(token);

    const body = await parseJsonBody(req);
    const filter = (body.filter || '').toLowerCase();
    const subject = (body.subject || '').trim();
    const message = (body.message || '').trim();

    if (!allowedBroadcastFilters.includes(filter)) {
      res.status(400).json({ error: 'Filtro invalido. Usa yes, no o all.' });
      return;
    }
    if (!subject || !message) {
      res.status(400).json({ error: 'Asunto y cuerpo son obligatorios.' });
      return;
    }

    const sent = await sendBroadcast({ filter, subject, message });
    res.status(200).json({ sent });
  } catch (err) {
    if (isConfigError(err)) {
      sendSafeConfigError(res);
      return;
    }
    if (err instanceof UnauthorizedError) {
      res.status(401).json({ error: err.message, code: err.code });
      return;
    }
    if (err.message === 'No hay destinatarios para el filtro seleccionado.') {
      res.status(400).json({ error: err.message });
      return;
    }
    if (err.responseCode || err.code === 'EAUTH') {
      res.status(502).json({ error: 'No se pudo enviar los correos.', hint: err.message });
      return;
    }
    const mapped = mapOperationalError(err);
    logOperationalError('admin-broadcast', err, mapped);
    res.status(mapped.status).json({
      error: mapped.error,
      code: mapped.code,
      hint: mapped.hint,
    });
  }
}
