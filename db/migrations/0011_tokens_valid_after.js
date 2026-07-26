/**
 * 0011_tokens_valid_after.js
 *
 * Adds accounts.tokens_valid_after. When set, any JWT issued (iat) before
 * this timestamp is rejected by the auth middleware. Password reset sets it
 * to NOW() so a reset invalidates every outstanding session.
 */

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export const up = (pgm) => {
  pgm.sql(`ALTER TABLE accounts ADD COLUMN tokens_valid_after TIMESTAMPTZ;`);
};

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export const down = (pgm) => {
  pgm.sql(`ALTER TABLE accounts DROP COLUMN IF EXISTS tokens_valid_after;`);
};
