import { z } from 'zod';
import { SERVICE_CATEGORIES } from '../types/models';
import { boolish, optionalImageSource, optionalText, text } from './common';

export const serviceSchema = z
  .object({
    category: z.enum(SERVICE_CATEGORIES),
    title: text(2, 160, 'Title'),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .max(180)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug may contain lowercase letters, digits and single hyphens')
      .optional(),
    description: text(10, 600, 'Description'),
    details: optionalText(5000, 'Details'),
    icon: z
      .union([z.string().trim().regex(/^[a-z0-9_]{1,60}$/, 'Icon must be a Material icon name'), z.literal(''), z.null()])
      .optional()
      .transform((v) => (v ? v : null)),
    imageUrl: optionalImageSource('Image'),
    isActive: boolish.default(true),
    displayOrder: z.coerce.number().int().min(0).max(10000).default(0),
  })
  .strict();
export type ServiceInput = z.infer<typeof serviceSchema>;

export const publicServicesQuery = z.object({ category: z.enum(SERVICE_CATEGORIES).optional() });

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180);
}
