/**
 * 0003_likes_follows.js
 *
 * Adds post_likes and comment_likes tables to support the like/heart feature.
 * Named "likes_follows" because Phase 3 (account following) will extend this file.
 *
 * Both tables use a composite primary key (account_id, target_id) so the
 * database itself enforces one-like-per-user-per-target without needing
 * application-level deduplication.
 */

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS post_likes (
      account_id  INTEGER NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
      post_id     INTEGER NOT NULL REFERENCES posts(post_id)       ON DELETE CASCADE,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (account_id, post_id)
    );

    CREATE INDEX IF NOT EXISTS post_likes_post_id_idx ON post_likes(post_id);

    CREATE TABLE IF NOT EXISTS comment_likes (
      account_id  INTEGER NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
      comment_id  INTEGER NOT NULL REFERENCES comments(comment_id) ON DELETE CASCADE,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (account_id, comment_id)
    );

    CREATE INDEX IF NOT EXISTS comment_likes_comment_id_idx ON comment_likes(comment_id);
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS comment_likes;
    DROP TABLE IF EXISTS post_likes;
  `);
};
