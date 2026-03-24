import { createPool, DatabasePool, sql } from 'slonik';
import { createPgDriverFactory } from '@slonik/pg-driver';

const { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME } = process.env;

// Guard: env validation also runs in index.ts before this module is imported,
// but we repeat it here so tests that import database.ts directly also fail fast.
if (!DB_USER || !DB_PASSWORD || !DB_HOST || !DB_PORT || !DB_NAME) {
  console.error(
    'FATAL: Missing required database environment variables (DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME)',
  );
  process.exit(1);
}

// encodeURIComponent handles special characters in passwords
// sslmode=no-verify encrypts traffic but skips cert validation (required for Supabase pooler)
const connectionString = `postgres://${encodeURIComponent(DB_USER)}:${encodeURIComponent(DB_PASSWORD)}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=no-verify`;

const pool = createPool(connectionString, {
  driverFactory: createPgDriverFactory(),
});

/**
 * Get the resolved database pool instance.
 * Use this in route handlers instead of awaiting the pool directly.
 */
export async function getPool(): Promise<DatabasePool> {
  return await pool;
}

/**
 * Verify the database is reachable with a lightweight query.
 * Call this during startup before binding the HTTP server.
 * Throws if the database cannot be reached.
 */
export async function testConnection(): Promise<void> {
  const db = await getPool();
  await db.connect(async (conn) => {
    await conn.query(sql.unsafe`SELECT 1`);
  });
}

export default pool;
