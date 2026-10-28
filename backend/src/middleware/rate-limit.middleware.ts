import rateLimit, { ipKeyGenerator, Options } from 'express-rate-limit';
import { env } from '../config/env';

const common: Partial<Options> = {
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  // Unit tests exercise the limiter explicitly with RATE_LIMIT_IN_TESTS=1.
  skip: () => env.NODE_ENV === 'test' && process.env.RATE_LIMIT_IN_TESTS !== '1',
  handler: (_req, res, _next, options) =>
    res.status(options.statusCode).json({
      success: false,
      error: { code: 'RATE_LIMITED', message: 'Too many requests. Please wait a few minutes and try again.' },
    }),
};

/** General API budget per IP. */
export const apiLimiter = rateLimit({ ...common, windowMs: 15 * 60 * 1000, limit: 600 });

/** Public form submissions (enquiries, feedback). */
export const submissionLimiter = rateLimit({ ...common, windowMs: 10 * 60 * 1000, limit: 5 });

/** Login attempts — keyed by IP + email to slow down credential stuffing. */
export const loginLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  keyGenerator: (req) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase().slice(0, 190) : '';
    return `${ipKeyGenerator(req.ip ?? '')}|${email}`;
  },
});
