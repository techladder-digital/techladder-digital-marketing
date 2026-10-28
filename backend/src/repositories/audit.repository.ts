import { execute, query } from '../config/database';

export interface AuditEntry {
  id: number;
  adminId: number | null;
  adminName: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  createdAt: Date;
}

export const auditRepository = {
  async insert(adminId: number | null, action: string, entityType: string | null, entityId: string | null) {
    await execute('INSERT INTO admin_audit_logs (admin_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?)', [
      adminId,
      action,
      entityType,
      entityId,
    ]);
  },

  async listRecent(limit: number): Promise<AuditEntry[]> {
    const rows = await query<{
      id: number; admin_id: number | null; admin_name: string | null; action: string;
      entity_type: string | null; entity_id: string | null; created_at: Date;
    }>(
      `SELECT l.id, l.admin_id, a.name AS admin_name, l.action, l.entity_type, l.entity_id, l.created_at
         FROM admin_audit_logs l LEFT JOIN admins a ON a.id = l.admin_id
        ORDER BY l.id DESC LIMIT ?`,
      [String(limit)],
    );
    return rows.map((r) => ({
      id: r.id, adminId: r.admin_id, adminName: r.admin_name, action: r.action,
      entityType: r.entity_type, entityId: r.entity_id, createdAt: r.created_at,
    }));
  },
};
