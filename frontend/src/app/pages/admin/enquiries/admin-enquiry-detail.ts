import { DatePipe } from '@angular/common';
import { Component, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { DeliveryStatus, Enquiry, EnquiryStatus } from '../../../core/models/models';
import { ApiError } from '../../../core/services/api-error';
import { ApiService } from '../../../core/services/api.service';
import { DELIVERY_STATUS_LABELS, mailtoLink, PROJECT_TYPE_LABELS, telLink, whatsappLink } from '../../../core/utils/labels';
import { ErrorState, LoadingState } from '../../../shared/components/state/states';
import { ENQUIRY_STATUS_LABELS } from './admin-enquiries';

@Component({
  selector: 'tl-admin-enquiry-detail-page',
  imports: [DatePipe, FormsModule, RouterLink, MatFormFieldModule, MatSelectModule, LoadingState, ErrorState],
  template: `
    <div class="tl-admin-page">
      <a routerLink="/admin/enquiries" class="small">← All enquiries</a>
      @if (loading()) {
        <tl-loading-state />
      } @else if (!enquiry()) {
        <tl-error-state title="Enquiry not available" [message]="error() ?? 'It may have been removed.'" (retry)="load()" />
      } @else {
        @let e = enquiry()!;
        <div class="d-flex flex-wrap justify-content-between align-items-start gap-3 mt-2">
          <div>
            <h1 class="tl-admin-title">Enquiry #{{ e.id }}</h1>
            <p class="text-muted-ink mb-0">Received {{ e.createdAt | date: 'medium' }}</p>
          </div>
          <mat-form-field style="min-width: 220px">
            <mat-label>Status</mat-label>
            <mat-select [ngModel]="e.enquiryStatus" (ngModelChange)="setStatus($event)" [disabled]="saving()">
              @for (s of statuses; track s[0]) { <mat-option [value]="s[0]">{{ s[1] }}</mat-option> }
            </mat-select>
          </mat-form-field>
        </div>

        <div class="row g-3 mt-1">
          <div class="col-12 col-lg-7">
            <section class="panel" aria-labelledby="cust-h">
              <h2 id="cust-h" class="h6">Customer</h2>
              <dl class="kv">
                <dt>Name</dt><dd>{{ e.fullName }}</dd>
                <dt>Business</dt><dd>{{ e.businessName || '—' }}</dd>
                <dt>Email</dt><dd><a [href]="mail(e.email)">{{ e.email }}</a></dd>
                <dt>Phone</dt><dd><a [href]="tel(e.phone)">{{ e.phone }}</a>
                  @if (wa(e.phone); as w) { · <a [href]="w" target="_blank" rel="noopener noreferrer">WhatsApp</a> }</dd>
                <dt>Prefers</dt><dd>{{ e.preferredContactMethod === 'both' ? 'Email & WhatsApp' : (e.preferredContactMethod === 'email' ? 'Email' : 'WhatsApp') }}</dd>
                <dt>Project type</dt><dd>{{ typeLabels[e.projectType] }}</dd>
                <dt>Service</dt><dd>{{ e.serviceName }}</dd>
                <dt>Budget</dt><dd>{{ e.budgetRange || '—' }}</dd>
                <dt>Consent</dt><dd>{{ e.consentToContact ? 'Agreed to be contacted' : 'No' }}</dd>
              </dl>
              <h3 class="h6 mt-3">Message</h3>
              <p class="msg">{{ e.message }}</p>
            </section>
          </div>
          <div class="col-12 col-lg-5">
            <section class="panel" aria-labelledby="notif-h">
              <h2 id="notif-h" class="h6">Notifications</h2>
              @for (n of e.notifications ?? []; track n.id) {
                <div class="notif">
                  <div class="d-flex justify-content-between align-items-center gap-2">
                    <strong>{{ n.channel === 'email' ? 'Email' : 'WhatsApp' }}</strong>
                    <span class="tl-badge" [class.tl-badge--orange]="n.deliveryStatus === 'failed'">{{ statusLabel(n.deliveryStatus) }}</span>
                  </div>
                  <p class="small text-muted-ink mb-1">Attempts: {{ n.attemptCount }} · Updated {{ n.updatedAt | date: 'short' }}</p>
                  @if (n.errorMessage) { <p class="small mb-1">{{ n.errorMessage }}</p> }
                  @if (n.nextRetryAt) { <p class="small mb-1">Next automatic retry: {{ n.nextRetryAt | date: 'short' }}</p> }
                  @if (n.deliveryStatus === 'failed' || n.deliveryStatus === 'pending' || n.deliveryStatus === 'skipped') {
                    <button type="button" class="tl-btn tl-btn--outline tl-btn--sm mt-1" (click)="retry(n.id)" [disabled]="saving()">Retry now</button>
                  }
                </div>
              }
              <p class="small text-muted-ink mt-2 mb-0">
                "Accepted by provider" means the email server or WhatsApp API accepted the message. It is not proof that the message reached the recipient.
              </p>
            </section>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .panel { background: var(--tl-white); border: 1px solid var(--tl-ink-12); border-radius: var(--tl-radius); padding: 20px; height: 100%; }
    .kv { display: grid; grid-template-columns: 130px 1fr; gap: 8px 12px; margin: 0; }
    .kv dt { color: var(--tl-ink-70); font-weight: 600; }
    .kv dd { margin: 0; word-break: break-word; }
    .msg { white-space: pre-wrap; background: var(--tl-ink-06); padding: 14px; border-radius: 10px; }
    .notif { padding: 12px 0; border-bottom: 1px solid var(--tl-ink-12); }
    @media (max-width: 575.98px) { .kv { grid-template-columns: 1fr; } .kv dd { margin-bottom: 8px; } }
  `,
})
export class AdminEnquiryDetailPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toastr = inject(ToastrService);
  readonly id = input.required<string>();

  protected readonly enquiry = signal<Enquiry | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly statuses = Object.entries(ENQUIRY_STATUS_LABELS) as [EnquiryStatus, string][];
  protected readonly typeLabels = PROJECT_TYPE_LABELS;
  protected mail = (e: string) => mailtoLink(e) ?? '';
  protected tel = (p: string) => telLink(p) ?? '';
  protected wa = (p: string) => whatsappLink(p);
  protected statusLabel = (s: DeliveryStatus) => DELIVERY_STATUS_LABELS[s];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.get<Enquiry>(`/admin/enquiries/${encodeURIComponent(this.id())}`).subscribe({
      next: (e) => {
        this.enquiry.set(e);
        this.loading.set(false);
      },
      error: (err: ApiError) => {
        this.error.set(err.message);
        this.loading.set(false);
      },
    });
  }

  protected setStatus(status: EnquiryStatus): void {
    this.saving.set(true);
    this.api.patch(`/admin/enquiries/${this.enquiry()!.id}/status`, { status }).subscribe({
      next: () => {
        this.enquiry.update((e) => (e ? { ...e, enquiryStatus: status } : e));
        this.saving.set(false);
        this.toastr.success('Status updated.');
      },
      error: (err: ApiError) => {
        this.saving.set(false);
        this.toastr.error(err.message);
      },
    });
  }

  protected retry(logId: number): void {
    this.saving.set(true);
    this.api.post<{ status: DeliveryStatus }>(`/admin/notifications/${logId}/retry`, {}).subscribe({
      next: (r) => {
        this.saving.set(false);
        this.toastr.info(`Result: ${DELIVERY_STATUS_LABELS[r.status]}`);
        this.load();
      },
      error: (err: ApiError) => {
        this.saving.set(false);
        this.toastr.error(err.message);
      },
    });
  }
}
