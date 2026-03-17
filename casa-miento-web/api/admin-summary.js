import pool, { ensureTables } from './db.js';

const withCors = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token');
};

const isAuthorized = (req) => {
  const token = process.env.ADMIN_TOKEN || 'admin:evelindamian';
  const incoming = req.headers['x-admin-token'];
  return incoming === token;
};

export default async function handler(req, res) {
  withCors(res);
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (!isAuthorized(req)) {
    res.status(401).json({ error: 'No autorizado' });
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  try {
    await ensureTables();
    const { rows } = await pool.query(
      'SELECT id, primary_first_name, primary_last_name, primary_menu, attending, email, extra_guests, created_at FROM rsvps ORDER BY created_at DESC;'
    );

    const yes = rows.filter((r) => r.attending).length;
    const no = rows.filter((r) => !r.attending).length;
    const people = rows.reduce((acc, r) => acc + 1 + (Array.isArray(r.extra_guests) ? r.extra_guests.length : 0), 0);

    res.status(200).json({ yes, no, people, rows });
  } catch (err) {
    console.error('Error resumen admin:', err);
    res.status(500).json({ error: 'No se pudo obtener el resumen' });
  }
}
