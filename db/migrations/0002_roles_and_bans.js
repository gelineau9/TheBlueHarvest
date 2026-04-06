/**
 * 0002_roles_and_bans.js
 *
 * Adds ban-tracking columns to accounts so the application can suspend
 * accounts and record the reason, and prepares the role infrastructure
 * for JWT-embedded role checks.
 *
 * Down migration is intentionally omitted — removing these columns on a
 * live database must be done manually after verifying no data is lost.
 */

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE accounts ADD COLUMN is_banned BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE accounts ADD COLUMN banned_reason TEXT DEFAULT NULL;
  `);
};
