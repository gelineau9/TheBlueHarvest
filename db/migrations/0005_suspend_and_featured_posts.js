/**
 * 0005_suspend_and_featured_posts.js
 *
 * Adds two capabilities:
 *
 *  1. Time-limited account suspension — accounts.suspended_until (TIMESTAMPTZ)
 *     NULL means not suspended. A non-null value means suspended until that UTC
 *     timestamp; the application treats the account as suspended if
 *     suspended_until IS NOT NULL AND suspended_until > NOW().
 *
 *  2. Sitewide featured posts — featured_posts table
 *     Admins/mods can feature specific posts for display in the homepage
 *     carousel or any other sitewide spotlight. Only one row per post
 *     (unique constraint on post_id). Removing a feature = hard delete of
 *     the row (no soft-delete needed — there is no audit trail value in
 *     keeping unfeatured rows around).
 *     An optional display_order column allows manual ordering of the carousel.
 */

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE accounts ADD COLUMN suspended_until TIMESTAMPTZ DEFAULT NULL;

    CREATE TABLE featured_posts (
      featured_post_id  SERIAL PRIMARY KEY,
      post_id           INT NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
      display_order     INT NOT NULL DEFAULT 0,
      created_by        INT REFERENCES accounts(account_id) ON DELETE SET NULL,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT featured_posts_post_id_unique UNIQUE (post_id)
    );

    CREATE INDEX idx_featured_posts_order ON featured_posts(display_order);
  `);
};
