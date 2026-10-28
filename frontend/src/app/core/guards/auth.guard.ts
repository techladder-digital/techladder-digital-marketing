import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Client-side convenience only — every admin endpoint is also protected server-side. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.token) return true;
  return router.createUrlTree(['/admin/login'], { queryParams: { returnUrl: state.url } });
};

/** Restricts a route to the full 'admin' role (enquiries, settings). */
export const fullAdminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isFullAdmin() ? true : router.createUrlTree(['/admin']);
};

/** Keeps signed-in admins away from the login page. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.token ? router.createUrlTree(['/admin']) : true;
};
