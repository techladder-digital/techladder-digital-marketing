import { Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

/**
 * Accessible 1–5 star rating.
 *  - Input mode: radio group (arrow keys, Home/End), works with Reactive Forms.
 *  - Read-only mode: <tl-star-rating [readonly]="true" [value]="4" />
 */
@Component({
  selector: 'tl-star-rating',
  imports: [MatIconModule],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => StarRating), multi: true }],
  template: `
    @if (readonly()) {
      <span class="stars stars--ro" role="img" [attr.aria-label]="(value() ?? 0) + ' out of 5 stars'">
        @for (s of stars; track s) {
          <mat-icon aria-hidden="true" [class.on]="s <= (value() ?? 0)">{{ s <= (value() ?? 0) ? 'star' : 'star_border' }}</mat-icon>
        }
      </span>
    } @else {
      <div class="stars" role="radiogroup" [attr.aria-label]="label()" [attr.aria-invalid]="invalid() || null"
           (mouseleave)="hover.set(0)">
        @for (s of stars; track s) {
          <button type="button" role="radio" class="star"
                  [attr.aria-checked]="current() === s" [attr.aria-label]="s + (s === 1 ? ' star' : ' stars')"
                  [attr.tabindex]="(current() || 1) === s ? 0 : -1" [disabled]="disabled()"
                  (click)="select(s)" (mouseenter)="hover.set(s)" (keydown)="onKey($event, s)" (blur)="onTouched()">
            <mat-icon aria-hidden="true" [class.on]="s <= (hover() || current())">{{ s <= (hover() || current()) ? 'star' : 'star_border' }}</mat-icon>
          </button>
        }
        <span class="caption" aria-live="polite">{{ current() ? captions[current() - 1] : 'Select a rating' }}</span>
      </div>
    }
  `,
  styles: `
    .stars { display: inline-flex; align-items: center; gap: 2px; flex-wrap: wrap; }
    .star { background: transparent; border: 0; padding: 4px; border-radius: 8px; cursor: pointer; line-height: 0; }
    .star:disabled { cursor: not-allowed; opacity: .5; }
    mat-icon { color: var(--tl-ink-50); font-size: 30px; width: 30px; height: 30px; transition: transform .12s; }
    .stars--ro mat-icon { font-size: 20px; width: 20px; height: 20px; }
    mat-icon.on { color: var(--tl-orange); }
    .star:hover mat-icon { transform: scale(1.12); }
    .caption { margin-left: 10px; font-weight: 600; color: var(--tl-ink-70); font-size: .9rem; }
  `,
})
export class StarRating implements ControlValueAccessor {
  readonly readonly = input(false);
  readonly value = input<number | null>(null);
  readonly label = input('Rating');
  readonly invalid = input(false);

  protected readonly stars = [1, 2, 3, 4, 5];
  protected readonly captions = ['Poor', 'Fair', 'Good', 'Very good', 'Excellent'];
  protected readonly current = signal(0);
  protected readonly hover = signal(0);
  protected readonly disabled = signal(false);

  private onChange: (v: number | null) => void = () => undefined;
  protected onTouched: () => void = () => undefined;

  writeValue(v: number | null): void {
    this.current.set(typeof v === 'number' && v >= 1 && v <= 5 ? v : 0);
  }
  registerOnChange(fn: (v: number | null) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(d: boolean): void {
    this.disabled.set(d);
  }

  protected select(s: number): void {
    this.current.set(s);
    this.onChange(s);
    this.onTouched();
  }

  protected onKey(e: KeyboardEvent, s: number): void {
    const keys: Record<string, number> = { ArrowRight: s + 1, ArrowUp: s + 1, ArrowLeft: s - 1, ArrowDown: s - 1, Home: 1, End: 5 };
    if (!(e.key in keys)) return;
    e.preventDefault();
    const next = Math.min(5, Math.max(1, keys[e.key]));
    this.select(next);
    const group = (e.target as HTMLElement).parentElement;
    (group?.querySelectorAll<HTMLButtonElement>('button.star')[next - 1])?.focus();
  }
}
