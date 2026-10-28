import { NextFunction, Request, Response } from 'express';
import { AdminRole } from '../types/models';
import { ApiError } from '../utils/api-error';
import { authService } from '../services/auth.service';

/** Requires a valid, unexpired admin access token (Authorization: Bearer <token>). */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(ApiError.unauthorized());
  }
  const token = header.slice(7).trim();
  const admin = await authService.verifyAccessToken(token);
  if (!admin) return next(ApiError.unauthorized('Your session has expired. Please sign in again.'));
  req.admin = admin;
  next();
}

/** Role-based authorization. 'admin' can do everything; 'editor' manages content only. */
export function requireRole(...roles: AdminRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.admin) return next(ApiError.unauthorized());
    if (!roles.includes(req.admin.role)) return next(ApiError.forbidden());
    next();
  };
}
