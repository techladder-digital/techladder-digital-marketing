import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs';
import { SiteSettings } from '../../../core/models/models';
import { ApiError } from '../../../core/services/api-error';
import { ApiService } from '../../../core/services/api.service';
import { SiteDataService } from '../../../core/services/site-data.service';
import { ErrorState, LoadingState } from '../../../shared/components/state/states';
import { MediaUploadField } from '../shared/media-upload-field';
import { httpsUrlValidator, imageSourceValidator } from '../shared/validators';

type Key = keyof SiteSettings;

@Component({
  selector: 'tl-admin-settings-page',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, LoadingState, ErrorState, MediaUploadField],
  template: `
    <div class="tl-admin-page">
      <h1 class="tl-admin-title">Website settings</h1>
      <p class="text-muted-ink">Contact details, hero banner, logo and footer. Credentials for email and WhatsApp are configured on the server, not here.</p>

      @if (loading()) {
        <tl-loading-state />
      } @else if (failed()) {
        <tl-error-state (retry)="load()" />
      } @else {
        <form [formGroup]="form" (ngSubmit)="save()" class="tl-form" novalidate>
          <section class="panel" aria-labelledby="s-contact">
            <h2 id="s-contact" class="h6">Contact details</h2>
            <div class="row g-3">
              <div class="col-12 col-md-6"><mat-form-field><mat-label>Business email</mat-label><input matInput type="email" formControlName="business_email" />
                @if (bad('business_email'); as e) { <mat-error>{{ e }}</mat-error> }</mat-form-field></div>
              <div class="col-12 col-md-6"><mat-form-field><mat-label>WhatsApp number</mat-label><input matInput formControlName="whatsapp_number" placeholder="919876543210" />
                <mat-hint>International format with country code, digits only</mat-hint>
                @if (bad('whatsapp_number'); as e) { <mat-error>{{ e }}</mat-error> }</mat-form-field></div>
              <div class="col-12 col-md-6"><mat-form-field><mat-label>Business phone</mat-label><input matInput type="tel" formControlName="business_phone" />
                @if (bad('business_phone'); as e) { <mat-error>{{ e }}</mat-error> }</mat-form-field></div>
              <div class="col-12 col-md-6"><mat-form-field><mat-label>Google Maps URL</mat-label><input matInput formControlName="google_maps_url" placeholder="https://maps.google.com/…" />
                @if (bad('google_maps_url'); as e) { <mat-error>{{ e }}</mat-error> }</mat-form-field></div>
              <div class="col-12 col-md-6"><mat-form-field><mat-label>Business address</mat-label><textarea matInput formControlName="business_address" rows="2"></textarea></mat-form-field></div>
              <div class="col-12 col-md-6"><mat-form-field><mat-label>Business hours</mat-label><textarea matInput formControlName="business_hours" rows="2" placeholder="Mon–Sat, 9:30 AM – 6:30 PM"></textarea></mat-form-field></div>
              <div class="col-12"><mat-form-field><mat-label>WhatsApp prefilled message</mat-label><input matInput formControlName="whatsapp_prefill_message" maxlength="300" /></mat-form-field></div>
            </div>
          </section>

          <section class="panel" aria-labelledby="s-brand">
            <h2 id="s-brand" class="h6">Brand &amp; hero banner</h2>
            <div class="row g-3">
              <div class="col-12 col-md-6"><mat-form-field><mat-label>Company name</mat-label><input matInput formControlName="company_name" maxlength="120" /></mat-form-field></div>
              <div class="col-12"><tl-media-upload-field [control]="form.controls.logo_url" kind="image" label="Logo image" hint="Square image works best (e.g. 512×512 PNG)." /></div>
              <div class="col-12"><mat-form-field><mat-label>Hero headline</mat-label><input matInput formControlName="hero_headline" maxlength="160" /></mat-form-field></div>
              <div class="col-12"><mat-form-field><mat-label>Hero subheading</mat-label><textarea matInput formControlName="hero_subheading" rows="2" maxlength="300"></textarea></mat-form-field></div>
              <div class="col-12"><tl-media-upload-field [control]="form.controls.hero_image_url" kind="image" label="Hero banner image" hint="Wide image works best (e.g. 1440×1080). JPG/PNG/WebP up to 5 MB." /></div>
              <div class="col-12"><mat-form-field><mat-label>Company introduction (home page)</mat-label><textarea matInput formControlName="company_intro" rows="4" maxlength="1500"></textarea></mat-form-field></div>
              <div class="col-12"><mat-form-field><mat-label>Footer text</mat-label><textarea matInput formControlName="footer_text" rows="2" maxlength="400"></textarea></mat-form-field></div>
            </div>
          </section>

          <button type="submit" class="tl-btn tl-btn--primary" [disabled]="saving() || form.pristine">{{ saving() ? 'Saving…' : 'Save settings' }}</button>
        </form>
      }
    </div>
  `,
  styles: `
    .panel { background: var(--tl-white); border: 1px solid var(--tl-ink-12); border-radius: var(--tl-radius); padding: 20px; margin-bottom: 16px; }
    .preview { width: 100%; max-height: 120px; object-fit: cover; border-radius: 10px; border: 1px solid var(--tl-ink-12); }
  `,
})
export class AdminSettingsPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly toastr = inject(ToastrService);
  private readonly site = inject(SiteDataService);
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);
  protected readonly saving = signal(false);

  readonly form = this.fb.nonNullable.group({
    company_name: ['', Validators.maxLength(120)],
    hero_headline: ['', Validators.maxLength(160)],
    hero_subheading: ['', Validators.maxLength(300)],
    hero_image_url: ['', imageSourceValidator],
    logo_url: ['', imageSourceValidator],
    company_intro: ['', Validators.maxLength(1500)],
    business_email: ['', Validators.email],
    whatsapp_number: ['', Validators.pattern(/^\+?[\d\s\-()]{8,20}$/)],
    business_phone: ['', Validators.pattern(/^\+?[0-9\s\-()]{7,25}$/)],
    business_address: ['', Validators.maxLength(400)],
    google_maps_url: ['', httpsUrlValidator],
    business_hours: ['', Validators.maxLength(300)],
    footer_text: ['', Validators.maxLength(400)],
    whatsapp_prefill_message: ['', Validators.maxLength(300)],
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.failed.set(false);
    this.api.get<SiteSettings>('/admin/settings').subscribe({
      next: (s) => {
        const values: Record<string, string> = {};
        for (const k of Object.keys(this.form.controls)) values[k] = s[k as Key] ?? '';
        this.form.reset(values);
        this.loading.set(false);
      },
      error: () => {
        this.failed.set(true);
        this.loading.set(false);
      },
    });
  }

  protected bad(key: Key): string | null {
    const c = this.form.controls[key];
    if (!c.invalid || !c.touched) return null;
    if (c.errors?.['server']) return c.errors['server'];
    if (key === 'hero_image_url' || key === 'logo_url') return 'Use an https:// URL or an /assets/ path to an image.';
    if (key === 'google_maps_url') return 'Enter a valid https:// URL.';
    if (key === 'whatsapp_number') return 'Use international format, e.g. 919876543210.';
    if (key === 'business_email') return 'Enter a valid email address.';
    return 'Please check this value.';
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    // Send only the fields that changed.
    const changed: Record<string, string> = {};
    for (const [k, c] of Object.entries(this.form.controls)) if (c.dirty) changed[k] = String(c.value ?? '').trim();
    this.saving.set(true);
    this.api
      .put<SiteSettings>('/admin/settings', changed)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.toastr.success('Settings saved. The website now shows the new details.');
          this.form.markAsPristine();
          this.site.load(true);
        },
        error: (e: ApiError) => {
          for (const [k, msg] of Object.entries(e.fieldErrors)) {
            const c = this.form.get(k);
            c?.setErrors({ server: msg });
            c?.markAsTouched();
          }
          this.toastr.error(e.message);
        },
      });
  }
}
