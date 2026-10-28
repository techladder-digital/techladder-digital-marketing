import { Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'tl-loading-state',
  imports: [MatProgressSpinnerModule],
  template: `
    <div class="state" role="status" aria-live="polite">
      <mat-progress-spinner mode="indeterminate" diameter="36" strokeWidth="4" aria-hidden="true" />
      <span>{{ label() }}</span>
    </div>
  `,
  styles: `.state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 40px 16px; color: var(--tl-ink-70); }`,
})
export class LoadingState {
  readonly label = input('Loading…');
}

@Component({
  selector: 'tl-error-state',
  imports: [MatIconModule],
  template: `
    <div class="state" role="alert">
      <mat-icon aria-hidden="true">error_outline</mat-icon>
      <strong>{{ title() }}</strong>
      <span>{{ message() }}</span>
      @if (showRetry()) {
        <button type="button" class="tl-btn tl-btn--outline tl-btn--sm" (click)="retry.emit()">
          <mat-icon aria-hidden="true">refresh</mat-icon> Try again
        </button>
      }
    </div>
  `,
  styles: `
    .state { display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; padding: 36px 16px; border: 1px dashed var(--tl-orange); border-radius: var(--tl-radius); background: var(--tl-orange-soft); }
    mat-icon { color: var(--tl-orange); font-size: 36px; width: 36px; height: 36px; }
    span { color: var(--tl-ink-70); max-width: 460px; }
  `,
})
export class ErrorState {
  readonly title = input('Something went wrong');
  readonly message = input('We could not load this content right now.');
  readonly showRetry = input(true);
  readonly retry = output<void>();
}

@Component({
  selector: 'tl-empty-state',
  imports: [MatIconModule],
  template: `
    <div class="state">
      <mat-icon aria-hidden="true">{{ icon() }}</mat-icon>
      <strong>{{ title() }}</strong>
      <span><ng-content /></span>
    </div>
  `,
  styles: `
    .state { display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; padding: 40px 16px; border: 1px dashed var(--tl-ink-12); border-radius: var(--tl-radius); }
    mat-icon { color: var(--tl-orange); font-size: 40px; width: 40px; height: 40px; }
    span { color: var(--tl-ink-70); max-width: 520px; }
  `,
})
export class EmptyState {
  readonly icon = input('inbox');
  readonly title = input('Nothing here yet');
}
