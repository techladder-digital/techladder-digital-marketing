import cors from 'cors';
import express, { Express, Request } from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { apiLimiter } from './middleware/rate-limit.middleware';
import adminRoutes from './routes/admin.routes';
import authRoutes from './routes/auth.routes';
import publicRoutes from './routes/public.routes';
import webhookRoutes from './routes/webhook.routes';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  if (env.TRUST_PROXY > 0) app.set('trust proxy', env.TRUST_PROXY);

  // The API only serves JSON, so a very strict CSP is safe here.
  app.use(
    helmet({
      contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
      crossOriginResourcePolicy: { policy: 'same-site' },
      hsts: env.isProduction ? { maxAge: 31536000, includeSubDomains: true } : false,
    }),
  );

  app.use(
    cors({
      origin(origin, cb) {
        // Allow same-origin / server-to-server (no Origin header) and the explicit allowlist only.
        if (!origin || env.corsOrigins.includes(origin)) return cb(null, true);
        return cb(null, false);
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: false,
      maxAge: 600,
    }),
  );

  // Small body limit; keep the raw body for webhook signature verification.
  app.use(
    express.json({
      limit: '20kb',
      verify: (req, _res, buf) => {
        if ((req as Request).originalUrl?.startsWith('/api/webhooks/')) (req as Request & { rawBody?: Buffer }).rawBody = Buffer.from(buf);
      },
    }),
  );

  // Uploaded photos/videos. Only files written by the upload endpoint live here.
  // nosniff + sandbox CSP stop a file from ever being treated as HTML/script.
  app.use(
    '/uploads',
    (req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return res.sendStatus(405);
      if (!/^\/\d{4}\/\d{2}\/[a-f0-9]{32}\.(jpg|png|gif|webp|mp4|webm)$/.test(req.path)) return res.sendStatus(404);
      res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      return next();
    },
    express.static(env.uploadDirAbsolute, {
      dotfiles: 'deny',
      index: false,
      redirect: false,
      fallthrough: true,
      maxAge: '30d',
      immutable: true,
    }),
  );

  app.use('/api', apiLimiter);
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  app.use('/api', publicRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/webhooks', webhookRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
