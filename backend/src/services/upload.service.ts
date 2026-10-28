import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { env } from '../config/env';

/**
 * Admin photo/video uploads.
 *
 * Security model:
 *  - The file type is decided from the file's MAGIC BYTES, never from the browser-supplied
 *    name or Content-Type. A renamed .exe/.html is rejected.
 *  - Only raster images (JPEG, PNG, WebP, GIF) and MP4/WebM video are accepted. SVG is
 *    deliberately excluded because it can carry scripts.
 *  - Stored names are random; the original name is kept only as metadata.
 *  - Files are served with `X-Content-Type-Options: nosniff` and a sandboxing CSP.
 */

export type MediaKind = 'image' | 'video';

export interface DetectedType {
  kind: MediaKind;
  mime: string;
  ext: string;
}

export class UploadError extends Error {
  constructor(message: string, public readonly status = 422) {
    super(message);
    this.name = 'UploadError';
  }
}

/** Identify a file from its first bytes. Returns null for anything not on the allowlist. */
export function detectFileType(head: Buffer): DetectedType | null {
  if (head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) {
    return { kind: 'image', mime: 'image/jpeg', ext: 'jpg' };
  }
  if (head.length >= 8 && head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { kind: 'image', mime: 'image/png', ext: 'png' };
  }
  if (head.length >= 6 && /^GIF8[79]a$/.test(head.subarray(0, 6).toString('latin1'))) {
    return { kind: 'image', mime: 'image/gif', ext: 'gif' };
  }
  if (head.length >= 12 && head.subarray(0, 4).toString('latin1') === 'RIFF' && head.subarray(8, 12).toString('latin1') === 'WEBP') {
    return { kind: 'image', mime: 'image/webp', ext: 'webp' };
  }
  if (head.length >= 12 && head.subarray(4, 8).toString('latin1') === 'ftyp') {
    // ISO base media: MP4 family. Exclude HEIC/AVIF still images which share the container.
    const brand = head.subarray(8, 12).toString('latin1');
    if (!/^(heic|heix|mif1|msf1|avif|avis)$/.test(brand)) {
      return { kind: 'video', mime: 'video/mp4', ext: 'mp4' };
    }
    return null;
  }
  if (head.length >= 4 && head.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) {
    return { kind: 'video', mime: 'video/webm', ext: 'webm' };
  }
  return null;
}

export function maxBytesFor(kind: MediaKind): number {
  return (kind === 'image' ? env.MAX_IMAGE_UPLOAD_MB : env.MAX_VIDEO_UPLOAD_MB) * 1024 * 1024;
}

/** Largest size multer should ever accept (the per-kind limit is applied after detection). */
export function absoluteMaxBytes(): number {
  return Math.max(maxBytesFor('image'), maxBytesFor('video'));
}

export function tempDir(): string {
  const dir = path.join(env.uploadDirAbsolute, '.tmp');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function readHead(filePath: string, bytes = 32): Promise<Buffer> {
  const fh = await fs.promises.open(filePath, 'r');
  try {
    const buf = Buffer.alloc(bytes);
    const { bytesRead } = await fh.read(buf, 0, bytes, 0);
    return buf.subarray(0, bytesRead);
  } finally {
    await fh.close();
  }
}

/** Cleans a user-supplied file name for display/metadata only. */
export function cleanOriginalName(name: string): string {
  // eslint-disable-next-line no-control-regex -- strip control characters from file names
  const base = path.basename(name || 'file').replace(/[\u0000-\u001f\u007f<>:"/\\|?*]+/g, '_').trim();
  return (base || 'file').slice(0, 255);
}

export interface StoredFile {
  kind: MediaKind;
  mime: string;
  storedPath: string; // public path: /uploads/YYYY/MM/<random>.<ext>
  sizeBytes: number;
}

/**
 * Validates a temp file written by multer and moves it into the public uploads folder.
 * The temp file is always removed on failure.
 */
export async function acceptUploadedFile(tempPath: string, sizeBytes: number): Promise<StoredFile> {
  try {
    const type = detectFileType(await readHead(tempPath));
    if (!type) {
      throw new UploadError('Unsupported file type. Upload a JPG, PNG, WebP or GIF image, or an MP4/WebM video.');
    }
    if (sizeBytes > maxBytesFor(type.kind)) {
      const mb = type.kind === 'image' ? env.MAX_IMAGE_UPLOAD_MB : env.MAX_VIDEO_UPLOAD_MB;
      throw new UploadError(`${type.kind === 'image' ? 'Images' : 'Videos'} must be ${mb} MB or smaller.`, 413);
    }
    const now = new Date();
    const sub = path.join(String(now.getUTCFullYear()), String(now.getUTCMonth() + 1).padStart(2, '0'));
    const dir = path.join(env.uploadDirAbsolute, sub);
    await fs.promises.mkdir(dir, { recursive: true });
    const name = `${crypto.randomBytes(16).toString('hex')}.${type.ext}`;
    await fs.promises.rename(tempPath, path.join(dir, name));
    return { kind: type.kind, mime: type.mime, sizeBytes, storedPath: `/uploads/${sub.split(path.sep).join('/')}/${name}` };
  } catch (err) {
    await fs.promises.unlink(tempPath).catch(() => undefined);
    throw err;
  }
}

/** Deletes a stored file given its public path. Refuses anything outside the uploads folder. */
export async function deleteStoredFile(storedPath: string): Promise<void> {
  if (!/^\/uploads\/\d{4}\/\d{2}\/[a-f0-9]{32}\.(jpg|png|gif|webp|mp4|webm)$/.test(storedPath)) return;
  const abs = path.join(env.uploadDirAbsolute, storedPath.replace(/^\/uploads\//, ''));
  if (!abs.startsWith(env.uploadDirAbsolute + path.sep)) return;
  await fs.promises.unlink(abs).catch((e: NodeJS.ErrnoException) => {
    if (e.code !== 'ENOENT') throw e;
  });
}
