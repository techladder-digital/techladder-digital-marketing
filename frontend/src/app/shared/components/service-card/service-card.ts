import { Component, computed, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { ServiceItem } from '../../../core/models/models';
import { projectTypeForService } from '../../../core/utils/labels';
import { MediaUrlPipe } from '../../../core/utils/media-url';

@Component({
  selector: 'tl-service-card',
  imports: [MatIconModule, RouterLink, MediaUrlPipe],
  template: `
    <article class="svc tl-card" [class.svc--dark]="tone() === 'dark'" [attr.aria-labelledby]="'svc-' + service().id">
      @if (service().imageUrl) {
        <img class="svc__img" [src]="service().imageUrl | mediaUrl" [alt]="service().title" loading="lazy" width="400" height="200" />
      } @else {
        <span class="svc__icon" aria-hidden="true"><mat-icon>{{ service().icon || 'auto_awesome' }}</mat-icon></span>
      }
      <h3 class="svc__title" [id]="'svc-' + service().id">{{ service().title }}</h3>
      <p class="svc__desc">{{ service().description }}</p>
      <div class="svc__actions">
        <button type="button" class="tl-btn tl-btn--sm" [class.tl-btn--outline]="tone() !== 'dark'" [class.tl-btn--outline-light]="tone() === 'dark'"
                (click)="learnMore.emit(service())" [attr.aria-label]="'Learn more about ' + service().title">
          Learn More
        </button>
        <a class="tl-btn tl-btn--primary tl-btn--sm" routerLink="/contact" fragment="enquiry-form"
           [queryParams]="enquiryParams()" [attr.aria-label]="'Enquire now about ' + service().title">
          Enquire Now
        </a>
      </div>
    </article>
  `,
  styles: `
    :host { display: block; height: 100%; }
    .svc { display: flex; flex-direction: column; height: 100%; padding: 24px; gap: 10px; }
    .svc--dark { background: rgba(255,255,255,.04); border-color: var(--tl-paper-12); color: var(--tl-white); box-shadow: none; }
    .svc__icon { width: 54px; height: 54px; border-radius: 14px; display: grid; place-items: center; background: var(--tl-orange-soft); color: var(--tl-orange); }
    .svc--dark .svc__icon { background: var(--tl-orange); color: var(--tl-black); }
    .svc__icon mat-icon { font-size: 28px; width: 28px; height: 28px; }
    .svc__img { width: 100%; aspect-ratio: 2 / 1; object-fit: cover; border-radius: 10px; }
    .svc__title { font-size: 1.12rem; margin: 6px 0 0; }
    .svc__desc { color: var(--tl-ink-70); line-height: 1.6; margin: 0; flex-grow: 1; font-size: .95rem; }
    .svc--dark .svc__desc { color: var(--tl-paper-70); }
    .svc__actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 8px; }
  `,
})
export class ServiceCard {
  readonly service = input.required<ServiceItem>();
  readonly tone = input<'light' | 'dark'>('light');
  readonly learnMore = output<ServiceItem>();
  protected readonly enquiryParams = computed(() => ({
    type: projectTypeForService(this.service().category, this.service().title),
    service: this.service().title,
  }));
}
