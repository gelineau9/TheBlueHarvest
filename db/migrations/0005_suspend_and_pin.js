/**
 * 0005_suspend_and_pin.js
 *
 * Adds two capabilities:
 *
 *  1. Time-limited account suspension — accounts.suspended_until (TIMESTAMPTZ)
 *     NULL means not suspended. A non-null value means suspended until that UTC
 *     timestamp; the application treats the account as suspended if
 *     suspended_until IS NOT NULL AND suspended_until > NOW().
 *
 *  2. Sitewide post pinning — posts.is_pinned (BOOLEAN)
 *     Pinned posts can be surfaced at the top of listings by the frontend.
 *     Only admins/mods should be able to set this via the admin router.
 */

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE accounts ADD COLUMN suspended_until TIMESTAMPTZ DEFAULT NULL;
    ALTER TABLE posts    ADD COLUMN is_pinned BOOLEAN NOT NULL DEFAULT FALSE;
    CREATE INDEX IF NOT EXISTS idx_posts_is_pinned ON posts(is_pinned) WHERE is_pinned = TRUE;
  `);
};
