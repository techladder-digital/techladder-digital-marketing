import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { ApiError } from '../services/api-error';
import { AuthService } from '../services/auth.service';

/** Normalises HTTP errors to ApiError and handles expired admin sessions. */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return next(req).pipe(
    catchError((err: unknown) => {
      const apiError = ApiError.fromHttp(err);
      const isAdminCall = /\/admin(\/|$)|\/auth\/(me|logout)/.test(req.url);
      if (err instanceof HttpErrorResponse && err.status === 401 && isAdminCall) {
        auth.clear();
        router.navigate(['/admin/login'], { queryParams: { returnUrl: router.url, expired: 1 } });
      }
      return throwError(() => apiError);
    }),
  );
};
