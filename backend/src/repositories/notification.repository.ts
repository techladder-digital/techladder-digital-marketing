import { execute, query } from '../config/database';
import { DeliveryStatus, NotificationChannel, NotificationLog } from '../types/models';

interface NotificationRow {
  id: number;
  enquiry_id: number;
  channel: NotificationChannel;
  delivery_status: DeliveryStatus;
  provider_message_id: string | null;
  error_message: string | null;
  attempt_count: number;
  next_retry_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const toLog = (r: NotificationRow): NotificationLog => ({
  id: r.id,
  enquiryId: r.enquiry_id,
  channel: r.channel,
  deliveryStatus: r.delivery_status,
  providerMessageId: r.provider_message_id,
  errorMessage: r.error_message,
  attemptCount: r.attempt_count,
  nextRetryAt: r.next_retry_at,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export interface AttemptResult {
  status: DeliveryStatus;
  providerMessageId?: string | null;
  errorMessage?: string | null;
  countsAsAttempt: boolean;
  nextRetryAt?: Date | null;
}

/** Status precedence so a late "sent" webhook never overwrites "delivered"/"read". */
const RANK: Record<DeliveryStatus, number> = {
  pending: 0, skipped: 0, failed: 1, accepted: 2, sent: 3, delivered: 4, read: 5,
};

export const notificationRepository = {
  async findByEnquiry(enquiryId: number): Promise<NotificationLog[]> {
    const rows = await query<NotificationRow>('SELECT * FROM notification_logs WHERE enquiry_id = ? ORDER BY channel', [enquiryId]);
    return rows.map(toLog);
  },

  async findById(id: number): Promise<NotificationLog | null> {
    const rows = await query<NotificationRow>('SELECT * FROM notification_logs WHERE id = ? LIMIT 1', [id]);
    return rows[0] ? toLog(rows[0]) : null;
  },

  async recordAttempt(id: number, r: AttemptResult): Promise<void> {
    await execute(
      `UPDATE notification_logs
          SET delivery_status = ?, provider_message_id = COALESCE(?, provider_message_id),
              error_message = ?, attempt_count = attempt_count + ?, next_retry_at = ?
        WHERE id = ?`,
      [r.status, r.providerMessageId ?? null, r.errorMessage ?? null, r.countsAsAttempt ? 1 : 0, r.nextRetryAt ?? null, id],
    );
  },

  /** Failed (retryable) or stuck-pending notifications whose retry time has come. */
  async findDue(maxAttempts: number, limit: number): Promise<NotificationLog[]> {
    const rows = await query<NotificationRow>(
      `SELECT * FROM notification_logs
        WHERE attempt_count < ?
          AND ((delivery_status = 'failed' AND next_retry_at IS NOT NULL AND next_retry_at <= UTC_TIMESTAMP())
            OR (delivery_status = 'pending' AND updated_at <= UTC_TIMESTAMP() - INTERVAL 2 MINUTE))
        ORDER BY id ASC LIMIT ?`,
      [maxAttempts, String(limit)],
    );
    return rows.map(toLog);
  },

  /** Applies a WhatsApp webhook status if it advances the current status (or is a failure). */
  async applyProviderStatus(providerMessageId: string, status: DeliveryStatus, errorMessage: string | null): Promise<boolean> {
    const rows = await query<NotificationRow>(
      'SELECT * FROM notification_logs WHERE provider_message_id = ? LIMIT 1',
      [providerMessageId],
    );
    const current = rows[0];
    if (!current) return false;
    if (status !== 'failed' && RANK[status] <= RANK[current.delivery_status]) return false;
    await execute(
      'UPDATE notification_logs SET delivery_status = ?, error_message = ?, next_retry_at = NULL WHERE id = ?',
      [status, errorMessage, current.id],
    );
    return true;
  },

  async countOutstanding(): Promise<{ pending: number; failed: number }> {
    const [row] = await query<{ pending: number; failed: number }>(
      `SELECT COALESCE(SUM(delivery_status = 'pending'), 0) AS pending,
              COALESCE(SUM(delivery_status = 'failed'), 0) AS failed
         FROM notification_logs`,
    );
    return { pending: Number(row.pending), failed: Number(row.failed) };
  },

  async lastOutcomeByChannel(channel: NotificationChannel): Promise<{ status: DeliveryStatus; at: Date; error: string | null } | null> {
    const rows = await query<{ delivery_status: DeliveryStatus; updated_at: Date; error_message: string | null }>(
      `SELECT delivery_status, updated_at, error_message FROM notification_logs
        WHERE channel = ? AND delivery_status <> 'pending' ORDER BY updated_at DESC, id DESC LIMIT 1`,
      [channel],
    );
    return rows[0] ? { status: rows[0].delivery_status, at: rows[0].updated_at, error: rows[0].error_message } : null;
  },
};
