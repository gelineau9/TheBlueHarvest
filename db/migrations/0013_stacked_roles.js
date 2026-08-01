/**
 * 0013_stacked_roles.js
 *
 * Moves from a single role per account (accounts.user_role_id) to stacked
 * roles (account_roles junction), so one account can be e.g. both a
 * moderator and a guide author.
 *
 * Baseline semantics: an ordinary user holds NO rows in account_roles.
 * Only elevated roles are stored. This is deliberate — accounts created
 * between this migration and the backend deploy get no junction rows from
 * the old code, and "no rows" correctly means "ordinary user".
 *
 * accounts.user_role_id is intentionally left in place so the currently
 * deployed backend keeps working until the new code ships. It is dropped
 * in a later migration once the deploy is confirmed healthy.
 */

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export const up = (pgm) => {
  pgm.sql(`
    INSERT INTO user_roles (role_name, role_description)
    VALUES ('guide_author', 'May write and publish guides');

    CREATE TABLE account_roles (
      account_id  INT REFERENCES accounts(account_id) ON DELETE CASCADE,
      role_id     INT REFERENCES user_roles(role_id)  ON DELETE CASCADE,
      granted_by  INT REFERENCES accounts(account_id) ON DELETE SET NULL,
      granted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (account_id, role_id)
    );

    CREATE INDEX idx_account_roles_account ON account_roles (account_id);

    -- Backfill elevated roles only (2 = admin, 3 = moderator).
    -- Ordinary users are represented by the absence of rows.
    INSERT INTO account_roles (account_id, role_id)
    SELECT account_id, user_role_id
    FROM accounts
    WHERE user_role_id IN (2, 3) AND deleted = false;
  `);
};

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export const down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS account_roles;
    DELETE FROM user_roles WHERE role_name = 'guide_author';
  `);
};
