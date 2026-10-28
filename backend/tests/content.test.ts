/* Feedback moderation, public portfolio filtering, social link configuration, settings allowlist. */
jest.mock('../src/repositories/admin.repository', () => ({ adminRepository: { findById: jest.fn() } }));
jest.mock('../src/repositories/audit.repository', () => ({ auditRepository: { insert: jest.fn() } }));
jest.mock('../src/repositories/feedback.repository', () => ({
  feedbackRepository: { insert: jest.fn(), listPublic: jest.fn(), findById: jest.fn(), setModeration: jest.fn(), list: jest.fn() },
}));
jest.mock('../src/repositories/portfolio.repository', () => ({
  portfolioRepository: { listPublished: jest.fn(), findPublishedById: jest.fn() },
}));
jest.mock('../src/repositories/social.repository', () => ({
  socialRepository: { listAll: jest.fn(), findById: jest.fn(), update: jest.fn(), recordApiCount: jest.fn(), recordSyncError: jest.fn() },
}));
jest.mock('../src/repositories/settings.repository', () => ({ settingsRepository: { getMany: jest.fn(), upsert: jest.fn() } }));
jest.mock('../src/config/database', () => ({
  withTransaction: jest.fn(async (fn: (c: unknown) => unknown) => fn({})),
  pingDatabase: jest.fn(),
}));

import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { createApp } from '../src/app';
import { adminRepository } from '../src/repositories/admin.repository';
import { feedbackRepository } from '../src/repositories/feedback.repository';
import { portfolioRepository } from '../src/repositories/portfolio.repository';
import { settingsRepository } from '../src/repositories/settings.repository';
import { socialRepository } from '../src/repositories/social.repository';
import { fetchFollowerCount, socialSyncService } from '../src/services/social-sync.service';
import { SocialLink } from '../src/types/models';
import { adminRow, signTestToken } from './helpers';

const app = createApp();
const auth = () => `Bearer ${signTestToken(1, 'admin')}`;
beforeEach(() => (adminRepository.findById as jest.Mock).mockResolvedValue(adminRow(1, 'admin')));

const feedback = (over: Record<string, unknown> = {}) => ({
  id: 5, customerName: 'Asha', businessName: null, serviceCategory: 'digital_marketing', projectName: 'Reels',
  rating: 5, feedbackMessage: 'Helpful and responsive team.', consentToPublish: true, moderationStatus: 'pending',
  createdAt: new Date(), updatedAt: new Date(), ...over,
});

describe('feedback submission and moderation', () => {
  it('stores new feedback as pending — never auto-published', async () => {
    (feedbackRepository.insert as jest.Mock).mockResolvedValue(9);
    const res = await request(app).post('/api/feedback').send({
      customerName: 'Asha', serviceCategory: 'digital_marketing', projectName: 'Reels', rating: 5,
      feedbackMessage: 'Helpful and responsive team.', consentToPublish: true,
    });
    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({ id: 9, moderationStatus: 'pending' });
  });

  it.each([0, 6, 3.5, 'five'])('rejects rating %p', async (rating) => {
    const res = await request(app).post('/api/feedback').send({
      customerName: 'Asha', serviceCategory: 'digital_marketing', projectName: 'Reels', rating, feedbackMessage: 'Helpful and responsive team.',
    });
    expect(res.status).toBe(422);
    expect(res.body.error.details.rating).toBeDefined();
  });

  it('public endpoint returns only publishable fields', async () => {
    (feedbackRepository.listPublic as jest.Mock).mockResolvedValue([feedback({ moderationStatus: 'approved' })]);
    const res = await request(app).get('/api/feedback/public');
    expect(res.status).toBe(200);
    expect(Object.keys(res.body.data[0]).sort()).toEqual(
      ['businessName', 'createdAt', 'customerName', 'feedbackMessage', 'id', 'projectName', 'rating', 'serviceCategory'].sort(),
    );
  });

  it('admins can approve consented feedback and reject any feedback', async () => {
    (feedbackRepository.findById as jest.Mock).mockResolvedValue(feedback());
    const approve = await request(app).patch('/api/admin/feedback/5/moderation').set('Authorization', auth()).send({ status: 'approved' });
    expect(approve.status).toBe(200);
    expect(feedbackRepository.setModeration).toHaveBeenCalledWith(5, 'approved');
    const reject = await request(app).patch('/api/admin/feedback/5/moderation').set('Authorization', auth()).send({ status: 'rejected' });
    expect(reject.status).toBe(200);
  });

  it('refuses to approve feedback without publication consent', async () => {
    (feedbackRepository.findById as jest.Mock).mockResolvedValue(feedback({ consentToPublish: false }));
    const res = await request(app).patch('/api/admin/feedback/5/moderation').set('Authorization', auth()).send({ status: 'approved' });
    expect(res.status).toBe(400);
    expect(feedbackRepository.setModeration).not.toHaveBeenCalled();
  });

  it('rejects unknown moderation statuses', async () => {
    const res = await request(app).patch('/api/admin/feedback/5/moderation').set('Authorization', auth()).send({ status: 'published' });
    expect(res.status).toBe(422);
  });
});

