/**
 * 0006_follows.js
 *
 * Adds account-to-account follows and account-to-profile follows.
 *
 * Note: 0005_suspend_and_pin.js is a superseded dead file that never ran
 * (0005 was already claimed by 0005_suspend_and_featured_posts.js).
 * The posts.is_pinned column it described does not exist in the DB.
 */

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS account_follows (
      follower_id  INT REFERENCES accounts(account_id) ON DELETE CASCADE,
      followed_id  INT REFERENCES accounts(account_id) ON DELETE CASCADE,
      created_at   TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (follower_id, followed_id),
      CHECK (follower_id <> followed_id)
    );
    CREATE TABLE IF NOT EXISTS profile_follows (
      account_id  INT REFERENCES accounts(account_id) ON DELETE CASCADE,
      profile_id  INT REFERENCES profiles(profile_id) ON DELETE CASCADE,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (account_id, profile_id)
    );
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS profile_follows;
    DROP TABLE IF EXISTS account_follows;
  `);
};
