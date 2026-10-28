/* Enquiry submission: persistence first, honest notification status, failures never lose enquiries. */
jest.mock('../src/config/database', () => ({
  withTransaction: jest.fn(async (fn: (c: unknown) => unknown) => fn({ conn: true })),
  pingDatabase: jest.fn(async () => true),
}));
jest.mock('../src/repositories/enquiry.repository', () => ({
  enquiryRepository: { insertWithNotifications: jest.fn(), findById: jest.fn() },
}));
jest.mock('../src/services/notification.service', () => ({
  notificationService: { dispatchForEnquiry: jest.fn() },
}));

import request from 'supertest';
import { createApp } from '../src/app';
import { withTransaction } from '../src/config/database';
import { enquiryRepository } from '../src/repositories/enquiry.repository';
import { notificationService } from '../src/services/notification.service';
import { makeEnquiry, validEnquiryBody } from './helpers';

const repo = enquiryRepository as jest.Mocked<typeof enquiryRepository>;
const notifications = notificationService as jest.Mocked<typeof notificationService>;

describe('POST /api/enquiries', () => {
  const app = createApp();

  it('saves the enquiry inside a transaction, then dispatches notifications', async () => {
    const order: string[] = [];
    repo.insertWithNotifications.mockImplementation(async () => {
      order.push('saved');
      return 42;
    });
    repo.findById.mockResolvedValue(makeEnquiry());
    notifications.dispatchForEnquiry.mockImplementation(async () => {
      order.push('notified');
      return { email: 'accepted', whatsapp: 'skipped' };
    });

    const res = await request(app).post('/api/enquiries').send(validEnquiryBody);

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ success: true, data: { enquiryId: 42, notifications: { email: 'accepted', whatsapp: 'skipped' } } });
    expect(withTransaction).toHaveBeenCalledTimes(1);
    expect(repo.insertWithNotifications).toHaveBeenCalledWith(
      { conn: true },
      expect.objectContaining({ fullName: 'Priya Kumar', email: 'priya@example.com', consentToContact: true }),
      ['email', 'whatsapp'],
    );
    expect(order).toEqual(['saved', 'notified']);
  });

  it('still returns success with failed status when notifications fail (enquiry kept)', async () => {
    repo.insertWithNotifications.mockResolvedValue(43);
    repo.findById.mockResolvedValue(makeEnquiry({ id: 43 }));
    notifications.dispatchForEnquiry.mockResolvedValue({ email: 'failed', whatsapp: 'failed' });

    const res = await request(app).post('/api/enquiries').send(validEnquiryBody);
    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({ enquiryId: 43, notifications: { email: 'failed', whatsapp: 'failed' } });
  });

  it('never reports success when the database save fails', async () => {
    repo.insertWithNotifications.mockRejectedValue(new Error('ER_LOCK_WAIT_TIMEOUT'));
    const res = await request(app).post('/api/enquiries').send(validEnquiryBody);
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(JSON.stringify(res.body)).not.toMatch(/ER_LOCK|stack/);
    expect(notifications.dispatchForEnquiry).not.toHaveBeenCalled();
  });

  it('returns 422 with field errors and saves nothing for invalid input', async () => {
    const res = await request(app).post('/api/enquiries').send({ ...validEnquiryBody, email: 'bad', consentToContact: false });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(Object.keys(res.body.error.details)).toEqual(expect.arrayContaining(['email', 'consentToContact']));
    expect(repo.insertWithNotifications).not.toHaveBeenCalled();
  });

  it('rejects bodies larger than the limit and malformed JSON', async () => {
    const big = await request(app).post('/api/enquiries').send({ ...validEnquiryBody, message: 'x'.repeat(30_000) });
    expect(big.status).toBe(413);
    const bad = await request(app).post('/api/enquiries').set('Content-Type', 'application/json').send('{"fullName":');
    expect(bad.status).toBe(400);
  });
});
