import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, map, Observable, of, tap } from 'rxjs';
import { AdminUser, LoginResult } from '../models/models';
import { ApiService } from './api.service';

const STORAGE_KEY = 'tl_admin_session';

interface StoredSession {
  token: string;
  expiresAt: string;
  admin: AdminUser;
}

/**
 * Admin session handling. The short-lived access token is kept in sessionStorage
 * (cleared when the tab closes) and sent only to the API via the auth interceptor.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly session = signal<StoredSession | null>(this.restore());

  readonly admin = computed(() => this.session()?.admin ?? null);
  readonly isLoggedIn = computed(() => this.session() !== null);
  readonly isFullAdmin = computed(() => this.session()?.admin.role === 'admin');

  get token(): string | null {
    const s = this.session();
    if (!s) return null;
    if (new Date(s.expiresAt).getTime() <= Date.now()) {
      this.clear();
      return null;
    }
    return s.token;
  }

  login(email: string, password: string): Observable<AdminUser> {
    return this.api.post<LoginResult>('/auth/login', { email, password }).pipe(
      tap((r) => this.store({ token: r.token, expiresAt: r.expiresAt, admin: r.admin })),
      map((r) => r.admin),
    );
  }

  /** Revokes the token server-side, then clears the local session. */
  logout(): Observable<void> {
    const hadToken = !!this.token;
    const request$ = hadToken ? this.api.post<unknown>('/auth/logout', {}).pipe(map(() => undefined)) : of(undefined);
    return request$.pipe(
      catchError(() => of(undefined)),
      finalize(() => {
        this.clear();
        this.router.navigate(['/admin/login']);
      }),
    );
  }

  /** Local-only sign-out (e.g. after a 401). */
  clear(): void {
    this.session.set(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage unavailable */
    }
  }

  private store(s: StoredSession): void {
    this.session.set(s);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {
      /* storage unavailable: session lives in memory only */
    }
  }

  private restore(): StoredSession | null {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw) as StoredSession;
      if (!s?.token || !s.expiresAt || new Date(s.expiresAt).getTime() <= Date.now()) return null;
      return s;
    } catch {
      return null;
    }
  }
}
