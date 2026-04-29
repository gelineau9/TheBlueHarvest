export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE revoked_tokens (
      jti         TEXT PRIMARY KEY,
      expires_at  TIMESTAMPTZ NOT NULL
    );
    CREATE INDEX idx_revoked_tokens_expires ON revoked_tokens (expires_at);
  `);
};

export const down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS revoked_tokens;`);
};
