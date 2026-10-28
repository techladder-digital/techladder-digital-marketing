/* Photo/video uploads: type detection by magic bytes, size limits, auth, safe serving. */
jest.mock('../src/repositories/admin.repository', () => ({ adminRepository: { findById: jest.fn() } }));
jest.mock('../src/repositories/audit.repository', () => ({ auditRepository: { insert: jest.fn() } }));
jest.mock('../src/repositories/media.repository', () => ({
  mediaRepository: {
    insert: jest.fn(async () => 7),
    findById: jest.fn(),
    list: jest.fn(async () => ({ items: [], total: 0 })),
    remove: jest.fn(async () => true),
    usages: jest.fn(async () => []),
  },
}));

import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { createApp } from '../src/app';
import { env } from '../src/config/env';
import { adminRepository } from '../src/repositories/admin.repository';
import { mediaRepository } from '../src/repositories/media.repository';
import { detectFileType } from '../src/services/upload.service';
import { portfolioSchema } from '../src/validators/portfolio.validator';
import { adminRow, signTestToken } from './helpers';

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(100)]);
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(100)]);
const MP4 = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypmp42'), Buffer.alloc(100)]);
const WEBM = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(100)]);

const app = createApp();
const auth = () => `Bearer ${signTestToken(1, 'admin')}`;

beforeEach(() => {
  (adminRepository.findById as jest.Mock).mockResolvedValue(adminRow(1, 'admin'));
  (mediaRepository.findById as jest.Mock).mockImplementation(async (id: number) => ({ id, url: storedUrl }));
});
afterAll(() => fs.rmSync(env.uploadDirAbsolute, { recursive: true, force: true }));

let storedUrl = '';
const listFiles = (dir: string): string[] =>
  fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? listFiles(path.join(dir, d.name)) : [path.join(dir, d.name)])) : [];

describe('file type detection (magic bytes)', () => {
  it.each([
    [PNG, 'image/png'],
    [JPG, 'image/jpeg'],
    [Buffer.from('GIF89a......'), 'image/gif'],
    [Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP')]), 'image/webp'],
    [MP4, 'video/mp4'],
    [WEBM, 'video/webm'],
  ])('recognises %#', (buf, mime) => {
    expect(detectFileType(buf)?.mime).toBe(mime);
  });

  it.each([
    ['HTML', Buffer.from('<html><script>alert(1)</script></html>')],
    ['SVG', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>')],
    ['EXE', Buffer.from('MZ\x90\x00\x03')],
    ['PDF', Buffer.from('%PDF-1.7')],
    ['HEIC still image', Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypheic')])],
  ])('rejects %s', (_n, buf) => {
    expect(detectFileType(buf)).toBeNull();
  });
});

describe('POST /api/admin/uploads', () => {
  it('requires an admin session', async () => {
    const res = await request(app).post('/api/admin/uploads').attach('file', PNG, 'a.png');
    expect(res.status).toBe(401);
  });

  it('stores a valid image under a random name and records it', async () => {
    const res = await request(app).post('/api/admin/uploads').set('Authorization', auth()).attach('file', PNG, 'My Photo.png');
    expect(res.status).toBe(201);
    const call = (mediaRepository.insert as jest.Mock).mock.calls[0][0];
    expect(call).toMatchObject({ kind: 'image', mimeType: 'image/png', originalName: 'My Photo.png', uploadedBy: 1 });
    expect(call.storedPath).toMatch(/^\/uploads\/\d{4}\/\d{2}\/[a-f0-9]{32}\.png$/);
    storedUrl = call.storedPath;
    expect(fs.existsSync(path.join(env.uploadDirAbsolute, storedUrl.replace('/uploads/', '')))).toBe(true);
  });

  it('accepts MP4 and WebM videos', async () => {
    for (const [buf, name, ext] of [[MP4, 'clip.mp4', 'mp4'], [WEBM, 'clip.webm', 'webm']] as const) {
      const res = await request(app).post('/api/admin/uploads').set('Authorization', auth()).attach('file', buf, name);
      expect(res.status).toBe(201);
      expect((mediaRepository.insert as jest.Mock).mock.calls.at(-1)[0].storedPath.endsWith(`.${ext}`)).toBe(true);
    }
  });

  it('rejects a disguised file regardless of its name and leaves nothing behind', async () => {
    const before = listFiles(env.uploadDirAbsolute).length;
    const res = await request(app)
      .post('/api/admin/uploads')
      .set('Authorization', auth())
      .attach('file', Buffer.from('<script>alert(1)</script>'), { filename: 'photo.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('UNSUPPORTED_FILE');
    expect(listFiles(env.uploadDirAbsolute).length).toBe(before);
    expect(mediaRepository.insert).not.toHaveBeenCalled();
  });

  it('enforces the image size limit', async () => {
    const big = Buffer.concat([PNG, Buffer.alloc(1.2 * 1024 * 1024)]);
    const res = await request(app).post('/api/admin/uploads').set('Authorization', auth()).attach('file', big, 'big.png');
    expect(res.status).toBe(413);
  });

  it('enforces the overall limit while streaming', async () => {
    const huge = Buffer.concat([MP4, Buffer.alloc(2.5 * 1024 * 1024)]);
    const res = await request(app).post('/api/admin/uploads').set('Authorization', auth()).attach('file', huge, 'huge.mp4');
    expect(res.status).toBe(413);
  });

  it('returns 400 when no file is sent', async () => {
    const res = await request(app).post('/api/admin/uploads').set('Authorization', auth()).field('x', '1');
    expect(res.status).toBe(400);
  });
});

describe('serving uploaded files', () => {
  it('serves stored files with nosniff and a sandbox CSP', async () => {
    const res = await request(app).get(storedUrl);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/png');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toContain('sandbox');
  });

  it.each(['/uploads/../.env', '/uploads/.tmp/x.part', '/uploads/2026/10/evil.html', '/uploads/2026/10/00000000000000000000000000000000.png'])(
    '404s for %s',
    async (url) => {
      const res = await request(app).get(url);
      expect(res.status).toBe(404);
    },
  );

  it('deletes the file from disk when removed from the media library', async () => {
    const res = await request(app).delete('/api/admin/media/7').set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(fs.existsSync(path.join(env.uploadDirAbsolute, storedUrl.replace('/uploads/', '')))).toBe(false);
  });
});

describe('portfolio accepts uploaded media', () => {
  const base = { title: 'Reel', category: 'ai_ad_videos', description: 'An AI advertisement video sample.' };
  it('accepts uploaded image + video paths', () => {
    const r = portfolioSchema.safeParse({
      ...base,
      thumbnailUrl: '/uploads/2026/10/0123456789abcdef0123456789abcdef.jpg',
      videoUrl: '/uploads/2026/10/0123456789abcdef0123456789abcdef.mp4',
    });
    expect(r.success).toBe(true);
  });
  it.each(['/uploads/../../etc/passwd', 'javascript:alert(1)', 'http://x.com/a.mp4', '/uploads/2026/10/x.html'])('rejects video %p', (videoUrl) => {
    expect(portfolioSchema.safeParse({ ...base, videoUrl }).success).toBe(false);
  });
});
