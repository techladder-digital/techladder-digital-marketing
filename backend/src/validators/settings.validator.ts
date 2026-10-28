import { z } from 'zod';
import { optionalHttpUrl, optionalImageSource, optionalText } from './common';

/**
 * Explicit allowlist of settings that administrators may edit.
 * Secrets (SMTP, WhatsApp, DB, JWT) are NEVER stored in site_settings — they live in .env only.
 */
export const settingsSchema = z
  .object({
    company_name: optionalText(120, 'Company name'),
    hero_headline: optionalText(160, 'Hero headline'),
    hero_subheading: optionalText(300, 'Hero subheading'),
    hero_image_url: optionalImageSource('Hero image'),
    logo_url: optionalImageSource('Logo'),
    company_intro: optionalText(1500, 'Company introduction'),
    business_email: z
      .string()
      .nullable()
      .transform((v) => (v ?? '').trim().toLowerCase())
      .refine((v) => v === '' || z.email().safeParse(v).success, 'Enter a valid business email')
      .transform((v) => (v === '' ? null : v)),
    whatsapp_number: z
      .string()
      .nullable()
      .transform((v) => (v ?? '').replace(/[\s\-()+]/g, ''))
      .refine((v) => v === '' || /^\d{8,15}$/.test(v), 'WhatsApp number must be in international format, digits only (e.g. 919876543210)')
      .transform((v) => (v === '' ? null : v)),
    business_phone: z
      .string()
      .nullable()
      .transform((v) => (v ?? '').trim())
      .refine((v) => v === '' || /^\+?[0-9\s\-()]{7,25}$/.test(v), 'Enter a valid phone number')
      .transform((v) => (v === '' ? null : v)),
    business_address: optionalText(400, 'Business address'),
    google_maps_url: optionalHttpUrl('Google Maps URL').refine(
      (v) => v === null || v.startsWith('https://'),
      'Google Maps URL must use https://',
    ),
    business_hours: optionalText(300, 'Business hours'),
    footer_text: optionalText(400, 'Footer text'),
    whatsapp_prefill_message: optionalText(300, 'WhatsApp prefilled message'),
  })
  .partial()
  .strict();

export type SettingsInput = z.infer<typeof settingsSchema>;

/** Keys that may be returned to anonymous visitors. */
export const PUBLIC_SETTING_KEYS = [
  'company_name',
  'hero_headline',
  'hero_subheading',
  'hero_image_url',
  'logo_url',
  'company_intro',
  'business_email',
  'whatsapp_number',
  'business_phone',
  'business_address',
  'google_maps_url',
  'business_hours',
  'footer_text',
  'whatsapp_prefill_message',
] as const;

export type PublicSettingKey = (typeof PUBLIC_SETTING_KEYS)[number];
