import { Component, inject, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LanguageService } from '../../../core/i18n/language.service';
import { SiteDataService } from '../../../core/services/site-data.service';
import { BrandLogo } from '../brand-logo/brand-logo';
import { SocialLinks } from '../social-links/social-links';

@Component({
  selector: 'tl-top-nav',
  imports: [RouterLink, RouterLinkActive, MatIconModule, BrandLogo, SocialLinks],
  template: `
    <header class="topbar">
      @if (mobile()) {
        <button type="button" class="menu-btn" (click)="openMenu.emit()" aria-label="Open menu" aria-controls="site-drawer">
          <mat-icon>menu</mat-icon>
        </button>
        <a routerLink="/" class="topbar__brand" aria-label="TechLadder Digital Marketing — home"><tl-brand-logo [compact]="true" /></a>
      }

      <nav class="topbar__nav" aria-label="Top">
        <a routerLink="/" routerLinkActive="is-active" [routerLinkActiveOptions]="{ exact: true }">{{ i18n.t('nav.home') }}</a>
        <a routerLink="/services" routerLinkActive="is-active">{{ i18n.t('nav.services') }}</a>
        <a routerLink="/portfolio" routerLinkActive="is-active">{{ i18n.t('nav.portfolio') }}</a>
        <a routerLink="/contact" routerLinkActive="is-active" [routerLinkActiveOptions]="{ exact: true }">{{ i18n.t('nav.contact') }}</a>
        <a routerLink="/contact" fragment="enquiry-form">{{ i18n.t('nav.enquiry') }}</a>
      </nav>

      <div class="topbar__actions">
        <button type="button" class="lang-btn" (click)="i18n.toggle()" [attr.aria-label]="i18n.t('lang.switchLabel')">
          <mat-icon aria-hidden="true">translate</mat-icon><span>{{ i18n.t('lang.switch') }}</span>
        </button>
        <div class="topbar__social"><tl-social-links variant="icons" /></div>
        @if (site.whatsappUrl(); as wa) {
          <a class="tl-btn tl-btn--primary tl-btn--sm" [href]="wa" target="_blank" rel="noopener noreferrer"
             aria-label="Chat with us on WhatsApp (opens in a new tab)">
            <mat-icon aria-hidden="true">chat</mat-icon><span class="wa-label">{{ i18n.t('btn.whatsapp') }}</span>
          </a>
        } @else {
          <a class="tl-btn tl-btn--primary tl-btn--sm" routerLink="/contact" fragment="enquiry-form">
            <mat-icon aria-hidden="true">chat</mat-icon><span class="wa-label">{{ i18n.t('btn.enquire') }}</span>
          </a>
        }
      </div>
    </header>
  `,
  styles: `
    :host { display: block; position: sticky; top: 0; z-index: 20; }
    .topbar { height: var(--tl-topbar-h); display: flex; align-items: center; gap: 16px; padding: 0 24px; background: rgba(255,255,255,.94); backdrop-filter: saturate(160%) blur(8px); border-bottom: 1px solid var(--tl-ink-12); }
    .topbar__nav { display: flex; gap: 4px; }
    .topbar__nav a { padding: 8px 14px; border-radius: 999px; text-decoration: none; font-weight: 600; font-size: .93rem; color: var(--tl-ink-70); }
    .topbar__nav a:hover { color: var(--tl-black); background: var(--tl-ink-06); }
    .topbar__nav a.is-active { color: var(--tl-black); background: var(--tl-orange-soft); box-shadow: inset 0 -2px 0 var(--tl-orange); }
    .topbar__actions { margin-left: auto; display: flex; align-items: center; gap: 14px; }
    .menu-btn { background: transparent; border: 0; padding: 8px; border-radius: 10px; display: grid; place-items: center; cursor: pointer; }
    .topbar__brand { text-decoration: none; }
    .lang-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 999px; border: 1.5px solid var(--tl-black); background: var(--tl-white); color: var(--tl-black); font-weight: 600; font-size: .88rem; cursor: pointer; }
    .lang-btn:hover { border-color: var(--tl-orange); color: var(--tl-orange); }
    .lang-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
    @media (max-width: 1199.98px) { .topbar__social { display: none; } }
    @media (max-width: 991.98px) { .topbar { padding: 0 12px; gap: 8px; } .topbar__nav { display: none; } }
    @media (max-width: 380px) { .wa-label { display: none; } }
  `,
})
export class TopNav {
  protected readonly site = inject(SiteDataService);
  protected readonly i18n = inject(LanguageService);
  readonly mobile = input(false);
  readonly openMenu = output<void>();
}