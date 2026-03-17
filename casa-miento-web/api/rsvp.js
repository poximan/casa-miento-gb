import pool, { ensureTables } from './db.js';
import { sendInviteEmail } from './email.js';

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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token');
};

export default async function handler(req, res) {
  withCors(res);
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  try {
    const body = await parseBody(req);
    const { attending, primaryGuest, email, phone, extraGuests = [] } = body || {};

    if (typeof attending !== 'boolean' || !primaryGuest?.firstName || !primaryGuest?.lastName) {
      res.status(400).json({ error: 'Faltan datos obligatorios.' });
      return;
    }

    const normalizedExtras = (extraGuests || []).map((g) => ({
      firstName: (g.firstName || '').trim(),
      lastName: (g.lastName || '').trim(),
      menu: g.menu || 'clasico',
    }));
    const primaryMenu = primaryGuest.menu || 'clasico';

    await ensureTables();

    const result = await pool.query(
      `
      INSERT INTO rsvps (primary_first_name, primary_last_name, primary_menu, attending, email, phone, extra_guests)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `,
      [
        primaryGuest.firstName.trim(),
        primaryGuest.lastName.trim(),
        primaryMenu,
        attending,
        email || null,
        phone || null,
        JSON.stringify(normalizedExtras),
      ]
    );

    await sendInviteEmail({
      attending,
      email: email || null,
      phone: phone || null,
      primaryGuest: { ...primaryGuest, menu: primaryMenu },
      extraGuests: normalizedExtras,
    });

    res.status(200).json({ ok: true, id: result.rows[0].id });
  } catch (err) {
    console.error('Error en rsvp:', err);
    res.status(500).json({ error: 'No pudimos guardar tu respuesta.' });
  }
}
