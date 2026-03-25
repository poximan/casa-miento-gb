import pool, { ensureTables } from '../db.js';
import { buildTransport, fromAddress } from '../mailer.js';

export const allowedBroadcastFilters = ['yes', 'no', 'all'];

export const sendBroadcast = async ({ filter, subject, message }) => {
  await ensureTables();

  const { rows } = await pool.query(
    'SELECT attending, email FROM rsvps WHERE email IS NOT NULL AND email <> \'\''
  );

  const recipients = rows
    .filter((row) => {
      if (filter === 'all') return true;
      if (filter === 'yes') return row.attending === true;
      if (filter === 'no') return row.attending === false;
      return false;
    })
    .map((row) => (row.email || '').trim().toLowerCase())
    .filter(Boolean);

  const uniqueRecipients = Array.from(new Set(recipients));
  if (!uniqueRecipients.length) {
    throw new Error('No hay destinatarios para el filtro seleccionado.');
  }

  const transporter = buildTransport();
  const from = fromAddress();

  for (const recipient of uniqueRecipients) {
    await transporter.sendMail({
      from,
      to: recipient,
      subject,
      text: message,
    });
  }

  return uniqueRecipients.length;
};
