import { z } from 'zod';
import { boolish, optionalHttpUrl, optionalText } from './common';

export const updateSocialLinkSchema = z
  .object({
    profileName: optionalText(120, 'Profile name'),
    profileUrl: optionalHttpUrl('Profile URL').refine(
      (v) => v === null || v.startsWith('https://'),
      'Profile URL must use https://',
    ),
    followerCount: z
      .union([z.coerce.number().int().min(0).max(4_000_000_000), z.null(), z.literal('')])
      .optional()
      .transform((v) => (v === '' || v === undefined ? null : v)),
    countType: z.enum(['manual', 'api']),
    apiAccountId: optionalText(190, 'API account ID').refine(
      (v) => v === null || /^[A-Za-z0-9_\-.@]+$/.test(v),
      'API account ID contains invalid characters',
    ),
    isEnabled: boolish,
    showFollowerCount: boolish,
    displayOrder: z.coerce.number().int().min(0).max(10000).optional(),
  })
  .strict()
  .refine((v) => !v.isEnabled || v.profileUrl !== null, {
    message: 'A profile URL is required to enable this platform',
    path: ['profileUrl'],
  });
export type UpdateSocialLinkInput = z.infer<typeof updateSocialLinkSchema>;
