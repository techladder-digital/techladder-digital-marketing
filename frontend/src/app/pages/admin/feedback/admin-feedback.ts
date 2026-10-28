import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { ToastrService } from 'ngx-toastr';
import { AdminFeedback, ModerationStatus, PageMeta } from '../../../core/models/models';
import { ApiError } from '../../../core/services/api-error';
import { ApiService } from '../../../core/services/api.service';
import { SERVICE_CATEGORY_LABELS } from '../../../core/utils/labels';
import { StarRating } from '../../../shared/components/star-rating/star-rating';
import { EmptyState, ErrorState, LoadingState } from '../../../shared/components/state/states';

@Component({
  selector: 'tl-admin-feedback-page',
  imports: [DatePipe, MatButtonToggleModule, MatPaginatorModule, StarRating, LoadingState, ErrorState, EmptyState],
  template: `
    <div class="tl-admin-page">
      <h1 class="tl-admin-title">Feedback moderation</h1>
      <p class="text-muted-ink">Only approved feedback from customers who consented to publication appears on the website.</p>

      <mat-button-toggle-group [value]="status()" (change)="setStatus($event.value)" aria-label="Filter by moderation status" class="mb-3">
        <mat-button-toggle value="pending">Pending</mat-button-toggle>
        <mat-button-toggle value="approved">Approved</mat-button-toggle>
        <mat-button-toggle value="rejected">Rejected</mat-button-toggle>
        <mat-button-toggle value="">All</mat-button-toggle>
      </mat-button-toggle-group>

      @if (loading()) {
        <tl-loading-state />
      } @else if (failed()) {
        <tl-error-state (retry)="load()" />
      } @else {
        @for (f of items(); track f.id) {
          <article class="fb">
            <div class="d-flex flex-wrap justify-content-between gap-2">
              <div>
                <strong>{{ f.customerName }}</strong>@if (f.businessName) { <span class="text-muted-ink">, {{ f.businessName }}</span> }
                <div class="small text-muted-ink">{{ categories[f.serviceCategory] }} · {{ f.projectName }} · {{ f.createdAt | date: 'medium' }}</div>
              </div>
              <div class="d-flex gap-2 align-items-start flex-wrap">
                <span class="tl-badge" [class.tl-badge--orange]="f.moderationStatus === 'pending'">{{ f.moderationStatus }}</span>
                <span class="tl-badge" [class.tl-badge--dark]="f.consentToPublish">{{ f.consentToPublish ? 'Consented to publish' : 'Private — no consent' }}</span>
              </div>
            </div>
            <tl-star-rating [readonly]="true" [value]="f.rating" />
            <p class="msg">{{ f.feedbackMessage }}</p>
            <div class="d-flex gap-2 flex-wrap">
              @if (f.moderationStatus !== 'approved') {
                <button type="button" class="tl-btn tl-btn--primary tl-btn--sm" [disabled]="!f.consentToPublish || busy() === f.id"
                        (click)="moderate(f, 'approved')" [attr.aria-describedby]="!f.consentToPublish ? 'noconsent-' + f.id : null">Approve</button>
                @if (!f.consentToPublish) { <span class="small text-muted-ink align-self-center" [id]="'noconsent-' + f.id">Cannot be published without customer consent.</span> }
              }
              @if (f.moderationStatus !== 'rejected') {
                <button type="button" class="tl-btn tl-btn--outline tl-btn--sm" [disabled]="busy() === f.id" (click)="moderate(f, 'rejected')">Reject</button>
              }
              @if (f.moderationStatus !== 'pending') {
                <button type="button" class="tl-btn tl-btn--outline tl-btn--sm" [disabled]="busy() === f.id" (click)="moderate(f, 'pending')">Move to pending</button>
              }
            </div>
          </article>
        } @empty {
          <tl-empty-state icon="reviews" title="No feedback in this view" />
        }
        @if (meta(); as m) {
          @if (m.total > m.pageSize) {
            <mat-paginator [length]="m.total" [pageIndex]="m.page - 1" [pageSize]="m.pageSize" (page)="onPage($event)" aria-label="Feedback pages" />
          }
        }
      }
    </div>
  `,
  styles: `
    .fb { background: var(--tl-white); border: 1px solid var(--tl-ink-12); border-radius: var(--tl-radius); padding: 18px; margin-bottom: 12px; display: grid; gap: 8px; }
    .msg { white-space: pre-wrap; margin: 0; }
  `,
})
export class AdminFeedbackPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toastr = inject(ToastrService);
  protected readonly categories = SERVICE_CATEGORY_LABELS;
  protected readonly status = signal<ModerationStatus | ''>('pending');
  protected readonly items = signal<AdminFeedback[]>([]);
  protected readonly meta = signal<PageMeta | null>(null);
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);
  protected readonly busy = signal<number | null>(null);
  private page = 1;

  ngOnInit(): void {
    this.load();
  }

  setStatus(s: ModerationStatus | ''): void {
    this.status.set(s);
    this.page = 1;
    this.load();
  }

  onPage(e: PageEvent): void {
    this.page = e.pageIndex + 1;
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.failed.set(false);
    this.api.getPaged<AdminFeedback>('/admin/feedback', { status: this.status(), page: this.page, pageSize: 20 }).subscribe({
      next: (r) => {
        this.items.set(r.items);
        this.meta.set(r.meta);
        this.loading.set(false);
      },
      error: () => {
        this.failed.set(true);
        this.loading.set(false);
      },
    });
  }

  protected moderate(f: AdminFeedback, status: ModerationStatus): void {
    this.busy.set(f.id);
    this.api.patch(`/admin/feedback/${f.id}/moderation`, { status }).subscribe({
      next: () => {
        this.busy.set(null);
        this.toastr.success(`Feedback ${status === 'pending' ? 'moved to pending' : status}.`);
        this.load();
      },
      error: (e: ApiError) => {
        this.busy.set(null);
        this.toastr.error(e.message);
      },
    });
  }
}
