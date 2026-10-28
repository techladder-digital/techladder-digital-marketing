import { Component, inject, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { IsActiveMatchOptions, RouterLink, RouterLinkActive } from '@angular/router';
import { LanguageService } from '../../../core/i18n/language.service';
import { BrandLogo } from '../brand-logo/brand-logo';
import { PUBLIC_NAV } from '../nav-items';
import { SocialLinks } from '../social-links/social-links';

@Component({
  selector: 'tl-sidebar',
  imports: [RouterLink, RouterLinkActive, MatIconModule, MatTooltipModule, BrandLogo, SocialLinks],
  template: `
    <div class="sidebar" [class.sidebar--collapsed]="collapsed()">
      <div class="sidebar__head">
        <a routerLink="/" class="sidebar__brand" aria-label="TechLadder Digital Marketing — home" (click)="navigate.emit()">
          <tl-brand-logo tone="light" [compact]="collapsed()" />
        </a>
        @if (mobile()) {
          <button type="button" class="icon-btn" (click)="closeDrawer.emit()" aria-label="Close menu">
            <mat-icon>close</mat-icon>
          </button>
        }
      </div>

      <nav aria-label="Main">
        <ul class="sidebar__nav">
          @for (item of nav; track item.label) {
            <li>
              <a [routerLink]="item.path" [fragment]="item.fragment"
                 routerLinkActive="is-active" [routerLinkActiveOptions]="item.activeOptions"
                 [matTooltip]="collapsed() ? i18n.t(item.key) : ''" matTooltipPosition="right"
                 [attr.aria-label]="collapsed() ? i18n.t(item.key) : null"
                 (click)="navigate.emit()">
                <mat-icon aria-hidden="true">{{ item.icon }}</mat-icon>
                @if (!collapsed()) { <span>{{ i18n.t(item.key) }}</span> }
              </a>
            </li>
          }
        </ul>
      </nav>

      @if (!collapsed()) {
        <div class="sidebar__social">
          <span class="sidebar__label">{{ i18n.t('nav.followUs') }}</span>
          <tl-social-links variant="icons" tone="light" />
        </div>
      }

      @if (!mobile()) {
        <button type="button" class="sidebar__toggle" (click)="toggleCollapse.emit()"
                [attr.aria-label]="collapsed() ? 'Expand sidebar' : 'Collapse sidebar'"
                [attr.aria-expanded]="!collapsed()">
          <mat-icon aria-hidden="true">{{ collapsed() ? 'chevron_right' : 'chevron_left' }}</mat-icon>
          @if (!collapsed()) { <span>{{ i18n.t('nav.collapse') }}</span> }
        </button>
      }
    </div>
  `,
  styles: `
    .sidebar { display: flex; flex-direction: column; height: 100%; background: var(--tl-black); color: var(--tl-white); padding: 18px 14px; gap: 18px; overflow-y: auto; }
    .sidebar__head { display: flex; align-items: center; justify-content: space-between; min-height: 44px; }
    .sidebar__brand { text-decoration: none; }
    .sidebar__nav { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
    .sidebar__nav a { display: flex; align-items: center; gap: 14px; padding: 11px 14px; border-radius: 10px; color: var(--tl-paper-70); text-decoration: none; font-weight: 500; position: relative; transition: background .18s, color .18s; }
    .sidebar__nav a:hover { background: var(--tl-paper-12); color: var(--tl-white); }
    .sidebar__nav a.is-active { color: var(--tl-white); background: var(--tl-paper-12); }
    .sidebar__nav a.is-active::before { content: ''; position: absolute; left: 0; top: 8px; bottom: 8px; width: 4px; border-radius: 4px; background: var(--tl-orange); }
    .sidebar__nav a.is-active mat-icon { color: var(--tl-orange); }
    .sidebar--collapsed { padding: 18px 10px; align-items: center; }
    .sidebar--collapsed .sidebar__nav a { justify-content: center; padding: 11px; }
    .sidebar__social { margin-top: auto; padding: 14px; border-radius: 12px; border: 1px solid var(--tl-paper-12); }
    .sidebar__label { display: block; font-size: .72rem; letter-spacing: .14em; text-transform: uppercase; color: var(--tl-paper-70); margin-bottom: 10px; }
    .sidebar__toggle { display: flex; align-items: center; justify-content: center; gap: 6px; background: transparent; border: 1px solid var(--tl-paper-12); color: var(--tl-paper-70); border-radius: 10px; padding: 8px; cursor: pointer; }
    .sidebar--collapsed .sidebar__toggle { margin-top: auto; }
    .sidebar__toggle:hover { color: var(--tl-white); border-color: var(--tl-orange); }
    .icon-btn { background: transparent; border: 0; color: var(--tl-white); padding: 6px; border-radius: 8px; cursor: pointer; display: grid; place-items: center; }
  `,
})
export class Sidebar {
  protected readonly i18n = inject(LanguageService);
  readonly collapsed = input(false);
  readonly mobile = input(false);
  readonly toggleCollapse = output<void>();
  readonly closeDrawer = output<void>();
  readonly navigate = output<void>();
  // Options objects are created once: binding a new object on every change detection
  // would make RouterLinkActive re-run continuously.
  protected readonly nav = PUBLIC_NAV.map((item) => ({
    ...item,
    activeOptions: item.fragment
      ? ({ paths: 'exact', queryParams: 'ignored', fragment: 'exact', matrixParams: 'ignored' } as IsActiveMatchOptions)
      : { exact: !!item.exact },
  }));
}