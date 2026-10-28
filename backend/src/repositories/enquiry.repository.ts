import type { PoolConnection } from 'mysql2/promise';
import { execute, query, SqlParam } from '../config/database';
import { Enquiry, EnquiryStatus, NewEnquiry, NotificationChannel } from '../types/models';
import { ListEnquiriesQuery } from '../validators/enquiry.validator';

interface EnquiryRow {
  id: number;
  full_name: string;
  business_name: string | null;
  email: string;
  phone: string;
  project_type: Enquiry['projectType'];
  service_name: string;
  budget_range: string | null;
  message: string;
  preferred_contact_method: Enquiry['preferredContactMethod'];
  consent_to_contact: number;
  enquiry_status: EnquiryStatus;
  created_at: Date;
  updated_at: Date;
}

const toEnquiry = (r: EnquiryRow): Enquiry => ({
  id: r.id,
  fullName: r.full_name,
  businessName: r.business_name,
  email: r.email,
  phone: r.phone,
  projectType: r.project_type,
  serviceName: r.service_name,
  budgetRange: r.budget_range,
  message: r.message,
  preferredContactMethod: r.preferred_contact_method,
  consentToContact: r.consent_to_contact === 1,
  enquiryStatus: r.enquiry_status,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const enquiryRepository = {
  /**
   * Inserts the enquiry and one pending notification row per channel.
   * Must be called inside a transaction (conn) so both succeed or neither does.
   */
  async insertWithNotifications(conn: PoolConnection, e: NewEnquiry, channels: NotificationChannel[]): Promise<number> {
    const result = await execute(
      `INSERT INTO enquiries
        (full_name, business_name, email, phone, project_type, service_name, budget_range,
         message, preferred_contact_method, consent_to_contact)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        e.fullName, e.businessName, e.email, e.phone, e.projectType, e.serviceName,
        e.budgetRange, e.message, e.preferredContactMethod, e.consentToContact ? 1 : 0,
      ],
      conn,
    );
    const enquiryId = result.insertId;
    for (const channel of channels) {
      await execute(
        "INSERT INTO notification_logs (enquiry_id, channel, delivery_status) VALUES (?, ?, 'pending')",
        [enquiryId, channel],
        conn,
      );
    }
    return enquiryId;
  },

  async findById(id: number): Promise<Enquiry | null> {
    const rows = await query<EnquiryRow>('SELECT * FROM enquiries WHERE id = ? LIMIT 1', [id]);
    return rows[0] ? toEnquiry(rows[0]) : null;
  },

  async list(q: ListEnquiriesQuery): Promise<{ items: Enquiry[]; total: number }> {
    const where: string[] = [];
    const params: SqlParam[] = [];
    if (q.status) {
      where.push('enquiry_status = ?');
      params.push(q.status);
    }
    if (q.projectType) {
      where.push('project_type = ?');
      params.push(q.projectType);
    }
    if (q.search) {
      // Escape LIKE wildcards in user input, then bind as a parameter.
      const term = `%${q.search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
      where.push('(full_name LIKE ? OR email LIKE ? OR business_name LIKE ? OR service_name LIKE ?)');
      params.push(term, term, term, term);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [{ total }] = await query<{ total: number }>(`SELECT COUNT(*) AS total FROM enquiries ${whereSql}`, params);
    const rows = await query<EnquiryRow>(
      `SELECT * FROM enquiries ${whereSql} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
      [...params, String(q.pageSize), String((q.page - 1) * q.pageSize)],
    );
    return { items: rows.map(toEnquiry), total: Number(total) };
  },

  async updateStatus(id: number, status: EnquiryStatus): Promise<boolean> {
    const r = await execute('UPDATE enquiries SET enquiry_status = ? WHERE id = ?', [status, id]);
    return r.affectedRows > 0;
  },

  async counts(): Promise<{ total: number; new: number; last7Days: number }> {
    const [row] = await query<{ total: number; new_count: number; last7: number }>(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(enquiry_status = 'new'), 0) AS new_count,
              COALESCE(SUM(created_at >= UTC_TIMESTAMP() - INTERVAL 7 DAY), 0) AS last7
         FROM enquiries`,
    );
    return { total: Number(row.total), new: Number(row.new_count), last7Days: Number(row.last7) };
  },
};
