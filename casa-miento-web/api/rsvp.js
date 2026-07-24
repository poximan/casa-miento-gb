import pool, { ensureTables } from '../server/db.js';
import { sendInviteEmail } from '../server/email.js';
import { isConfigError, sendSafeConfigError } from '../server/config.js';
import { logOperationalError, mapOperationalError } from '../server/operational-error.js';

const allowedMenus = new Set(['clasico', 'vegetariano', 'celiaco', 'infantil']);
const savedWithoutEmailResponse = {
  status: 502,
  code: 'RSVP_SAVED_EMAIL_FAILED',
  error: 'La respuesta se guardo, pero no se pudo enviar el email de confirmacion.',
  hint: 'No vuelvas a enviar el formulario. Revisa la configuracion de correo del backend.',
};

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

    const validateMenu = (value) => {
      const menu = (value || '').toString().trim().toLowerCase();
      if (!allowedMenus.has(menu)) {
        throw new Error('INVALID_MENU');
      }
      return menu;
    };

    const normalizedExtras = [];
    for (const guest of (extraGuests || []).slice(0, 12)) {
      const normalizedGuest = {
        firstName: (guest.firstName || '').trim(),
        lastName: (guest.lastName || '').trim(),
        menu: validateMenu(guest.menu),
      };
      if (normalizedGuest.firstName || normalizedGuest.lastName) {
        normalizedExtras.push(normalizedGuest);
      }
    }

    for (const guest of normalizedExtras) {
      if (!guest.firstName || !guest.lastName) {
        res.status(400).json({ error: 'Completa nombre y apellido de cada invitado extra.' });
        return;
      }
    }

    const primaryMenu = validateMenu(primaryGuest.menu);
    const cleanedEmail = (email || '').trim();
    const cleanedPhone = (phone || '').trim();

    if (!cleanedEmail) {
      res.status(400).json({ error: 'El email es obligatorio para enviar la confirmacion.' });
      return;
    }

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanedEmail)) {
      res.status(400).json({ error: 'Email invalido.' });
      return;
    }

    await ensureTables();

    try {
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
          cleanedEmail,
          cleanedPhone || null,
          JSON.stringify(normalizedExtras),
        ]
      );

      try {
        await sendInviteEmail({
          attending,
          email: cleanedEmail,
          phone: cleanedPhone || null,
          primaryGuest: { ...primaryGuest, menu: primaryMenu, firstName: primaryFirstName, lastName: primaryLastName },
          extraGuests: normalizedExtras,
        });
      } catch (emailError) {
        console.error('[rsvp] La respuesta se guardo pero fallo el email.', {
          code: emailError?.code || null,
          message: emailError?.message || null,
        });
        res.status(savedWithoutEmailResponse.status).json({
          ok: false,
          saved: true,
          id: result.rows[0].id,
          error: savedWithoutEmailResponse.error,
          code: savedWithoutEmailResponse.code,
          hint: savedWithoutEmailResponse.hint,
        });
        return;
      }

      res.status(200).json({ ok: true, id: result.rows[0].id });
    } catch (txError) {
      throw txError;
    }
  } catch (err) {
    if (err?.message === 'INVALID_MENU') {
      res.status(400).json({ error: 'El menu enviado no es valido.' });
      return;
    }
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
