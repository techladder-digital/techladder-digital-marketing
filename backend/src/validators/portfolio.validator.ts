import { z } from 'zod';
import { PORTFOLIO_CATEGORIES } from '../types/models';
import { boolish, optionalHttpUrl, optionalImageSource, optionalVideoSource, text } from './common';

export const publicPortfolioQuery = z.object({
  category: z.enum(PORTFOLIO_CATEGORIES).optional(),
  featured: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  limit: z.coerce.number().int().min(1).max(100).default(60),
});

export const portfolioSchema = z
  .object({
    title: text(2, 160, 'Title'),
    category: z.enum(PORTFOLIO_CATEGORIES),
    description: text(10, 4000, 'Description'),
    thumbnailUrl: optionalImageSource('Thumbnail'),
    videoUrl: optionalVideoSource('Video'),
    projectUrl: optionalHttpUrl('Project URL'),
    isSample: boolish.default(false),
    isFeatured: boolish.default(false),
    isPublished: boolish.default(false),
  })
  .strict();
export type PortfolioInput = z.infer<typeof portfolioSchema>;
