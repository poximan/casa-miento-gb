import pool, { ensureTables } from './db.js';
import { sendInviteEmail } from './email.js';
import { isConfigError, sendSafeConfigError } from './config.js';
import { logOperationalError, mapOperationalError } from './operational-error.js';

const allowedMenus = new Set(['clasico', 'vegetariano', 'celiaco', 'infantil']);

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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

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
    const body = await parseBody(req);
    const { attending, primaryGuest, email, phone, extraGuests = [] } = body || {};

    if (typeof attending !== 'boolean' || !primaryGuest?.firstName || !primaryGuest?.lastName) {
      res.status(400).json({ error: 'Faltan datos obligatorios.' });
      return;
    }

    const primaryFirstName = (primaryGuest.firstName || '').trim();
    const primaryLastName = (primaryGuest.lastName || '').trim();
    if (!primaryFirstName || !primaryLastName) {
      res.status(400).json({ error: 'Nombre y apellido son obligatorios.' });
      return;
    }

    const normalizeMenu = (value) => {
      const menu = (value || '').toString().trim().toLowerCase();
      return allowedMenus.has(menu) ? menu : 'clasico';
    };

    const normalizedExtras = (extraGuests || [])
      .slice(0, 12)
      .map((g) => ({
        firstName: (g.firstName || '').trim(),
        lastName: (g.lastName || '').trim(),
        menu: normalizeMenu(g.menu),
      }))
      .filter((g) => g.firstName || g.lastName);

    for (const guest of normalizedExtras) {
      if (!guest.firstName || !guest.lastName) {
        res.status(400).json({ error: 'Completa nombre y apellido de cada invitado extra.' });
        return;
      }
    }

    const primaryMenu = normalizeMenu(primaryGuest.menu);
    const cleanedEmail = (email || '').trim();
    const cleanedPhone = (phone || '').trim();

    if (cleanedEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanedEmail)) {
      res.status(400).json({ error: 'Email invalido.' });
      return;
    }

    await ensureTables();

    const result = await pool.query(
      `
      INSERT INTO rsvps (primary_first_name, primary_last_name, primary_menu, attending, email, phone, extra_guests)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `,
      [
        primaryFirstName,
        primaryLastName,
        primaryMenu,
        attending,
        cleanedEmail || null,
        cleanedPhone || null,
        JSON.stringify(normalizedExtras),
      ]
    );

    await sendInviteEmail({
      attending,
      email: cleanedEmail || null,
      phone: cleanedPhone || null,
      primaryGuest: { ...primaryGuest, menu: primaryMenu, firstName: primaryFirstName, lastName: primaryLastName },
      extraGuests: normalizedExtras,
    });

    res.status(200).json({ ok: true, id: result.rows[0].id });
  } catch (err) {
    if (isConfigError(err)) {
      sendSafeConfigError(res);
      return;
    }
    const mapped = mapOperationalError(err);
    logOperationalError('rsvp', err, mapped);
    res.status(mapped.status).json({
      error: mapped.error,
      code: mapped.code,
      hint: mapped.hint,
    });
  }
}
