/**
 * 0010_backfill_email_verified_at.js
 *
 * Backfills email_verified_at for all accounts that existed before migration
 * 0008 introduced email verification. Those accounts signed up without a
 * verification requirement, so we treat them as implicitly verified by setting
 * email_verified_at to their account creation time (or NOW() if created_at is
 * unavailable).
 */

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export const up = (pgm) => {
  pgm.sql(`
    UPDATE accounts
    SET email_verified_at = COALESCE(created_at, NOW())
    WHERE email_verified_at IS NULL;
  `);
};

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export const down = (_pgm) => {
  // Intentionally a no-op — we cannot safely un-verify accounts that were
  // backfilled without knowing which were genuinely verified vs backfilled.
};
