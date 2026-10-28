/* Rate limiting on public submissions (enabled explicitly for this test). */
process.env.RATE_LIMIT_IN_TESTS = '1';
jest.mock('../src/services/enquiry.service', () => ({
  enquiryService: { submit: jest.fn(async () => ({ enquiryId: 1, notifications: { email: 'skipped', whatsapp: 'skipped' } })) },
}));
import request from 'supertest';
import { createApp } from '../src/app';
import { validEnquiryBody } from './helpers';

afterAll(() => {
  delete process.env.RATE_LIMIT_IN_TESTS;
});

it('limits enquiry submissions per client to 5 per 10 minutes', async () => {
  const app = createApp();
  const statuses: number[] = [];
  for (let i = 0; i < 6; i++) statuses.push((await request(app).post('/api/enquiries').send(validEnquiryBody)).status);
  expect(statuses.slice(0, 5)).toEqual([201, 201, 201, 201, 201]);
  expect(statuses[5]).toBe(429);
});
