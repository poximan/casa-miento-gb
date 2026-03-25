import pool, { ensureTables } from '../server/db.js';
import { extractBearerToken, verifyAdminToken, UnauthorizedError } from '../server/admin-auth.js';
import { buildTransport, fromAddress } from '../server/mailer.js';
import { isConfigError, sendSafeConfigError } from '../server/config.js';
import { logOperationalError, mapOperationalError } from '../server/operational-error.js';

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

const withCors = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

const allowedFilters = ['yes', 'no', 'all'];

export default async function handler(req, res) {
  withCors(res);
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
    verifyAdminToken(token);

    const body = await parseBody(req);
    const filter = (body.filter || '').toLowerCase();
    const subject = (body.subject || '').trim();
    const message = (body.message || '').trim();

    if (!allowedFilters.includes(filter)) {
      res.status(400).json({ error: 'Filtro invalido. Usa yes, no o all.' });
      return;
    }
    if (!subject || !message) {
      res.status(400).json({ error: 'Asunto y cuerpo son obligatorios.' });
      return;
    }

    await ensureTables();
    const { rows } = await pool.query(
      'SELECT attending, email FROM rsvps WHERE email IS NOT NULL AND email <> \'\''
    );

    const recipients = rows
      .filter((r) => {
        if (filter === 'all') return true;
        if (filter === 'yes') return r.attending === true;
        if (filter === 'no') return r.attending === false;
        return false;
      })
      .map((r) => (r.email || '').trim())
      .filter((email) => email);

    const uniqueRecipients = Array.from(new Set(recipients.map((e) => e.toLowerCase())));

    if (!uniqueRecipients.length) {
      res.status(400).json({ error: 'No hay destinatarios para el filtro seleccionado.' });
      return;
    }

    const transporter = buildTransport();
    const from = fromAddress();

    for (const to of uniqueRecipients) {
      // envio secuencial para simplificar y evitar limites de conexion
      await transporter.sendMail({
        from,
        to,
        subject,
        text: message,
      });
    }

    res.status(200).json({ sent: uniqueRecipients.length });
  } catch (err) {
    if (isConfigError(err)) {
      sendSafeConfigError(res);
      return;
    }
    if (err instanceof UnauthorizedError) {
      res.status(401).json({ error: err.message, code: err.code });
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
