import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { PublicFeedback } from '../../../core/models/models';
import { SERVICE_CATEGORY_LABELS } from '../../../core/utils/labels';
import { StarRating } from '../star-rating/star-rating';

@Component({
  selector: 'tl-feedback-card',
  imports: [DatePipe, StarRating],
  template: `
    <figure class="fb tl-card">
      <tl-star-rating [readonly]="true" [value]="feedback().rating" />
      <blockquote class="fb__quote">{{ feedback().feedbackMessage }}</blockquote>
      <figcaption class="fb__by">
        <span class="fb__avatar" aria-hidden="true">{{ initial() }}</span>
        <span>
          <strong>{{ feedback().customerName }}</strong>
          @if (feedback().businessName) { <span class="fb__biz">, {{ feedback().businessName }}</span> }
          <span class="fb__meta">{{ categoryLabels[feedback().serviceCategory] }} · {{ feedback().projectName }} · {{ feedback().createdAt | date: 'MMM y' }}</span>
        </span>
      </figcaption>
    </figure>
  `,
  styles: `
    :host { display: block; height: 100%; }
    .fb { margin: 0; padding: 24px; height: 100%; display: flex; flex-direction: column; gap: 14px; }
    .fb__quote { margin: 0; flex-grow: 1; line-height: 1.7; font-size: 1rem; white-space: pre-line; }
    .fb__quote::before { content: '“'; color: var(--tl-orange); font: 800 2rem/0 var(--tl-font-display); vertical-align: -0.4em; margin-right: 4px; }
    .fb__by { display: flex; gap: 12px; align-items: center; }
    .fb__avatar { width: 40px; height: 40px; border-radius: 50%; background: var(--tl-black); color: var(--tl-orange); display: grid; place-items: center; font-weight: 800; flex-shrink: 0; }
    .fb__biz { color: var(--tl-ink-70); }
    .fb__meta { display: block; font-size: .8rem; color: var(--tl-ink-50); }
  `,
})
export class FeedbackCard {
  readonly feedback = input.required<PublicFeedback>();
  protected readonly categoryLabels = SERVICE_CATEGORY_LABELS;
  protected initial() {
    return this.feedback().customerName.trim().charAt(0).toUpperCase();
  }
}
