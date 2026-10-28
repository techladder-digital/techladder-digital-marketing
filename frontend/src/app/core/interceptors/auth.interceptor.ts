import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';

/** Attaches the admin token ONLY to requests for our own admin/auth API endpoints. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const api = inject(ApiService);
  const auth = inject(AuthService);
  const isOwnApi = req.url.startsWith(api.baseUrl + '/admin') || req.url.startsWith(api.baseUrl + '/auth/');
  const token = isOwnApi ? auth.token : null;
  if (!token || req.url.endsWith('/auth/login')) return next(req);
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
