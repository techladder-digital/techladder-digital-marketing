import { Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { PortfolioProject } from '../../../core/models/models';
import { PORTFOLIO_CATEGORY_LABELS } from '../../../core/utils/labels';
import { MediaUrlPipe } from '../../../core/utils/media-url';

@Component({
  selector: 'tl-portfolio-card',
  imports: [MatIconModule, MediaUrlPipe],
  template: `
    <article class="pf tl-card">
      <button type="button" class="pf__media" (click)="open.emit(project())" [attr.aria-label]="'View details: ' + project().title">
        @if (project().thumbnailUrl) {
          <img [src]="project().thumbnailUrl | mediaUrl" [alt]="'Preview of ' + project().title" loading="lazy" width="640" height="400" />
        } @else if (project().videoUrl) {
          <video [src]="project().videoUrl | mediaUrl" preload="metadata" muted playsinline aria-hidden="true"></video>
        } @else {
          <span class="pf__placeholder" aria-hidden="true"><mat-icon>image</mat-icon></span>
        }
        @if (project().videoUrl) {
          <span class="pf__play" aria-hidden="true"><mat-icon>play_arrow</mat-icon></span>
        }
        <span class="pf__chips">
          <span class="tl-badge tl-badge--dark">{{ labels[project().category] }}</span>
          @if (project().isSample) { <span class="tl-badge tl-badge--solid">Sample / concept work</span> }
          @if (project().videoUrl) { <span class="tl-badge tl-badge--solid">Video</span> }
        </span>
      </button>
      <div class="pf__body">
        <h3 class="pf__title">{{ project().title }}</h3>
        <p class="pf__desc">{{ project().description }}</p>
        <div class="pf__actions">
          <button type="button" class="tl-btn tl-btn--outline tl-btn--sm" (click)="open.emit(project())">{{ project().videoUrl ? 'Watch video' : 'View details' }}</button>
          @if (project().projectUrl) {
            <a class="tl-btn tl-btn--dark tl-btn--sm" [href]="project().projectUrl!" target="_blank" rel="noopener noreferrer nofollow"
               [attr.aria-label]="'Visit ' + project().title + ' (opens in a new tab)'">
              Visit <mat-icon aria-hidden="true">open_in_new</mat-icon>
            </a>
          }
        </div>
      </div>
    </article>
  `,
  styles: `
    :host { display: block; height: 100%; }
    .pf { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
    .pf__media { position: relative; display: block; width: 100%; padding: 0; border: 0; background: var(--tl-black); aspect-ratio: 16 / 10; cursor: pointer; overflow: hidden; }
    .pf__media img, .pf__media video { width: 100%; height: 100%; object-fit: cover; transition: transform .35s ease; }
    .pf__play { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 64px; height: 64px; border-radius: 50%; display: grid; place-items: center; background: var(--tl-orange); color: var(--tl-black); box-shadow: 0 8px 24px rgba(0,0,0,.35); transition: transform .2s ease; }
    .pf__play mat-icon { font-size: 38px; width: 38px; height: 38px; }
    .pf:hover .pf__play { transform: translate(-50%, -50%) scale(1.08); }
    .pf:hover .pf__media img { transform: scale(1.04); }
    .pf__placeholder { display: grid; place-items: center; height: 100%; color: var(--tl-orange); }
    .pf__placeholder mat-icon { font-size: 48px; width: 48px; height: 48px; }
    .pf__chips { position: absolute; left: 12px; top: 12px; display: flex; flex-wrap: wrap; gap: 6px; }
    .pf__body { padding: 18px 20px 20px; display: flex; flex-direction: column; gap: 8px; flex-grow: 1; }
    .pf__title { font-size: 1.1rem; margin: 0; }
    .pf__desc { color: var(--tl-ink-70); margin: 0; flex-grow: 1; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
    .pf__actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 6px; }
  `,
})
export class PortfolioCard {
  readonly project = input.required<PortfolioProject>();
  readonly open = output<PortfolioProject>();
  protected readonly labels = PORTFOLIO_CATEGORY_LABELS;
}
