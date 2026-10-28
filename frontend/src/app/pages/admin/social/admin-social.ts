import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { ToastrService } from 'ngx-toastr';
import { AdminSocialLink, SocialPlatform } from '../../../core/models/models';
import { ApiError } from '../../../core/services/api-error';
import { ApiService } from '../../../core/services/api.service';
import { SiteDataService } from '../../../core/services/site-data.service';
import { PLATFORM_BADGES, PLATFORM_LABELS } from '../../../core/utils/labels';
import { ErrorState, LoadingState } from '../../../shared/components/state/states';
import { httpsUrlValidator } from '../shared/validators';

const API_PLATFORMS: SocialPlatform[] = ['youtube', 'facebook', 'instagram'];

@Component({
  selector: 'tl-admin-social-page',
  imports: [DatePipe, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatCheckboxModule, MatRadioModule, LoadingState, ErrorState],
  template: `
    <div class="tl-admin-page">
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h1 class="tl-admin-title">Social media</h1>
          <p class="text-muted-ink mb-0">Profile links and follower counts. Manual counts are shown with their last-updated date; only API counts are labelled as coming from the platform.</p>
        </div>
        <button type="button" class="tl-btn tl-btn--outline" (click)="sync()" [disabled]="syncing()">{{ syncing() ? 'Syncing…' : 'Refresh API counts now' }}</button>
      </div>

      @if (loading()) {
        <tl-loading-state />
      } @else if (failed()) {
        <tl-error-state (retry)="load()" />
      } @else {
        <div class="row g-3">
          @for (link of links(); track link.id) {
            @let form = forms[link.id];
            <div class="col-12 col-xl-6">
              <form class="card-form tl-form" [formGroup]="form" (ngSubmit)="save(link)" novalidate [attr.aria-labelledby]="'pl-' + link.id">
                <div class="d-flex align-items-center gap-2 mb-2">
                  <span class="badge-pl" aria-hidden="true">{{ badges[link.platform] }}</span>
                  <h2 class="h6 mb-0" [id]="'pl-' + link.id">{{ labels[link.platform] }}</h2>
                  <mat-checkbox formControlName="isEnabled" class="ms-auto">Enabled</mat-checkbox>
                </div>
                <mat-form-field><mat-label>Profile display name</mat-label><input matInput formControlName="profileName" maxlength="120" /></mat-form-field>
                <mat-form-field><mat-label>Profile URL</mat-label><input matInput formControlName="profileUrl" placeholder="https://…" />
                  @if (form.get('profileUrl')?.touched && form.get('profileUrl')?.invalid) { <mat-error>{{ form.get('profileUrl')?.errors?.['server'] ?? 'Enter a valid https:// URL.' }}</mat-error> }
                </mat-form-field>

                <fieldset class="count">
                  <legend>Follower count source</legend>
                  <mat-radio-group formControlName="countType" aria-label="Follower count source">
                    <mat-radio-button value="manual">Manually maintained</mat-radio-button>
                    <mat-radio-button value="api" [disabled]="!apiPlatforms.includes(link.platform)">Official platform API</mat-radio-button>
                  </mat-radio-group>
                  @if (!apiPlatforms.includes(link.platform)) { <p class="small text-muted-ink mb-0">No supported official API — maintain this count manually.</p> }
                  @if (form.get('countType')?.value === 'manual') {
                    <mat-form-field class="mt-2"><mat-label>{{ link.platform === 'youtube' ? 'Subscribers' : 'Followers' }}</mat-label>
                      <input matInput type="number" min="0" formControlName="followerCount" />
                      @if (form.get('followerCount')?.invalid) { <mat-error>Enter a whole number (0 or more).</mat-error> }
                    </mat-form-field>
                  } @else {
                    <mat-form-field class="mt-2"><mat-label>{{ link.platform === 'youtube' ? 'YouTube channel ID' : link.platform === 'instagram' ? 'Instagram user ID' : 'Facebook Page ID' }}</mat-label>
                      <input matInput formControlName="apiAccountId" maxlength="190" />
                      @if (form.get('apiAccountId')?.touched && form.get('apiAccountId')?.invalid) { <mat-error>{{ form.get('apiAccountId')?.errors?.['server'] ?? 'Required for API counts.' }}</mat-error> }
                    </mat-form-field>
                    <p class="small mb-0">Current API figure: <strong>{{ link.followerCount ?? '—' }}</strong></p>
                  }
                  <p class="small text-muted-ink mb-0">Last updated: {{ link.lastCountUpdate ? (link.lastCountUpdate | date: 'medium') : 'never' }}</p>
                  @if (link.lastSyncError) { <p class="small mb-0"><strong>Last sync error:</strong> {{ link.lastSyncError }}</p> }
                  <mat-checkbox formControlName="showFollowerCount" class="mt-1">Show count on the website</mat-checkbox>
                </fieldset>

                <button type="submit" class="tl-btn tl-btn--primary tl-btn--sm mt-2" [disabled]="saving() === link.id">{{ saving() === link.id ? 'Saving…' : 'Save ' + labels[link.platform] }}</button>
              </form>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .card-form { background: var(--tl-white); border: 1px solid var(--tl-ink-12); border-radius: var(--tl-radius); padding: 18px; height: 100%; }
    .badge-pl { width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center; background: var(--tl-black); color: var(--tl-orange); font-weight: 800; font-size: .8rem; }
    .count { border: 1px solid var(--tl-ink-12); border-radius: 10px; padding: 8px 12px 12px; margin: 0; }
    .count legend { float: none; width: auto; font-size: .8rem; padding: 0 6px; margin: 0; color: var(--tl-ink-70); }
    mat-radio-group { display: flex; flex-wrap: wrap; gap: 4px 12px; }
  `,
})
export class AdminSocialPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly toastr = inject(ToastrService);
  private readonly site = inject(SiteDataService);

  protected readonly labels = PLATFORM_LABELS;
  protected readonly badges = PLATFORM_BADGES;
  protected readonly apiPlatforms = API_PLATFORMS;
  protected readonly links = signal<AdminSocialLink[]>([]);
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);
  protected readonly saving = signal<number | null>(null);
  protected readonly syncing = signal(false);
  protected forms: Record<number, FormGroup> = {};

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.failed.set(false);
    this.api.get<AdminSocialLink[]>('/admin/social-links').subscribe({
      next: (links) => {
        this.forms = {};
        for (const l of links) {
          this.forms[l.id] = this.fb.group({
            profileName: [l.profileName ?? '', [Validators.maxLength(120)]],
            profileUrl: [l.profileUrl ?? '', [httpsUrlValidator]],
            followerCount: [l.followerCount, [Validators.min(0), Validators.pattern(/^\d*$/)]],
            countType: [l.countType],
            apiAccountId: [l.apiAccountId ?? '', [Validators.maxLength(190)]],
            isEnabled: [l.isEnabled],
            showFollowerCount: [l.showFollowerCount],
          });
        }
        this.links.set(links);
        this.loading.set(false);
      },
      error: () => {
        this.failed.set(true);
        this.loading.set(false);
      },
    });
  }

  protected save(link: AdminSocialLink): void {
    const form = this.forms[link.id];
    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }
    const v = form.getRawValue();
    const payload = {
      profileName: (v.profileName ?? '').trim() || null,
      profileUrl: (v.profileUrl ?? '').trim() || null,
      followerCount: v.followerCount === '' || v.followerCount === null ? null : Number(v.followerCount),
      countType: v.countType,
      apiAccountId: (v.apiAccountId ?? '').trim() || null,
      isEnabled: !!v.isEnabled,
      showFollowerCount: !!v.showFollowerCount,
    };
    this.saving.set(link.id);
    this.api.put<AdminSocialLink>(`/admin/social-links/${link.id}`, payload).subscribe({
      next: (updated) => {
        this.saving.set(null);
        this.links.update((ls) => ls.map((l) => (l.id === updated.id ? updated : l)));
        this.toastr.success(`${PLATFORM_LABELS[link.platform]} updated.`);
        this.site.load(true);
      },
      error: (e: ApiError) => {
        this.saving.set(null);
        for (const [k, msg] of Object.entries(e.fieldErrors)) {
          form.get(k)?.setErrors({ server: msg });
          form.get(k)?.markAsTouched();
        }
        this.toastr.error(e.message);
      },
    });
  }

  protected sync(): void {
    this.syncing.set(true);
    this.api.post<{ platform: SocialPlatform; ok: boolean; error?: string }[]>('/admin/social-links/sync', {}).subscribe({
      next: (results) => {
        this.syncing.set(false);
        if (!results.length) this.toastr.info('No platforms are set to use API counts.');
        for (const r of results) {
          if (r.ok) this.toastr.success(`${PLATFORM_LABELS[r.platform]} count refreshed.`);
          else this.toastr.error(r.error ?? 'Sync failed', PLATFORM_LABELS[r.platform]);
        }
        this.load();
        this.site.load(true);
      },
      error: (e: ApiError) => {
        this.syncing.set(false);
        this.toastr.error(e.message);
      },
    });
  }
}
