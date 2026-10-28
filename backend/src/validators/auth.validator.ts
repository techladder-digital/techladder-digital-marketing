import { z } from 'zod';

export const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().max(190).pipe(z.email('Enter a valid email address')),
    password: z.string().min(1, 'Password is required').max(200),
  })
  .strict();

/** Password policy for admin accounts. */
export const adminPasswordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .max(128, 'Password must be at most 128 characters')
  .refine((v) => /[a-z]/.test(v) && /[A-Z]/.test(v) && /\d/.test(v), 'Use upper-case, lower-case letters and digits');
