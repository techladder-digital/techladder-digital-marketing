/* Admin authentication: login, lockout, token validation, logout revocation, unauthorized access. */
jest.mock('../src/repositories/admin.repository', () => ({
  adminRepository: {
    findByEmail: jest.fn(), findById: jest.fn(), recordFailedLogin: jest.fn(),
    recordSuccessfulLogin: jest.fn(), bumpTokenVersion: jest.fn(),
  },
}));
jest.mock('../src/repositories/audit.repository', () => ({ auditRepository: { insert: jest.fn(), listRecent: jest.fn() } }));
jest.mock('../src/repositories/enquiry.repository', () => ({
  enquiryRepository: { list: jest.fn(async () => ({ items: [], total: 0 })), counts: jest.fn() },
}));

import bcrypt from 'bcryptjs';
import request from 'supertest';
import { createApp } from '../src/app';
import { adminRepository } from '../src/repositories/admin.repository';
import { adminRow, signTestToken } from './helpers';

const repo = adminRepository as jest.Mocked<typeof adminRepository>;
const PASSWORD = 'CorrectHorse9Battery';
let hash: string;

beforeAll(async () => {
  hash = await bcrypt.hash(PASSWORD, 4);
});

describe('admin login', () => {
  const app = createApp();

  it('issues a short-lived token for valid credentials', async () => {
    repo.findByEmail.mockResolvedValue({ ...adminRow(1, 'admin'), password_hash: hash });
    const res = await request(app).post('/api/auth/login').send({ email: 'ADMIN@example.com', password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.admin).toEqual({ id: 1, name: 'Admin User', email: 'admin@example.com', role: 'admin' });
    expect(JSON.stringify(res.body)).not.toContain('password');
    expect(res.headers['cache-control']).toBe('no-store');
    expect(repo.findByEmail).toHaveBeenCalledWith('admin@example.com');
    expect(repo.recordSuccessfulLogin).toHaveBeenCalledWith(1);
  });

  it('returns the same generic error for unknown email and wrong password', async () => {
    repo.findByEmail.mockResolvedValueOnce(null);
    const unknown = await request(app).post('/api/auth/login').send({ email: 'nobody@example.com', password: 'whatever' });
    repo.findByEmail.mockResolvedValue({ ...adminRow(1, 'admin'), password_hash: hash });
    const wrong = await request(app).post('/api/auth/login').send({ email: 'admin@example.com', password: 'wrong-password' });
    expect(unknown.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(unknown.body.error.message).toBe(wrong.body.error.message);
    expect(repo.recordFailedLogin).toHaveBeenCalledWith(1, null);
  });

  it('locks the account after repeated failures', async () => {
    repo.findByEmail.mockResolvedValueOnce({ ...adminRow(1, 'admin'), password_hash: hash, failed_login_count: 4 });
    await request(app).post('/api/auth/login').send({ email: 'admin@example.com', password: 'wrong' });
    expect(repo.recordFailedLogin).toHaveBeenCalledWith(1, expect.any(Date));

    repo.findByEmail.mockResolvedValueOnce({ ...adminRow(1, 'admin'), password_hash: hash, locked_until: new Date(Date.now() + 60_000) });
    const locked = await request(app).post('/api/auth/login').send({ email: 'admin@example.com', password: PASSWORD });
    expect(locked.status).toBe(423);
  });

  it('refuses deactivated accounts', async () => {
    repo.findByEmail.mockResolvedValueOnce({ ...adminRow(1, 'admin'), password_hash: hash, is_active: 0 });
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@example.com', password: PASSWORD });
    expect(res.status).toBe(401);
  });

  it('validates the login body', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'x', password: '' });
    expect(res.status).toBe(422);
  });
});

describe('admin session tokens', () => {
  const app = createApp();

  it('accepts a valid token', async () => {
    repo.findById.mockResolvedValue(adminRow(1, 'admin'));
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${signTestToken(1, 'admin')}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('admin@example.com');
  });

  it.each([
    ['expired', () => signTestToken(1, 'admin', 0, { expiresIn: -10 })],
    ['wrong audience', () => signTestToken(1, 'admin', 0, { audience: 'someone-else' })],
    ['tampered', () => signTestToken(1, 'admin').slice(0, -3) + 'abc'],
    ['revoked by logout (old token_version)', () => signTestToken(1, 'admin', 0)],
  ])('rejects %s tokens', async (name, makeToken) => {
    repo.findById.mockResolvedValue(adminRow(1, 'admin', name.startsWith('revoked') ? { token_version: 1 } : {}));
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(401);
  });

  it('logout revokes every token for that admin', async () => {
    repo.findById.mockResolvedValue(adminRow(1, 'admin'));
    const res = await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${signTestToken(1, 'admin')}`);
    expect(res.status).toBe(200);
    expect(repo.bumpTokenVersion).toHaveBeenCalledWith(1);
  });
});

describe('unauthorized admin API access', () => {
  const app = createApp();
  const endpoints: [string, string][] = [
    ['get', '/api/admin/dashboard'],
    ['get', '/api/admin/enquiries'],
    ['get', '/api/admin/enquiries/1'],
    ['patch', '/api/admin/enquiries/1/status'],
    ['get', '/api/admin/feedback'],
    ['patch', '/api/admin/feedback/1/moderation'],
    ['post', '/api/admin/portfolio'],
    ['put', '/api/admin/portfolio/1'],
    ['delete', '/api/admin/portfolio/1'],
    ['post', '/api/admin/services'],
    ['put', '/api/admin/services/1'],
    ['delete', '/api/admin/services/1'],
    ['put', '/api/admin/social-links/1'],
    ['put', '/api/admin/settings'],
    ['get', '/api/admin/integrations'],
  ];

  it.each(endpoints)('%s %s returns 401 without a token', async (method, url) => {
    const res = await (request(app) as unknown as Record<string, (u: string) => request.Test>)[method](url).send({});
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects a non-Bearer authorization header', async () => {
    const res = await request(app).get('/api/admin/dashboard').set('Authorization', 'Basic YWRtaW46YWRtaW4=');
    expect(res.status).toBe(401);
  });

  it('forbids editors from reading private enquiries or changing settings', async () => {
    repo.findById.mockResolvedValue(adminRow(2, 'editor'));
    const token = signTestToken(2, 'editor');
    const enquiries = await request(app).get('/api/admin/enquiries').set('Authorization', `Bearer ${token}`);
    const settings = await request(app).put('/api/admin/settings').set('Authorization', `Bearer ${token}`).send({ footer_text: 'x' });
    expect(enquiries.status).toBe(403);
    expect(settings.status).toBe(403);
  });

  it('allows admins to list enquiries with pagination metadata', async () => {
    repo.findById.mockResolvedValue(adminRow(1, 'admin'));
    const res = await request(app).get('/api/admin/enquiries?page=2&pageSize=10&status=new').set('Authorization', `Bearer ${signTestToken(1, 'admin')}`);
    expect(res.status).toBe(200);
    expect(res.body.meta).toEqual({ page: 2, pageSize: 10, total: 0, totalPages: 1 });
  });
});
