import { z } from 'zod';
import { CONTACT_METHODS, ENQUIRY_STATUSES, PROJECT_TYPES } from '../types/models';
import { email, optionalText, pagination, phone, text } from './common';

export const BUDGET_RANGES = [
  'Under ₹25,000',
  '₹25,000 – ₹50,000',
  '₹50,000 – ₹1,00,000',
  '₹1,00,000 – ₹3,00,000',
  'Above ₹3,00,000',
  'Not sure yet',
] as const;

export const createEnquirySchema = z
  .object({
    fullName: text(2, 120, 'Full name'),
    businessName: optionalText(160, 'Business name'),
    email,
    phone,
    projectType: z.enum(PROJECT_TYPES, { error: 'Select a project type' }),
    serviceName: text(2, 160, 'Service'),
    budgetRange: z
      .union([z.enum(BUDGET_RANGES), z.literal(''), z.null()])
      .optional()
      .transform((v) => (v ? v : null)),
    message: text(10, 3000, 'Message'),
    preferredContactMethod: z.enum(CONTACT_METHODS, { error: 'Select a preferred contact method' }),
    consentToContact: z.literal(true, { error: 'You must agree to be contacted' }),
    // Honeypot: real users never see or fill this field.
    website: z.string().max(0, 'Invalid submission').optional(),
  })
  .strict();

export type CreateEnquiryInput = z.infer<typeof createEnquirySchema>;

export const listEnquiriesQuery = z.object({
  ...pagination,
  status: z.enum(ENQUIRY_STATUSES).optional(),
  projectType: z.enum(PROJECT_TYPES).optional(),
  search: z.string().trim().max(100).optional(),
});
export type ListEnquiriesQuery = z.infer<typeof listEnquiriesQuery>;

export const updateEnquiryStatusSchema = z.object({ status: z.enum(ENQUIRY_STATUSES) }).strict();
