import pool, { ensureTables } from '../server/db.js';
import { extractBearerToken, verifyAdminToken, UnauthorizedError } from '../server/admin-auth.js';
import { isConfigError, sendSafeConfigError } from '../server/config.js';
import { logOperationalError, mapOperationalError } from '../server/operational-error.js';

const withCors = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
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

    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Metodo no permitido' });
      return;
    }

    await ensureTables();
    const { rows } = await pool.query(
      'SELECT id, primary_first_name, primary_last_name, primary_menu, attending, email, extra_guests, created_at FROM rsvps ORDER BY created_at DESC;'
    );

    const yes = rows.filter((r) => r.attending).length;
    const no = rows.filter((r) => !r.attending).length;
    const people = rows.reduce((acc, r) => acc + 1 + (Array.isArray(r.extra_guests) ? r.extra_guests.length : 0), 0);

    res.status(200).json({ yes, no, people, rows });
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
