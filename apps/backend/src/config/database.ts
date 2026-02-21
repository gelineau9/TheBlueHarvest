import { createPool, DatabasePool } from 'slonik';

const { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME } = process.env;

const pool = createPool(`postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`);

/**
 * Get the database pool instance.
 * Use this instead of awaiting the pool directly in route handlers.
 */
export async function getPool(): Promise<DatabasePool> {
  return await pool;
}

export default pool;