describe('public portfolio filtering', () => {
  it('passes validated category / featured filters to the published-only query', async () => {
    (portfolioRepository.listPublished as jest.Mock).mockResolvedValue([]);
    const res = await request(app).get('/api/portfolio?category=ai_ad_videos&featured=true');
    expect(res.status).toBe(200);
    expect(portfolioRepository.listPublished).toHaveBeenCalledWith({ category: 'ai_ad_videos', featured: true, limit: 60 });
  });

  it('rejects unknown categories', async () => {
    const res = await request(app).get('/api/portfolio?category=secret_drafts');
    expect(res.status).toBe(422);
  });

  it('returns 404 for unpublished or missing projects', async () => {
    (portfolioRepository.findPublishedById as jest.Mock).mockResolvedValue(null);
    expect((await request(app).get('/api/portfolio/7')).status).toBe(404);
    expect((await request(app).get('/api/portfolio/abc')).status).toBe(422);
  });

  it('the repository always restricts public queries to published rows', () => {
    const src = fs.readFileSync(path.join(__dirname, '../src/repositories/portfolio.repository.ts'), 'utf8');
    expect(src).toMatch(/const where = \['is_published = 1'\]/);
    expect(src).toMatch(/WHERE id = \? AND is_published = 1/);
  });
});

