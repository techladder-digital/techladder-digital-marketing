import { z } from 'zod';
import { MODERATION_STATUSES, SERVICE_CATEGORIES } from '../types/models';
import { optionalText, pagination, text } from './common';

export const createFeedbackSchema = z
  .object({
    customerName: text(2, 120, 'Name'),
    businessName: optionalText(160, 'Business name'),
    serviceCategory: z.enum(SERVICE_CATEGORIES, { error: 'Select a service category' }),
    projectName: text(2, 160, 'Project name'),
    rating: z.coerce.number({ error: 'Select a rating' }).int().min(1, 'Rating must be 1–5').max(5, 'Rating must be 1–5'),
    feedbackMessage: text(10, 2000, 'Feedback'),
    consentToPublish: z.boolean().default(false),
    website: z.string().max(0, 'Invalid submission').optional(),
  })
  .strict();
export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;

export const listFeedbackQuery = z.object({
  ...pagination,
  status: z.enum(MODERATION_STATUSES).optional(),
});

export const moderateFeedbackSchema = z.object({ status: z.enum(['approved', 'rejected', 'pending']) }).strict();
