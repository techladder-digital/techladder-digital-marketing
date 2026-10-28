import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs';
import { FeedbackPayload, PublicFeedback, ServiceCategory } from '../../core/models/models';
import { ApiError } from '../../core/services/api-error';
import { ApiService } from '../../core/services/api.service';
import { SERVICE_CATEGORY_LABELS } from '../../core/utils/labels';
import { FeedbackCard } from '../../shared/components/feedback-card/feedback-card';
import { StarRating } from '../../shared/components/star-rating/star-rating';
import { EmptyState, ErrorState, LoadingState } from '../../shared/components/state/states';

@Component({
  selector: 'tl-feedback-page',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatCheckboxModule, FeedbackCard, StarRating, LoadingState, ErrorState, EmptyState],
  template: `
    <section class="tl-section" aria-labelledby="fb-title">
      <div class="container-fluid px-3 px-md-5">
        <span class="tl-eyebrow">Customer feedback</span>
        <h1 id="fb-title" class="tl-heading">What our customers say</h1>
        <p class="tl-lead">Every review here was submitted by a customer, approved by our team, and published only with the customer's permission.</p>

        <div class="mt-4" aria-live="polite">
          @if (loading()) {
            <tl-loading-state label="Loading feedback…" />
          } @else if (failed()) {
            <tl-error-state message="We couldn't load customer feedback right now." (retry)="load()" />
          } @else {
            <div class="row g-4">
              @for (f of items(); track f.id) {
                <div class="col-12 col-md-6 col-xl-4"><tl-feedback-card [feedback]="f" /></div>
              } @empty {
                <div class="col-12">
                  <tl-empty-state icon="reviews" title="No published feedback yet">
                    Be one of the first to share your experience using the form below.
                  </tl-empty-state>
                </div>
              }
            </div>
          }
        </div>
      </div>
    </section>

    <section class="tl-section tl-section--tint" aria-labelledby="share-title">
      <div class="container-fluid px-3 px-md-5">
        <div class="row justify-content-center">
          <div class="col-12 col-xl-8">
            <div class="tl-form-panel">
              <h2 id="share-title" class="h4">Share your feedback</h2>
              <p class="text-muted-ink">Your feedback is reviewed before anything is published.</p>

              @if (submitted()) {
                <div class="done" role="status">
                  <h3 class="h5">Thank you for your feedback!</h3>
                  <p class="mb-3 text-muted-ink">It has been received and is awaiting review by our team.</p>
                  <button type="button" class="tl-btn tl-btn--outline tl-btn--sm" (click)="submitted.set(false)">Submit another response</button>
                </div>
              } @else {
                <form class="tl-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
                  <div class="row g-3">
                    <div class="col-12 col-md-6">
                      <mat-form-field>
                        <mat-label>Your name</mat-label>
                        <input matInput formControlName="customerName" autocomplete="name" required maxlength="120" />
                        @if (err('customerName'); as e) { <mat-error>{{ e }}</mat-error> }
                      </mat-form-field>
                    </div>
                    <div class="col-12 col-md-6">
                      <mat-form-field>
                        <mat-label>Business name (optional)</mat-label>
                        <input matInput formControlName="businessName" autocomplete="organization" maxlength="160" />
                      </mat-form-field>
                    </div>
                    <div class="col-12 col-md-6">
                      <mat-form-field>
                        <mat-label>Service category</mat-label>
                        <mat-select formControlName="serviceCategory" required>
                          @for (c of categories; track c[0]) { <mat-option [value]="c[0]">{{ c[1] }}</mat-option> }
                        </mat-select>
                        @if (err('serviceCategory'); as e) { <mat-error>{{ e }}</mat-error> }
                      </mat-form-field>
                    </div>
                    <div class="col-12 col-md-6">
                      <mat-form-field>
                        <mat-label>Project name</mat-label>
                        <input matInput formControlName="projectName" required maxlength="160" />
                        @if (err('projectName'); as e) { <mat-error>{{ e }}</mat-error> }
                      </mat-form-field>
                    </div>
                    <div class="col-12">
                      <span class="d-block fw-semibold mb-1" id="rating-label">Rating <span aria-hidden="true">*</span></span>
                      <tl-star-rating formControlName="rating" label="Rating, 1 to 5 stars" [invalid]="!!err('rating')" />
                      @if (err('rating'); as e) { <div class="tl-field-error mt-1" role="alert">{{ e }}</div> }
                    </div>
                    <div class="col-12">
                      <mat-form-field>
                        <mat-label>Your feedback</mat-label>
                        <textarea matInput formControlName="feedbackMessage" rows="5" required maxlength="2000"></textarea>
                        @if (err('feedbackMessage'); as e) { <mat-error>{{ e }}</mat-error> }
                      </mat-form-field>
                    </div>
                    <div class="tl-honeypot" aria-hidden="true">
                      <label for="fb-website">Leave this field empty</label>
                      <input id="fb-website" type="text" formControlName="website" tabindex="-1" autocomplete="off" />
                    </div>
                    <div class="col-12">
                      <mat-checkbox formControlName="consentToPublish">
                        I agree that TechLadder may publish my name, business name and feedback on this website.
                      </mat-checkbox>
                      <p class="small text-muted-ink mb-0 mt-1">Optional. Without this permission your feedback stays private and is only read by our team.</p>
                    </div>
                    <div class="col-12">
                      <button type="submit" class="tl-btn tl-btn--primary" [disabled]="sending()" [attr.aria-busy]="sending()">
                        {{ sending() ? 'Submitting…' : 'Submit feedback' }}
                      </button>
                    </div>
                  </div>
                </form>
              }
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: `.done { padding: 16px 0; }`,
})
export class FeedbackPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly toastr = inject(ToastrService);

  protected readonly categories = Object.entries(SERVICE_CATEGORY_LABELS) as [ServiceCategory, string][];
  protected readonly items = signal<PublicFeedback[]>([]);
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);
  protected readonly sending = signal(false);
  protected readonly submitted = signal(false);

  readonly form = this.fb.nonNullable.group({
    customerName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    businessName: ['', [Validators.maxLength(160)]],
    serviceCategory: ['' as ServiceCategory | '', [Validators.required]],
    projectName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(160)]],
    rating: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
    feedbackMessage: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(2000)]],
    consentToPublish: [false],
    website: [''],
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.failed.set(false);
    this.api.get<PublicFeedback[]>('/feedback/public', { limit: 24 }).subscribe({
      next: (f) => {
        this.items.set(f);
        this.loading.set(false);
      },
      error: () => {
        this.failed.set(true);
        this.loading.set(false);
      },
    });
  }

  protected err(name: keyof typeof this.form.controls): string | null {
    const c = this.form.controls[name];
    if (!c.errors || !c.touched) return null;
    if (c.errors['server']) return c.errors['server'];
    if (name === 'rating') return 'Please select a rating from 1 to 5 stars.';
    if (c.errors['required']) return 'This field is required.';
    if (c.errors['minlength']) return `Please enter at least ${c.errors['minlength'].requiredLength} characters.`;
    if (c.errors['maxlength']) return `Please keep this under ${c.errors['maxlength'].requiredLength} characters.`;
    return 'Please check this field.';
  }

  submit(): void {
    if (this.sending()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastr.error('Please correct the highlighted fields.', 'Check the form');
      return;
    }
    const v = this.form.getRawValue();
    const payload: FeedbackPayload = {
      customerName: v.customerName.trim(),
      businessName: v.businessName.trim() || null,
      serviceCategory: v.serviceCategory as ServiceCategory,
      projectName: v.projectName.trim(),
      rating: v.rating,
      feedbackMessage: v.feedbackMessage.trim(),
      consentToPublish: v.consentToPublish,
      ...(v.website ? { website: v.website } : {}),
    };
    this.sending.set(true);
    this.api
      .post<{ id: number }>('/feedback', payload)
      .pipe(finalize(() => this.sending.set(false)))
      .subscribe({
        next: () => {
          this.submitted.set(true);
          this.form.reset();
          this.toastr.success('Your feedback was received and will be reviewed.', 'Thank you!');
        },
        error: (e: ApiError) => {
          for (const [field, msg] of Object.entries(e.fieldErrors)) {
            const c = this.form.get(field);
            c?.setErrors({ server: msg });
            c?.markAsTouched();
          }
          this.toastr.error(e.message, 'Feedback not sent');
        },
      });
  }
}
