import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export const ensureTables = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rsvps (
      id SERIAL PRIMARY KEY,
      primary_first_name TEXT NOT NULL,
      primary_last_name TEXT NOT NULL,
      primary_menu TEXT DEFAULT 'clasico',
      attending BOOLEAN NOT NULL,
      email TEXT,
      phone TEXT,
      extra_guests JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await pool.query(`ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS primary_menu TEXT DEFAULT 'clasico';`);
};

export default pool;
