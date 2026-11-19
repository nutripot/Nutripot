// ============================================================================
// BusinessHub Enterprise - AuditRepository
// Cloudflare D1 operations for Immutable Audit Logs
// ============================================================================

import { IAuditRepository, AuditLog } from '@/types';

export class AuditRepository implements IAuditRepository {
  constructor(private db: D1Database) {}

  async log(audit: Omit<AuditLog, 'id' | 'createdAt'>): Promise<void> {
    const id = 'aud_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, old_values_json, new_values_json, ip_address, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        audit.userId,
        audit.action,
        audit.entityType,
        audit.entityId,
        audit.oldValuesJson || null,
        audit.newValuesJson || null,
        audit.ipAddress || null,
        now
      )
      .run();
  }

  async query(params: { entityType?: string; entityId?: string; userId?: string; limit?: number }): Promise<AuditLog[]> {
    let sql = `SELECT id, user_id, action, entity_type, entity_id, old_values_json, new_values_json, ip_address, created_at
               FROM audit_logs WHERE 1=1`;
    const binds: any[] = [];

    if (params.entityType) {
      sql += ` AND entity_type = ?`;
      binds.push(params.entityType);
    }

    if (params.entityId) {
      sql += ` AND entity_id = ?`;
      binds.push(params.entityId);
    }

    if (params.userId) {
      sql += ` AND user_id = ?`;
      binds.push(params.userId);
    }

    sql += ` ORDER BY created_at DESC LIMIT ?`;
    binds.push(params.limit || 100);

    const rows = await this.db.prepare(sql).bind(...binds).all<any>();
    return (rows.results || []).map(r => ({
      id: r.id,
      userId: r.user_id,
      action: r.action,
      entityType: r.entity_type,
      entityId: r.entity_id,
      oldValuesJson: r.old_values_json || undefined,
      newValuesJson: r.new_values_json || undefined,
      ipAddress: r.ip_address || undefined,
      createdAt: r.created_at,
    }));
  }
}
