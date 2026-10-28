import { env } from '../config/env';
import { enquiryRepository } from '../repositories/enquiry.repository';
import { notificationRepository } from '../repositories/notification.repository';
import { DeliveryStatus, Enquiry, NotificationChannel, NotificationLog } from '../types/models';
import { logger, safeErrorMessage } from '../utils/logger';
import { emailService, NotificationError } from './email.service';
import { whatsappService } from './whatsapp.service';

/** Exponential backoff: 1, 2, 4, 8 … minutes, capped at 60. */
export function nextRetryDate(attemptsSoFar: number, now = Date.now()): Date {
  const minutes = Math.min(60, 2 ** Math.max(0, attemptsSoFar - 1));
  return new Date(now + minutes * 60_000);
}

function isConfigured(channel: NotificationChannel): boolean {
  return channel === 'email' ? emailService.isConfigured() : whatsappService.isConfigured();
}

async function send(channel: NotificationChannel, enquiry: Enquiry): Promise<string | null> {
  if (channel === 'email') return (await emailService.sendEnquiryAlert(enquiry)).messageId;
  return (await whatsappService.sendEnquiryAlert(enquiry)).messageId;
}

export const notificationService = {
  /**
   * Attempts one notification and records the honest outcome.
   * Never throws — the enquiry is already safely stored.
   */
  async attempt(log: NotificationLog, enquiry: Enquiry): Promise<DeliveryStatus> {
    if (!isConfigured(log.channel)) {
      await notificationRepository.recordAttempt(log.id, {
        status: 'skipped',
        errorMessage: `${log.channel} integration not configured`,
        countsAsAttempt: false,
        nextRetryAt: null,
      });
      return 'skipped';
    }
    try {
      const providerMessageId = await send(log.channel, enquiry);
      await notificationRepository.recordAttempt(log.id, {
        status: 'accepted',
        providerMessageId,
        errorMessage: null,
        countsAsAttempt: true,
        nextRetryAt: null,
      });
      return 'accepted';
    } catch (err) {
      const attempts = log.attemptCount + 1;
      const retryable = err instanceof NotificationError ? err.retryable : true;
      const canRetry = retryable && attempts < env.NOTIFICATION_MAX_ATTEMPTS;
      const message = safeErrorMessage(err);
      logger.warn('Notification attempt failed', { channel: log.channel, enquiryId: enquiry.id, attempts, retryable, error: message });
      try {
        await notificationRepository.recordAttempt(log.id, {
          status: 'failed',
          errorMessage: message,
          countsAsAttempt: true,
          nextRetryAt: canRetry ? nextRetryDate(attempts) : null,
        });
      } catch (dbErr) {
        logger.error('Could not record notification failure', { logId: log.id, error: safeErrorMessage(dbErr) });
      }
      return 'failed';
    }
  },

  /** Sends all notifications for a freshly saved enquiry, in parallel. */
  async dispatchForEnquiry(enquiry: Enquiry): Promise<Record<NotificationChannel, DeliveryStatus>> {
    const result: Record<NotificationChannel, DeliveryStatus> = { email: 'pending', whatsapp: 'pending' };
    try {
      const logs = await notificationRepository.findByEnquiry(enquiry.id);
      const outcomes = await Promise.all(logs.map((l) => this.attempt(l, enquiry).then((s) => [l.channel, s] as const)));
      for (const [channel, status] of outcomes) result[channel] = status;
    } catch (err) {
      // Logs stay 'pending' and the retry worker will pick them up.
      logger.error('Notification dispatch error', { enquiryId: enquiry.id, error: safeErrorMessage(err) });
    }
    return result;
  },

  /** Retries due notifications. Called periodically by the worker in server.ts and by admins on demand. */
  async processDue(limit = 20): Promise<number> {
    const due = await notificationRepository.findDue(env.NOTIFICATION_MAX_ATTEMPTS, limit);
    let processed = 0;
    for (const log of due) {
      const enquiry = await enquiryRepository.findById(log.enquiryId);
      if (!enquiry) continue;
      await this.attempt(log, enquiry);
      processed++;
    }
    return processed;
  },

  /** Manual retry from the admin panel (ignores the schedule, respects configuration). */
  async retryOne(logId: number): Promise<DeliveryStatus | null> {
    const log = await notificationRepository.findById(logId);
    if (!log) return null;
    if (['accepted', 'sent', 'delivered', 'read'].includes(log.deliveryStatus)) return log.deliveryStatus;
    const enquiry = await enquiryRepository.findById(log.enquiryId);
    if (!enquiry) return null;
    return this.attempt(log, enquiry);
  },
};
