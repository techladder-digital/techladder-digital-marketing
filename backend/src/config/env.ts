import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

if (process.env.NODE_ENV !== 'test') {
  dotenv.config({ path: path.resolve(process.cwd(), '.env'), quiet: true });
}

/** Values copied from .env.example that were never filled in are treated as "not set". */
export function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  const v = value.trim().toLowerCase();
  return v === '' || v === 'replace_me' || v.startsWith('your_') || v.startsWith('replace_me');
}

const optional = z
  .string()
  .optional()
  .transform((v) => (isPlaceholder(v) ? undefined : v!.trim()));

const bool = (def: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === '' ? def : ['1', 'true', 'yes'].includes(v.toLowerCase())));

const int = (def: number, min = 0, max = Number.MAX_SAFE_INTEGER) =>
  z.coerce.number().int().min(min).max(max).default(def);

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: int(3000, 1, 65535),
  FRONTEND_URL: z.string().min(1).default('http://localhost:4200'),
  TRUST_PROXY: int(0, 0, 10),

  DB_HOST: z.string().min(1),
  DB_PORT: int(3306, 1, 65535),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().regex(/^[A-Za-z0-9_]+$/, 'DB_NAME may only contain letters, digits and underscores'),
  DB_CONNECTION_LIMIT: int(10, 1, 100),
  DB_SSL: bool(false),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN_MINUTES: int(30, 5, 24 * 60),

  SMTP_HOST: optional,
  SMTP_PORT: int(587, 1, 65535),
  SMTP_SECURE: bool(false),
  SMTP_USER: optional,
  SMTP_PASSWORD: optional,
  EMAIL_FROM: optional,
  BUSINESS_EMAIL: optional,

  WHATSAPP_ACCESS_TOKEN: optional,
  WHATSAPP_PHONE_NUMBER_ID: optional,
  WHATSAPP_BUSINESS_RECIPIENT: optional,
  WHATSAPP_API_VERSION: z.string().regex(/^v\d+\.\d+$/).default('v21.0'),
  WHATSAPP_TEMPLATE_NAME: optional,
  WHATSAPP_TEMPLATE_LANGUAGE: z.string().default('en'),
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: optional,
  WHATSAPP_APP_SECRET: optional,

  YOUTUBE_API_KEY: optional,
  META_GRAPH_ACCESS_TOKEN: optional,
  META_GRAPH_API_VERSION: z.string().regex(/^v\d+\.\d+$/).default('v21.0'),
  SOCIAL_SYNC_INTERVAL_MINUTES: int(360, 0, 7 * 24 * 60),

  UPLOAD_DIR: z.string().min(1).default('uploads'),
  MAX_IMAGE_UPLOAD_MB: int(5, 1, 50),
  MAX_VIDEO_UPLOAD_MB: int(100, 1, 1024),

  NOTIFICATION_RETRY_INTERVAL_SECONDS: int(120, 0, 86400),
  NOTIFICATION_MAX_ATTEMPTS: int(5, 1, 20),
});

export type Env = z.infer<typeof schema> & {
  corsOrigins: string[];
  uploadDirAbsolute: string;
  isProduction: boolean;
  emailEnabled: boolean;
  whatsappEnabled: boolean;
};

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  const e = parsed.data;

  if (e.NODE_ENV === 'production') {
    if (isPlaceholder(e.JWT_SECRET) || /replace_me/i.test(e.JWT_SECRET)) {
      throw new Error('Invalid environment configuration:\n  - JWT_SECRET: placeholder value is not allowed in production');
    }
    if (!e.DB_PASSWORD || isPlaceholder(e.DB_PASSWORD)) {
      throw new Error('Invalid environment configuration:\n  - DB_PASSWORD: a real password is required in production');
    }
  }

  const corsOrigins = e.FRONTEND_URL.split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean);
  for (const origin of corsOrigins) {
    try {
      const u = new URL(origin);
      if (!['http:', 'https:'].includes(u.protocol)) throw new Error();
    } catch {
      throw new Error(`Invalid environment configuration:\n  - FRONTEND_URL: "${origin}" is not a valid origin`);
    }
  }

  return {
    ...e,
    corsOrigins,
    uploadDirAbsolute: path.resolve(process.cwd(), e.UPLOAD_DIR),
    isProduction: e.NODE_ENV === 'production',
    emailEnabled: Boolean(e.SMTP_HOST && e.BUSINESS_EMAIL),
    whatsappEnabled: Boolean(
      e.WHATSAPP_ACCESS_TOKEN && e.WHATSAPP_PHONE_NUMBER_ID && e.WHATSAPP_BUSINESS_RECIPIENT && e.WHATSAPP_TEMPLATE_NAME,
    ),
  };
}

export const env: Env = loadEnv();
