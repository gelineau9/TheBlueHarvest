/**
 * 0004_audit_log.js
 *
 * Creates the audit_log table used by the Phase 5 Admin/Mod Dashboard.
 * Every sensitive admin action (ban, role change, delete, pin) is recorded here.
 */

export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS audit_log (
      log_id           SERIAL PRIMARY KEY,
      actor_account_id INT REFERENCES accounts(account_id) ON DELETE SET NULL,
      action_type      VARCHAR(50) NOT NULL,
      target_type      VARCHAR(50),
      target_id        INT,
      metadata         JSONB DEFAULT NULL,
      created_at       TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_audit_log_actor  ON audit_log(actor_account_id);
    CREATE INDEX IF NOT EXISTS idx_audit_log_type   ON audit_log(action_type);
    CREATE INDEX IF NOT EXISTS idx_audit_log_target ON audit_log(target_type, target_id);
  `);
};

export const down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS audit_log;`);
};
