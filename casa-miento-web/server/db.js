import 'dotenv/config';
import { Pool } from 'pg';
import { requiredBooleanEnv, requiredEnv } from './config.js';

const pool = new Pool({
  connectionString: requiredEnv('DB_URL'),
  ssl: { rejectUnauthorized: requiredBooleanEnv('DB_SSL_REJECT_UNAUTHORIZED') },
});

export class DatabaseSchemaError extends Error {
  constructor(tableName, expectedColumns, actualColumns) {
    super(`Schema mismatch for table ${tableName}`);
    this.name = 'DatabaseSchemaError';
    this.code = 'DB_SCHEMA_MISMATCH';
    this.tableName = tableName;
    this.expectedColumns = expectedColumns;
    this.actualColumns = actualColumns;
  }
}

const readTableColumns = async (tableName) => {
  const { rows } = await pool.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position;
    `,
    [tableName]
  );

  return rows.map((row) => row.column_name);
};

const ensureExactSchema = async (tableName, createSql, expectedColumns) => {
  const existingColumns = await readTableColumns(tableName);

  if (!existingColumns.length) {
    await pool.query(createSql);
  }

  const actualColumns = await readTableColumns(tableName);
  const expectedSignature = expectedColumns.join('|');
  const actualSignature = actualColumns.join('|');

  if (expectedSignature !== actualSignature) {
    throw new DatabaseSchemaError(tableName, expectedColumns, actualColumns);
  }
};

export const ensureTables = async () => {
  await ensureExactSchema(
    'rsvps',
    `
      CREATE TABLE rsvps (
        id SERIAL PRIMARY KEY,
        primary_first_name TEXT NOT NULL,
        primary_last_name TEXT NOT NULL,
        primary_menu TEXT NOT NULL,
        attending BOOLEAN NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        extra_guests JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `,
    ['id', 'primary_first_name', 'primary_last_name', 'primary_menu', 'attending', 'email', 'phone', 'extra_guests', 'created_at']
  );
};

export const ensurePhotosTable = async () => {
  await ensureExactSchema(
    'carousel_photos',
    `
      CREATE TABLE carousel_photos (
        id SERIAL PRIMARY KEY,
        urls TEXT[] NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `,
    ['id', 'urls', 'created_at']
  );
};

export default pool;
