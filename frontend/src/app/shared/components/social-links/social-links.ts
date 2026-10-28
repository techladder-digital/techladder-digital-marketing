import { DatePipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SiteDataService } from '../../../core/services/site-data.service';
import { compactNumber, PLATFORM_BADGES, PLATFORM_LABELS } from '../../../core/utils/labels';

/**
 * Social profile links. "icons" = compact badges; "cards" = profile cards with follower counts.
 * Counts are labelled honestly: manual figures show "updated <date>", API figures show their source.
 */
@Component({
  selector: 'tl-social-links',
  imports: [DatePipe, MatTooltipModule],
  template: `
    @if (variant() === 'icons') {
      <ul class="icons" [class.icons--light]="tone() === 'light'" aria-label="Social media profiles">
        @for (s of site.socialLinks(); track s.platform) {
          <li>
            <a [href]="s.profileUrl" target="_blank" rel="noopener noreferrer"
               [matTooltip]="labels[s.platform]" [attr.aria-label]="labels[s.platform] + ' (opens in a new tab)'">
              {{ badges[s.platform] }}
            </a>
          </li>
        }
      </ul>
    } @else {
      @if (site.socialLinks().length) {
        <div class="row g-3">
          @for (s of site.socialLinks(); track s.platform) {
            <div class="col-12 col-sm-6 col-lg-4">
              <a class="card-link tl-card" [href]="s.profileUrl" target="_blank" rel="noopener noreferrer">
                <span class="badge-lg" aria-hidden="true">{{ badges[s.platform] }}</span>
                <span class="meta">
                  <strong>{{ labels[s.platform] }}</strong>
                  @if (s.profileName) { <span class="handle">{{ s.profileName }}</span> }
                  @if (s.followerCount !== null) {
                    <span class="count">
                      {{ format(s.followerCount) }} {{ s.platform === 'youtube' ? 'subscribers' : 'followers' }}
                    </span>
                    <span class="source">
                      {{ s.countSource === 'api' ? 'From ' + labels[s.platform] + ' API' : 'Updated manually' }}
                      · {{ s.lastCountUpdate | date: 'mediumDate' }}
                    </span>
                  }
                </span>
                <span class="visually-hidden">(opens in a new tab)</span>
              </a>
            </div>
          }
        </div>
      } @else {
        <p class="text-muted-ink mb-0">Social media profiles will appear here once they are published.</p>
      }
    }
  `,
  styles: `
    .icons { list-style: none; display: flex; flex-wrap: wrap; gap: 8px; margin: 0; padding: 0; }
    .icons a { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; border: 1.5px solid var(--tl-ink-12); font-size: 0.7rem; font-weight: 800; text-decoration: none; color: var(--tl-black); transition: all .18s ease; }
    .icons a:hover { background: var(--tl-orange); border-color: var(--tl-orange); color: var(--tl-black); }
    .icons--light a { color: var(--tl-white); border-color: var(--tl-paper-12); }
    .card-link { display: flex; gap: 14px; align-items: center; padding: 18px; text-decoration: none; color: var(--tl-black); height: 100%; }
    .badge-lg { display: grid; place-items: center; width: 52px; height: 52px; border-radius: 14px; background: var(--tl-black); color: var(--tl-orange); font: 800 1rem var(--tl-font-display); flex-shrink: 0; }
    .meta { display: flex; flex-direction: column; min-width: 0; }
    .handle { color: var(--tl-ink-70); font-size: .9rem; overflow: hidden; text-overflow: ellipsis; }
    .count { font-weight: 700; margin-top: 4px; }
    .source { font-size: .75rem; color: var(--tl-ink-50); }
  `,
})
export class SocialLinks {
  protected readonly site = inject(SiteDataService);
  readonly variant = input<'icons' | 'cards'>('icons');
  readonly tone = input<'dark' | 'light'>('dark');
  protected readonly labels = PLATFORM_LABELS;
  protected readonly badges = PLATFORM_BADGES;
  protected format = compactNumber;
}
