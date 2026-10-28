/* Email + WhatsApp failure handling and honest status reporting. */
const sendMail = jest.fn();
jest.mock('nodemailer', () => ({ __esModule: true, default: { createTransport: () => ({ sendMail, verify: jest.fn() }) } }));
jest.mock('../src/repositories/notification.repository', () => ({
  notificationRepository: { recordAttempt: jest.fn(), findByEnquiry: jest.fn(), findDue: jest.fn(), findById: jest.fn() },
}));
jest.mock('../src/repositories/enquiry.repository', () => ({ enquiryRepository: { findById: jest.fn() } }));

import { env } from '../src/config/env';
import { enquiryRepository } from '../src/repositories/enquiry.repository';
import { notificationRepository } from '../src/repositories/notification.repository';
import { buildEnquiryEmail, emailService, NotificationError } from '../src/services/email.service';
import { nextRetryDate, notificationService } from '../src/services/notification.service';
import { buildTemplatePayload, templateText, whatsappService } from '../src/services/whatsapp.service';
import { NotificationLog } from '../src/types/models';
import { makeEnquiry } from './helpers';

const repo = notificationRepository as jest.Mocked<typeof notificationRepository>;
const original = { ...env };

function log(channel: 'email' | 'whatsapp', attemptCount = 0): NotificationLog {
  return {
    id: channel === 'email' ? 1 : 2, enquiryId: 42, channel, deliveryStatus: 'pending', providerMessageId: null,
    errorMessage: null, attemptCount, nextRetryAt: null, createdAt: new Date(), updatedAt: new Date(),
  };
}

function enableEmail() {
  Object.assign(env, { SMTP_HOST: 'smtp.test', BUSINESS_EMAIL: 'owner@example.com', EMAIL_FROM: 'site@example.com', emailEnabled: true });
}
function enableWhatsapp() {
  Object.assign(env, {
    WHATSAPP_ACCESS_TOKEN: 'secret-token-value', WHATSAPP_PHONE_NUMBER_ID: '1234567890',
    WHATSAPP_BUSINESS_RECIPIENT: '919876543210', WHATSAPP_TEMPLATE_NAME: 'new_enquiry_alert', whatsappEnabled: true,
  });
}

function jsonResponse(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as unknown as Response;
}

afterEach(() => {
  Object.assign(env, original);
  jest.restoreAllMocks();
});

describe('integration not configured', () => {
  it('marks notifications as skipped (not failed, not sent) and never contacts a provider', async () => {
    const status = await notificationService.attempt(log('email'), makeEnquiry());
    expect(status).toBe('skipped');
    expect(sendMail).not.toHaveBeenCalled();
    expect(repo.recordAttempt).toHaveBeenCalledWith(1, expect.objectContaining({ status: 'skipped', countsAsAttempt: false }));
  });
});

describe('email notifications', () => {
  beforeEach(enableEmail);

  it('records "accepted" with the SMTP message id when the server accepts the message', async () => {
    sendMail.mockResolvedValueOnce({ messageId: '<abc@smtp>', accepted: ['owner@example.com'], rejected: [] });
    const status = await notificationService.attempt(log('email'), makeEnquiry());
    expect(status).toBe('accepted');
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'owner@example.com', subject: expect.stringContaining('#42') }));
    expect(repo.recordAttempt).toHaveBeenCalledWith(1, expect.objectContaining({ status: 'accepted', providerMessageId: '<abc@smtp>' }));
  });

  it('marks a temporary SMTP failure as failed and schedules a retry', async () => {
    sendMail.mockRejectedValueOnce(Object.assign(new Error('connect ETIMEDOUT'), { code: 'ETIMEDOUT' }));
    const status = await notificationService.attempt(log('email'), makeEnquiry());
    expect(status).toBe('failed');
    const call = repo.recordAttempt.mock.calls[0][1];
    expect(call.status).toBe('failed');
    expect(call.countsAsAttempt).toBe(true);
    expect(call.nextRetryAt).toBeInstanceOf(Date);
    expect(call.errorMessage).toMatch(/ETIMEDOUT/);
  });

  it('does not retry permanent SMTP rejections', async () => {
    sendMail.mockRejectedValueOnce(Object.assign(new Error('mailbox unavailable'), { responseCode: 550 }));
    await notificationService.attempt(log('email'), makeEnquiry());
    expect(repo.recordAttempt.mock.calls[0][1]).toMatchObject({ status: 'failed', nextRetryAt: null });
  });

  it('stops retrying after the maximum number of attempts', async () => {
    sendMail.mockRejectedValueOnce(new Error('ECONNRESET'));
    await notificationService.attempt(log('email', env.NOTIFICATION_MAX_ATTEMPTS - 1), makeEnquiry());
    expect(repo.recordAttempt.mock.calls[0][1]).toMatchObject({ status: 'failed', nextRetryAt: null });
  });

  it('still records a failure if recording itself throws, without throwing to the caller', async () => {
    sendMail.mockRejectedValueOnce(new Error('ECONNRESET'));
    repo.recordAttempt.mockRejectedValueOnce(new Error('db down'));
    await expect(notificationService.attempt(log('email'), makeEnquiry())).resolves.toBe('failed');
  });

  it('escapes customer-supplied HTML in the email body and strips newlines from the subject', () => {
    const { html, subject } = buildEnquiryEmail(makeEnquiry({ fullName: '<script>alert(1)</script>', serviceName: 'SEO\r\nBcc: x@y.z' }));
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(subject).not.toMatch(/[\r\n]/);
  });

  it('throws a non-retryable error when not configured', async () => {
    Object.assign(env, { emailEnabled: false });
    await expect(emailService.sendEnquiryAlert(makeEnquiry())).rejects.toMatchObject({ retryable: false });
  });
});

