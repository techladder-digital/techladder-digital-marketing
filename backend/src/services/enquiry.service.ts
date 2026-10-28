import { withTransaction } from '../config/database';
import { enquiryRepository } from '../repositories/enquiry.repository';
import { DeliveryStatus, NotificationChannel } from '../types/models';
import { ApiError } from '../utils/api-error';
import { CreateEnquiryInput } from '../validators/enquiry.validator';
import { notificationService } from './notification.service';

export interface EnquirySubmissionResult {
  enquiryId: number;
  notifications: Record<NotificationChannel, DeliveryStatus>;
}

export const enquiryService = {
  /**
   * 1. Save the enquiry and pending notification rows in ONE transaction.
   * 2. Only after commit, attempt email + WhatsApp. Failures never lose the enquiry.
   */
  async submit(input: CreateEnquiryInput): Promise<EnquirySubmissionResult> {
    const { website: _honeypot, ...data } = input;
    const enquiryId = await withTransaction((conn) =>
      enquiryRepository.insertWithNotifications(conn, data, ['email', 'whatsapp']),
    );

    const enquiry = await enquiryRepository.findById(enquiryId);
    if (!enquiry) throw new ApiError(500, 'Enquiry was saved but could not be reloaded', 'INTERNAL_ERROR');

    const notifications = await notificationService.dispatchForEnquiry(enquiry);
    return { enquiryId, notifications };
  },
};
