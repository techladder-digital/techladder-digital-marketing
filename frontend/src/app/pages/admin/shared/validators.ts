import { AbstractControl, ValidationErrors } from '@angular/forms';

function isUrl(v: string, httpsOnly: boolean): boolean {
  try {
    const u = new URL(v);
    return httpsOnly ? u.protocol === 'https:' : u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

/** Optional http(s) URL. */
export function httpUrlValidator(c: AbstractControl): ValidationErrors | null {
  const v = String(c.value ?? '').trim();
  return !v || isUrl(v, false) ? null : { url: true };
}

/** Optional https URL. */
export function httpsUrlValidator(c: AbstractControl): ValidationErrors | null {
  const v = String(c.value ?? '').trim();
  return !v || isUrl(v, true) ? null : { url: true };
}

const UPLOADED_IMAGE = /^\/uploads\/\d{4}\/\d{2}\/[a-f0-9]{32}\.(jpg|png|gif|webp)$/;
const UPLOADED_VIDEO = /^\/uploads\/\d{4}\/\d{2}\/[a-f0-9]{32}\.(mp4|webm)$/;

/** Optional image: uploaded file, https URL or /assets/... image path (mirrors the backend rule). */
export function imageSourceValidator(c: AbstractControl): ValidationErrors | null {
  const v = String(c.value ?? '').trim();
  if (!v) return null;
  if (isUrl(v, true) || UPLOADED_IMAGE.test(v)) return null;
  return /^\/assets\/[A-Za-z0-9/_\-.]+\.(png|jpe?g|webp|gif|svg|avif)$/i.test(v) && !v.includes('..') ? null : { imageSource: true };
}

/** Optional video: uploaded MP4/WebM or an https:// link to an .mp4/.webm file. */
export function videoSourceValidator(c: AbstractControl): ValidationErrors | null {
  const v = String(c.value ?? '').trim();
  if (!v || UPLOADED_VIDEO.test(v)) return null;
  return isUrl(v, true) && /\.(mp4|webm)(\?.*)?$/i.test(v) ? null : { videoSource: true };
}