describe('WhatsApp notifications', () => {
  beforeEach(enableWhatsapp);

  it('sends the approved template and reports "accepted" — never "delivered" — on API success', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValueOnce(jsonResponse(200, { messages: [{ id: 'wamid.ABC' }] }));
    const status = await notificationService.attempt(log('whatsapp'), makeEnquiry());
    expect(status).toBe('accepted');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://graph.facebook.com/v21.0/1234567890/messages');
    const body = JSON.parse(String(init.body));
    expect(body.type).toBe('template');
    expect(body.template.name).toBe('new_enquiry_alert');
    expect(repo.recordAttempt).toHaveBeenCalledWith(2, expect.objectContaining({ status: 'accepted', providerMessageId: 'wamid.ABC' }));
  });

  it('treats HTTP 429 / throttling codes as retryable failures', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(jsonResponse(429, { error: { message: 'Rate limit hit', code: 130429 } }));
    await expect(whatsappService.sendEnquiryAlert(makeEnquiry())).rejects.toMatchObject({ retryable: true });
  });

  it('treats invalid template / parameter errors as permanent failures', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(jsonResponse(400, { error: { message: 'Template name does not exist', code: 132001 } }));
    const status = await notificationService.attempt(log('whatsapp'), makeEnquiry());
    expect(status).toBe('failed');
    expect(repo.recordAttempt.mock.calls[0][1]).toMatchObject({ status: 'failed', nextRetryAt: null });
    expect(repo.recordAttempt.mock.calls[0][1].errorMessage).toMatch(/132001/);
  });

  it('treats network errors as retryable and never leaks the access token into logs', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('getaddrinfo ENOTFOUND graph.facebook.com'));
    await notificationService.attempt(log('whatsapp'), makeEnquiry());
    const call = repo.recordAttempt.mock.calls[0][1];
    expect(call.nextRetryAt).toBeInstanceOf(Date);
    expect(call.errorMessage).not.toContain('secret-token-value');
  });

  it('sanitises template parameters (no newlines/tabs, length-limited)', () => {
    expect(templateText('a\nb\t\tc     d')).toBe('a b c d');
    expect(templateText('')).toBe('-');
    const payload = buildTemplatePayload(makeEnquiry({ message: 'not included' }));
    expect(JSON.stringify(payload)).not.toContain('not included');
    expect(payload.template.components[0].parameters).toHaveLength(5);
  });

  it('rejects a response without a message id', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(jsonResponse(200, {}));
    await expect(whatsappService.sendEnquiryAlert(makeEnquiry())).rejects.toBeInstanceOf(NotificationError);
  });
});

describe('retry scheduling', () => {
  it('uses exponential backoff capped at 60 minutes', () => {
    const now = 0;
    expect(nextRetryDate(1, now).getTime()).toBe(60_000);
    expect(nextRetryDate(3, now).getTime()).toBe(4 * 60_000);
    expect(nextRetryDate(20, now).getTime()).toBe(60 * 60_000);
  });

  it('processes due notifications through the same attempt logic', async () => {
    repo.findDue.mockResolvedValueOnce([log('email', 1)]);
    (enquiryRepository.findById as jest.Mock).mockResolvedValueOnce(makeEnquiry());
    await expect(notificationService.processDue()).resolves.toBe(1);
    expect(repo.recordAttempt).toHaveBeenCalledWith(1, expect.objectContaining({ status: 'skipped' }));
  });
});
