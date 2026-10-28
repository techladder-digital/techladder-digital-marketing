import crypto from 'node:crypto';
jest.mock('../src/repositories/notification.repository', () => ({
  notificationRepository: { applyProviderStatus: jest.fn() },
}));
import request from 'supertest';
import { createApp } from '../src/app';
import { env } from '../src/config/env';
import { notificationRepository } from '../src/repositories/notification.repository';

const original = { ...env };
beforeEach(() => Object.assign(env, { WHATSAPP_APP_SECRET: 'app-secret', WHATSAPP_WEBHOOK_VERIFY_TOKEN: 'verify-me' }));
afterEach(() => Object.assign(env, original));

const payload = {
  entry: [{ changes: [{ value: { statuses: [
    { id: 'wamid.1', status: 'delivered' },
    { id: 'wamid.2', status: 'failed', errors: [{ code: 131026, title: 'Message undeliverable' }] },
  ] } }] }],
};

function sign(body: string) {
  return 'sha256=' + crypto.createHmac('sha256', 'app-secret').update(body).digest('hex');
}

describe('WhatsApp webhook', () => {
  const app = createApp();

  it('answers the verification challenge only with the correct token', async () => {
    const ok = await request(app).get('/api/webhooks/whatsapp').query({ 'hub.mode': 'subscribe', 'hub.verify_token': 'verify-me', 'hub.challenge': 'abc123' });
    expect(ok.status).toBe(200);
    expect(ok.text).toBe('abc123');
    const bad = await request(app).get('/api/webhooks/whatsapp').query({ 'hub.mode': 'subscribe', 'hub.verify_token': 'nope', 'hub.challenge': 'abc123' });
    expect(bad.status).toBe(403);
  });

  it('rejects status updates with a missing or invalid signature', async () => {
    const body = JSON.stringify(payload);
    const res = await request(app).post('/api/webhooks/whatsapp').set('Content-Type', 'application/json').set('X-Hub-Signature-256', 'sha256=deadbeef').send(body);
    expect(res.status).toBe(401);
    expect(notificationRepository.applyProviderStatus).not.toHaveBeenCalled();
  });

  it('applies delivery statuses from a correctly signed payload', async () => {
    const body = JSON.stringify(payload);
    const res = await request(app).post('/api/webhooks/whatsapp').set('Content-Type', 'application/json').set('X-Hub-Signature-256', sign(body)).send(body);
    expect(res.status).toBe(200);
    expect(notificationRepository.applyProviderStatus).toHaveBeenCalledWith('wamid.1', 'delivered', null);
    expect(notificationRepository.applyProviderStatus).toHaveBeenCalledWith('wamid.2', 'failed', 'code 131026: Message undeliverable');
  });
});
