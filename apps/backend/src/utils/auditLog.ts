import { sql, type SerializableValue } from 'slonik';
import { z } from 'zod';
import { getPool } from '../config/database.js';

interface AuditEntry {
  actorAccountId: number;
  actionType: string;
  targetType?: string;
  targetId?: number;
  metadata?: Record<string, SerializableValue>;
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    const db = await getPool();
    await db.query(
      sql.type(z.object({}))`
        INSERT INTO audit_log (actor_account_id, action_type, target_type, target_id, metadata)
        VALUES (
          ${entry.actorAccountId},
          ${entry.actionType},
          ${entry.targetType ?? null},
          ${entry.targetId ?? null},
          ${entry.metadata ? sql.jsonb(entry.metadata) : null}
        )
      `,
    );
  } catch (err) {
    // Audit log failures must never crash a request
    console.error('Audit log write failed:', err);
  }
}
