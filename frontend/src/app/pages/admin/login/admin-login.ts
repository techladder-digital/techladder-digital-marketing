import { Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ApiError } from '../../../core/services/api-error';
import { AuthService } from '../../../core/services/auth.service';
import { BrandLogo } from '../../../shared/components/brand-logo/brand-logo';

@Component({
  selector: 'tl-admin-login-page',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatIconModule, RouterLink, BrandLogo],
  template: `
    <main class="login" id="main-content">
      <div class="login__card">
        <tl-brand-logo />
        <h1 class="h4 mt-4 mb-1">Admin sign in</h1>
        <p class="text-muted-ink">Authorised TechLadder staff only.</p>

        @if (expired()) {
          <p class="notice" role="status">Your session ended. Please sign in again.</p>
        }
        @if (errorMessage(); as e) {
          <p class="notice notice--error" role="alert">{{ e }}</p>
        }

        <form [formGroup]="form" (ngSubmit)="submit()" class="tl-form" novalidate>
          <mat-form-field>
            <mat-label>Email</mat-label>
            <input matInput type="email" formControlName="email" autocomplete="username" required />
            @if (form.controls.email.touched && form.controls.email.invalid) { <mat-error>Enter a valid email address.</mat-error> }
          </mat-form-field>
          <mat-form-field>
            <mat-label>Password</mat-label>
            <input matInput [type]="showPassword() ? 'text' : 'password'" formControlName="password" autocomplete="current-password" required />
            <button type="button" matSuffix class="eye" (click)="showPassword.set(!showPassword())"
                    [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'" [attr.aria-pressed]="showPassword()">
              <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
            @if (form.controls.password.touched && form.controls.password.invalid) { <mat-error>Password is required.</mat-error> }
          </mat-form-field>
          <button type="submit" class="tl-btn tl-btn--primary w-100 mt-2" [disabled]="busy()" [attr.aria-busy]="busy()">
            {{ busy() ? 'Signing in…' : 'Sign in' }}
          </button>
        </form>
        <a routerLink="/" class="d-inline-block mt-4 small">← Back to website</a>
      </div>
    </main>
  `,
  styles: `
    .login { min-height: 100vh; display: grid; place-items: center; padding: 24px; background: var(--tl-black); }
    .login__card { width: 100%; max-width: 420px; background: var(--tl-white); border-radius: 18px; padding: 32px; border-top: 6px solid var(--tl-orange); }
    .notice { padding: 10px 14px; border-radius: 10px; background: var(--tl-ink-06); font-size: .92rem; }
    .notice--error { background: var(--tl-orange-soft); border: 1px solid var(--tl-orange); font-weight: 600; }
    .eye { background: transparent; border: 0; padding: 8px; cursor: pointer; display: grid; place-items: center; }
  `,
})
export class AdminLoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly returnUrl = input<string | undefined>();
  readonly expired = input<string | undefined>();

  protected readonly busy = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  submit(): void {
    if (this.busy()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.errorMessage.set(null);
    const { email, password } = this.form.getRawValue();
    this.auth
      .login(email, password)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: () => {
          const target = this.returnUrl();
          // Only allow internal admin return URLs (prevents open redirects).
          this.router.navigateByUrl(target && /^\/admin(\/|$)/.test(target) ? target : '/admin');
        },
        error: (e: ApiError) => {
          this.errorMessage.set(e.message);
          this.form.controls.password.reset();
        },
      });
  }
}
