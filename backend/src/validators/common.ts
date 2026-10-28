import { z } from 'zod';

// Disallow ASCII control characters (except tab/newline/CR) in free text.
// eslint-disable-next-line no-control-regex -- intentionally matching control characters
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

export const text = (min: number, max: number, label: string) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(min, min <= 1 ? `${label} is required` : `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`)
    .refine((v) => !CONTROL_CHARS.test(v), `${label} contains invalid characters`);

/** Optional text: empty string / null / undefined → null. */
export const optionalText = (max: number, label: string) =>
  z
    .string()
    .nullish()
    .transform((v) => (typeof v === 'string' ? v.trim() : ''))
    .refine((v) => v.length <= max, `${label} must be at most ${max} characters`)
    .refine((v) => !CONTROL_CHARS.test(v), `${label} contains invalid characters`)
    .transform((v) => (v === '' ? null : v));

export const email = z
  .string({ error: 'Email address is required' })
  .trim()
  .toLowerCase()
  .max(190, 'Email address is too long')
  .pipe(z.email('Enter a valid email address'));

/** International-style phone: optional +, digits, spaces, dashes, parentheses; 7–15 digits. */
export const phone = z
  .string({ error: 'Phone number is required' })
  .trim()
  .max(32, 'Phone number is too long')
  .regex(/^\+?[0-9\s\-()]{7,25}$/, 'Enter a valid phone number')
  .refine((v) => {
    const digits = v.replace(/\D/g, '').length;
    return digits >= 7 && digits <= 15;
  }, 'Enter a valid phone number');

function isHttpUrl(v: string): boolean {
  try {
    const u = new URL(v);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

/** Optional external link (http/https only). Empty → null. */
export const optionalHttpUrl = (label: string) =>
  z
    .string()
    .nullish()
    .transform((v) => (typeof v === 'string' ? v.trim() : ''))
    .refine((v) => v === '' || (v.length <= 500 && isHttpUrl(v)), `${label} must be a valid http(s) URL`)
    .transform((v) => (v === '' ? null : v));

/** Files created by the upload endpoint: /uploads/YYYY/MM/<32 hex>.<ext> */
export const UPLOADED_IMAGE = /^\/uploads\/\d{4}\/\d{2}\/[a-f0-9]{32}\.(jpg|png|gif|webp)$/;
export const UPLOADED_VIDEO = /^\/uploads\/\d{4}\/\d{2}\/[a-f0-9]{32}\.(mp4|webm)$/;

/** Optional video: an uploaded MP4/WebM or an https:// link to an .mp4/.webm file. */
export const optionalVideoSource = (label: string) =>
  z
    .string()
    .nullish()
    .transform((v) => (typeof v === 'string' ? v.trim() : ''))
    .refine(
      (v) => v === '' || UPLOADED_VIDEO.test(v) || (v.length <= 500 && isHttpUrl(v) && v.startsWith('https://') && /\.(mp4|webm)(\?.*)?$/i.test(v)),
      `${label} must be an uploaded MP4/WebM video or an https:// link to an .mp4/.webm file`,
    )
    .transform((v) => (v === '' ? null : v));

/**
 * Optional image source: an https URL or a site-relative asset path under /assets/.
 * Rejects javascript:, data:, protocol-relative and path-traversal values.
 */
export const optionalImageSource = (label: string) =>
  z
    .string()
    .nullish()
    .transform((v) => (typeof v === 'string' ? v.trim() : ''))
    .refine(
      (v) =>
        v === '' ||
        (v.length <= 500 &&
          ((isHttpUrl(v) && v.startsWith('https://')) ||
            (/^\/assets\/[A-Za-z0-9/_\-.]+\.(png|jpe?g|webp|gif|svg|avif)$/i.test(v) && !v.includes('..')) ||
            UPLOADED_IMAGE.test(v))),
      `${label} must be an uploaded image, an https:// image URL or a path under /assets/`,
    )
    .transform((v) => (v === '' ? null : v));

export const idParam = z.object({
  id: z.coerce.number().int().positive('Invalid id'),
});

export const pagination = {
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
};

/** Strict boolean coming from JSON (true/false) or a form (1/0). */
export const boolish = z.union([z.boolean(), z.literal(1), z.literal(0)]).transform((v) => v === true || v === 1);
