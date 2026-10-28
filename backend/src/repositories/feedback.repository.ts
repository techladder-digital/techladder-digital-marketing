import { execute, query, SqlParam } from '../config/database';
import { Feedback, ModerationStatus } from '../types/models';
import { CreateFeedbackInput } from '../validators/feedback.validator';

interface FeedbackRow {
  id: number;
  customer_name: string;
  business_name: string | null;
  service_category: Feedback['serviceCategory'];
  project_name: string;
  rating: number;
  feedback_message: string;
  consent_to_publish: number;
  moderation_status: ModerationStatus;
  created_at: Date;
  updated_at: Date;
}

const toFeedback = (r: FeedbackRow): Feedback => ({
  id: r.id,
  customerName: r.customer_name,
  businessName: r.business_name,
  serviceCategory: r.service_category,
  projectName: r.project_name,
  rating: Number(r.rating),
  feedbackMessage: r.feedback_message,
  consentToPublish: r.consent_to_publish === 1,
  moderationStatus: r.moderation_status,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const feedbackRepository = {
  async insert(f: Omit<CreateFeedbackInput, 'website'>): Promise<number> {
    const r = await execute(
      `INSERT INTO feedback (customer_name, business_name, service_category, project_name, rating,
                             feedback_message, consent_to_publish, moderation_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [f.customerName, f.businessName, f.serviceCategory, f.projectName, f.rating, f.feedbackMessage, f.consentToPublish ? 1 : 0],
    );
    return r.insertId;
  },

  /** Public list: approved AND consented only. */
  async listPublic(limit: number): Promise<Feedback[]> {
    const rows = await query<FeedbackRow>(
      `SELECT * FROM feedback
        WHERE moderation_status = 'approved' AND consent_to_publish = 1
        ORDER BY created_at DESC LIMIT ?`,
      [String(limit)],
    );
    return rows.map(toFeedback);
  },

  async list(status: ModerationStatus | undefined, page: number, pageSize: number) {
    const params: SqlParam[] = [];
    let where = '';
    if (status) {
      where = 'WHERE moderation_status = ?';
      params.push(status);
    }
    const [{ total }] = await query<{ total: number }>(`SELECT COUNT(*) AS total FROM feedback ${where}`, params);
    const rows = await query<FeedbackRow>(
      `SELECT * FROM feedback ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
      [...params, String(pageSize), String((page - 1) * pageSize)],
    );
    return { items: rows.map(toFeedback), total: Number(total) };
  },

  async findById(id: number): Promise<Feedback | null> {
    const rows = await query<FeedbackRow>('SELECT * FROM feedback WHERE id = ? LIMIT 1', [id]);
    return rows[0] ? toFeedback(rows[0]) : null;
  },

  async setModeration(id: number, status: ModerationStatus): Promise<boolean> {
    const r = await execute('UPDATE feedback SET moderation_status = ? WHERE id = ?', [status, id]);
    return r.affectedRows > 0;
  },

  async counts(): Promise<{ pending: number; approved: number }> {
    const [row] = await query<{ pending: number; approved: number }>(
      `SELECT COALESCE(SUM(moderation_status = 'pending'), 0) AS pending,
              COALESCE(SUM(moderation_status = 'approved'), 0) AS approved FROM feedback`,
    );
    return { pending: Number(row.pending), approved: Number(row.approved) };
  },
};
