/**
 * 0012_lowercase_emails.js
 *
 * Emails were previously stored and compared case-sensitively, so
 * "Foo@x.com" and "foo@x.com" could be (or fail to match) different
 * accounts. The application now lowercases emails on every write and
 * lookup; this migration normalizes existing rows and adds a functional
 * unique index so mixed-case duplicates can never be introduced again.
 *
 * If two existing accounts collide on LOWER(email), the UPDATE violates
 * the accounts_email_key unique constraint and the migration aborts —
 * resolve the duplicate manually, then re-run. Check first with:
 *   SELECT LOWER(email), COUNT(*) FROM accounts
 *   GROUP BY LOWER(email) HAVING COUNT(*) > 1;
 */

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export const up = (pgm) => {
  pgm.sql(`
    UPDATE accounts SET email = LOWER(email) WHERE email <> LOWER(email);
    CREATE UNIQUE INDEX accounts_email_lower_idx ON accounts (LOWER(email));
  `);
};

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export const down = (pgm) => {
  // Original casing is unrecoverable; only the index is reversible.
  pgm.sql(`DROP INDEX IF EXISTS accounts_email_lower_idx;`);
};
