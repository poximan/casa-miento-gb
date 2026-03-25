import pool, { ensureTables } from '../db.js';

export const readAdminSummary = async () => {
  await ensureTables();

  const { rows } = await pool.query(
    'SELECT id, primary_first_name, primary_last_name, primary_menu, attending, email, phone, extra_guests, created_at FROM rsvps ORDER BY created_at DESC;'
  );

  return {
    yes: rows.filter((row) => row.attending).length,
    no: rows.filter((row) => !row.attending).length,
    people: rows.reduce((acc, row) => acc + 1 + (Array.isArray(row.extra_guests) ? row.extra_guests.length : 0), 0),
    rows,
  };
};
