import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { BrandLogo } from '../../shared/components/brand-logo/brand-logo';

interface AdminNav {
  label: string;
  path: string;
  icon: string;
  adminOnly?: boolean;
  exact?: boolean;
}

@Component({
  selector: 'tl-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatSidenavModule, MatIconModule, BrandLogo],
  template: `
    <a class="skip-link" href="#admin-main">Skip to main content</a>
    <mat-sidenav-container class="admin">
      <mat-sidenav [mode]="isMobile() ? 'over' : 'side'" [opened]="!isMobile() || open()" (closedStart)="open.set(false)" class="admin__nav">
        <div class="admin__brand">
          <tl-brand-logo tone="light" />
          <span class="tl-badge tl-badge--solid mt-2">Admin panel</span>
        </div>
        <nav aria-label="Administration">
          @for (item of nav; track item.path) {
            @if (!item.adminOnly || auth.isFullAdmin()) {
              <a [routerLink]="item.path" routerLinkActive="is-active" [routerLinkActiveOptions]="{ exact: !!item.exact }" (click)="isMobile() && open.set(false)">
                <mat-icon aria-hidden="true">{{ item.icon }}</mat-icon>{{ item.label }}
              </a>
            }
          }
        </nav>
        <div class="admin__foot">
          <a routerLink="/" target="_blank" rel="noopener"><mat-icon aria-hidden="true">open_in_new</mat-icon>View website</a>
          <button type="button" (click)="logout()"><mat-icon aria-hidden="true">logout</mat-icon>Sign out</button>
        </div>
      </mat-sidenav>
      <mat-sidenav-content>
        <header class="admin__top">
          @if (isMobile()) {
            <button type="button" class="menu" (click)="open.set(true)" aria-label="Open admin menu"><mat-icon>menu</mat-icon></button>
          }
          <span class="ms-auto user">
            <mat-icon aria-hidden="true">account_circle</mat-icon>
            {{ auth.admin()?.name }} <span class="tl-badge">{{ auth.admin()?.role }}</span>
          </span>
        </header>
        <main id="admin-main" tabindex="-1"><router-outlet /></main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: `
    .admin { min-height: 100vh; background: var(--tl-ink-06); }
    .admin__nav { width: 250px; background: var(--tl-black); color: var(--tl-white); padding: 18px 12px; display: flex; flex-direction: column; }
    .admin__brand { display: flex; flex-direction: column; align-items: flex-start; padding: 0 6px 18px; border-bottom: 1px solid var(--tl-paper-12); margin-bottom: 12px; }
    nav a, .admin__foot a, .admin__foot button { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 10px; color: var(--tl-paper-70); text-decoration: none; font-weight: 500; background: transparent; border: 0; width: 100%; text-align: left; cursor: pointer; }
    nav a:hover, .admin__foot a:hover, .admin__foot button:hover { background: var(--tl-paper-12); color: var(--tl-white); }
    nav a.is-active { background: var(--tl-orange); color: var(--tl-black); }
    .admin__foot { margin-top: 24px; padding-top: 12px; border-top: 1px solid var(--tl-paper-12); }
    .admin__top { height: 60px; display: flex; align-items: center; gap: 12px; padding: 0 20px; background: var(--tl-white); border-bottom: 1px solid var(--tl-ink-12); position: sticky; top: 0; z-index: 5; }
    .menu { background: transparent; border: 0; display: grid; place-items: center; padding: 6px; cursor: pointer; }
    .user { display: flex; align-items: center; gap: 8px; font-weight: 600; }
    main { outline: none; }
  `,
})
export class AdminLayout {
  protected readonly auth = inject(AuthService);
  private readonly breakpoints = inject(BreakpointObserver);
  protected readonly isMobile = toSignal(this.breakpoints.observe('(max-width: 991.98px)').pipe(map((s) => s.matches)), { initialValue: false });
  protected readonly open = signal(false);
  protected readonly nav: AdminNav[] = [
    { label: 'Dashboard', path: '/admin', icon: 'dashboard', exact: true },
    { label: 'Enquiries', path: '/admin/enquiries', icon: 'inbox', adminOnly: true },
    { label: 'Feedback', path: '/admin/feedback', icon: 'reviews' },
    { label: 'Media library', path: '/admin/media', icon: 'perm_media' },
    { label: 'Portfolio', path: '/admin/portfolio', icon: 'collections' },
    { label: 'Services', path: '/admin/services', icon: 'design_services' },
    { label: 'Social media', path: '/admin/social', icon: 'share' },
    { label: 'Website settings', path: '/admin/settings', icon: 'tune', adminOnly: true },
  ];

  protected logout(): void {
    this.auth.logout().subscribe();
  }
}
