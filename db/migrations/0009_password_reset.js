/**
 * 0009_password_reset.js
 *
 * Creates the password_reset_tokens table for storing hashed
 * one-time-use password reset tokens.
 */

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      token_hash   TEXT PRIMARY KEY,
      account_id   INT NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
      expires_at   TIMESTAMPTZ NOT NULL,
      used_at      TIMESTAMPTZ DEFAULT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_pw_reset_tokens_account ON password_reset_tokens (account_id);
  `);
};

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export const down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS password_reset_tokens;
  `);
};