describe('social link configuration', () => {
  const link = (over: Partial<SocialLink> = {}): SocialLink => ({
    id: 1, platform: 'instagram', profileName: '@techladder', profileUrl: 'https://instagram.com/techladder',
    followerCount: 1500, countType: 'manual', apiAccountId: null, lastCountUpdate: new Date('2026-01-01'),
    lastSyncError: null, isEnabled: true, showFollowerCount: true, displayOrder: 1, createdAt: new Date(), updatedAt: new Date(), ...over,
  });
  const body = (over: Record<string, unknown> = {}) => ({
    profileName: '@techladder', profileUrl: 'https://instagram.com/techladder', followerCount: 1600,
    countType: 'manual', apiAccountId: null, isEnabled: true, showFollowerCount: true, ...over,
  });

  it('public view hides disabled platforms and counts the admin chose to hide', () => {
    const out = socialSyncService.toPublic([
      link(),
      link({ id: 2, platform: 'facebook', isEnabled: false }),
      link({ id: 3, platform: 'youtube', showFollowerCount: false }),
      link({ id: 4, platform: 'linkedin', profileUrl: null }),
    ]);
    expect(out.map((l) => l.platform)).toEqual(['instagram', 'youtube']);
    expect(out[0]).toMatchObject({ followerCount: 1500, countSource: 'manual' });
    expect(out[1]).toMatchObject({ followerCount: null, countSource: null });
  });

  it('updates a manual count and stamps the update time', async () => {
    (socialRepository.findById as jest.Mock).mockResolvedValue(link());
    const res = await request(app).put('/api/admin/social-links/1').set('Authorization', auth()).send(body());
    expect(res.status).toBe(200);
    expect(socialRepository.update).toHaveBeenCalledWith(1, expect.objectContaining({ followerCount: 1600, countType: 'manual' }), true);
  });

  it('never lets an admin type a figure and label it as API-verified', async () => {
    (socialRepository.findById as jest.Mock).mockResolvedValue(link({ platform: 'youtube', followerCount: 900 }));
    await request(app).put('/api/admin/social-links/1').set('Authorization', auth())
      .send(body({ countType: 'api', apiAccountId: 'UC123', followerCount: 999999 }));
    expect(socialRepository.update).toHaveBeenCalledWith(1, expect.objectContaining({ followerCount: 900, countType: 'api' }), false);
  });

  it('refuses API counts for platforms without an official integration', async () => {
    (socialRepository.findById as jest.Mock).mockResolvedValue(link({ platform: 'linkedin' }));
    const res = await request(app).put('/api/admin/social-links/1').set('Authorization', auth()).send(body({ countType: 'api', apiAccountId: 'x' }));
    expect(res.status).toBe(400);
  });

  it.each([
    [{ profileUrl: 'javascript:alert(1)' }, 'profileUrl'],
    [{ profileUrl: 'http://insecure.example.com' }, 'profileUrl'],
    [{ profileUrl: null, isEnabled: true }, 'profileUrl'],
    [{ followerCount: -5 }, 'followerCount'],
  ])('validates %p', async (over, field) => {
    const res = await request(app).put('/api/admin/social-links/1').set('Authorization', auth()).send(body(over));
    expect(res.status).toBe(422);
    expect(res.body.error.details[field]).toBeDefined();
  });

  it('API sync failures keep the last known figure and record the error', async () => {
    (socialRepository.listAll as jest.Mock).mockResolvedValue([link({ platform: 'youtube', countType: 'api', apiAccountId: 'UC1' })]);
    const results = await socialSyncService.syncAll(jest.fn() as never);
    expect(results[0]).toMatchObject({ platform: 'youtube', ok: false });
    expect(socialRepository.recordApiCount).not.toHaveBeenCalled();
    expect(socialRepository.recordSyncError).toHaveBeenCalled();
  });

  it('reads YouTube subscriber counts from the official Data API', async () => {
    const { env } = await import('../src/config/env');
    const prev = env.YOUTUBE_API_KEY;
    Object.assign(env, { YOUTUBE_API_KEY: 'yt-key' });
    const f = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({ items: [{ statistics: { subscriberCount: '2500' } }] }) }));
    await expect(fetchFollowerCount(link({ platform: 'youtube', apiAccountId: 'UC1' }), f as never)).resolves.toBe(2500);
    expect((f.mock.calls[0] as unknown as [string])[0]).toContain('https://www.googleapis.com/youtube/v3/channels');
    Object.assign(env, { YOUTUBE_API_KEY: prev });
  });
});

describe('site settings', () => {
  it('public endpoint returns only allowlisted keys', async () => {
    (settingsRepository.getMany as jest.Mock).mockResolvedValue({ company_name: 'TechLadder' });
    await request(app).get('/api/settings/public');
    const keys = (settingsRepository.getMany as jest.Mock).mock.calls[0][0] as string[];
    expect(keys).toContain('business_email');
    expect(keys.some((k) => /smtp|token|secret|password/i.test(k))).toBe(false);
  });

  it('admin update writes only the supplied, allowlisted keys', async () => {
    (settingsRepository.getMany as jest.Mock).mockResolvedValue({});
    const res = await request(app).put('/api/admin/settings').set('Authorization', auth()).send({ whatsapp_number: '+91 98765 43210' });
    expect(res.status).toBe(200);
    expect(settingsRepository.upsert).toHaveBeenCalledTimes(1);
    expect(settingsRepository.upsert).toHaveBeenCalledWith({}, 'whatsapp_number', '919876543210');
  });

  it('rejects unknown keys such as secrets', async () => {
    const res = await request(app).put('/api/admin/settings').set('Authorization', auth()).send({ smtp_password: 'x' });
    expect(res.status).toBe(422);
    expect(settingsRepository.upsert).not.toHaveBeenCalled();
  });

  it('rejects unsafe image and map URLs', async () => {
    const res = await request(app).put('/api/admin/settings').set('Authorization', auth())
      .send({ hero_image_url: 'javascript:alert(1)', google_maps_url: 'data:text/html,hi' });
    expect(res.status).toBe(422);
    expect(Object.keys(res.body.error.details).sort()).toEqual(['google_maps_url', 'hero_image_url']);
  });
});
