import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SiteDataService } from '../../../core/services/site-data.service';

/** Floating WhatsApp contact button — shown only when a WhatsApp number is configured. */
@Component({
  selector: 'tl-whatsapp-button',
  imports: [MatIconModule, MatTooltipModule],
  template: `
    @if (site.whatsappUrl(); as url) {
      <a class="wa-fab" [href]="url" target="_blank" rel="noopener noreferrer"
         matTooltip="Chat on WhatsApp" matTooltipPosition="left"
         aria-label="Chat with TechLadder on WhatsApp (opens in a new tab)">
        <mat-icon aria-hidden="true">chat</mat-icon>
      </a>
    }
  `,
  styles: `
    .wa-fab { position: fixed; right: 20px; bottom: 20px; z-index: 30; width: 58px; height: 58px; border-radius: 50%; display: grid; place-items: center; background: var(--tl-orange); color: var(--tl-black); box-shadow: 0 10px 28px rgba(17,17,17,.28); border: 3px solid var(--tl-white); transition: transform .18s ease; }
    .wa-fab:hover { transform: scale(1.06); color: var(--tl-black); }
    .wa-fab mat-icon { font-size: 28px; width: 28px; height: 28px; }
    @media (max-width: 575.98px) { .wa-fab { right: 14px; bottom: 14px; width: 52px; height: 52px; } }
  `,
})
export class WhatsappButton {
  protected readonly site = inject(SiteDataService);
}
