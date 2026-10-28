import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { ApiError } from '../utils/api-error';
import { logger } from '../utils/logger';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.path}`));
}

interface HttpLikeError {
  type?: string;
  status?: number;
  statusCode?: number;
  code?: string;
}

// Express recognises error handlers by their 4-argument signature.
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      success: false,
      error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
    });
  }

  const e = err as HttpLikeError;
  if (e?.type === 'entity.too.large') {
    return res.status(413).json({ success: false, error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large' } });
  }
  if (e?.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, error: { code: 'BAD_JSON', message: 'Malformed JSON body' } });
  }
  if (e?.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'A record with the same unique value already exists' } });
  }

  logger.error('Unhandled error', {
    method: req.method,
    path: req.path,
    error: err instanceof Error ? err.message : String(err),
    ...(env.isProduction ? {} : { stack: err instanceof Error ? err.stack : undefined }),
  });

  return res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again later.' },
  });
}
