/**
 * 0008_email_verification.js
 *
 * Adds email verification support:
 *   - email_verified_at column on accounts
 *   - email_verification_tokens table for storing hashed verification tokens
 */

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE accounts ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ DEFAULT NULL;

    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      token_hash   TEXT PRIMARY KEY,
      account_id   INT NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
      expires_at   TIMESTAMPTZ NOT NULL,
      used_at      TIMESTAMPTZ DEFAULT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_email_ver_tokens_account ON email_verification_tokens (account_id);
  `);
};

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export const down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS email_verification_tokens;
    ALTER TABLE accounts DROP COLUMN IF EXISTS email_verified_at;
  `);
};
