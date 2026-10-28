import { Component, computed, inject, input } from '@angular/core';
import { SiteDataService } from '../../../core/services/site-data.service';
import { mediaUrl } from '../../../core/utils/media-url';

/** Replaceable logo image + text wordmark. */
@Component({
  selector: 'tl-brand-logo',
  template: `
    <span class="brand" [class.brand--light]="tone() === 'light'" [class.brand--compact]="compact()">
      <img [src]="logoUrl()" [alt]="compact() ? site.companyName() : ''" width="40" height="40" class="brand__img" />
      @if (!compact()) {
        <span class="brand__text">
          <span class="brand__name">TECHLADDER</span>
          <span class="brand__sub">DIGITAL MARKETING</span>
        </span>
      }
    </span>
  `,
  styles: `
    .brand { display: inline-flex; align-items: center; gap: 10px; color: var(--tl-black); }
    .brand--light { color: var(--tl-white); }
    .brand__img { width: 40px; height: 40px; object-fit: contain; border-radius: 10px; flex-shrink: 0; }
    .brand__text { display: flex; flex-direction: column; line-height: 1.05; }
    .brand__name { font: 800 1.05rem/1.1 var(--tl-font-display); letter-spacing: 0.06em; }
    .brand__sub { font-size: 0.62rem; font-weight: 700; letter-spacing: 0.22em; color: var(--tl-orange); }
  `,
})
export class BrandLogo {
  protected readonly site = inject(SiteDataService);
  readonly tone = input<'dark' | 'light'>('dark');
  readonly compact = input(false);
  /** Admin-configured logo, falling back to the bundled mark (replace src/assets/images/logo.svg with the final logo). */
  protected readonly logoUrl = computed(() => mediaUrl(this.site.settings().logo_url) || '/assets/images/logo.svg');
}
