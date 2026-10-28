import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { DashboardStats, IntegrationStatus } from '../../../core/models/models';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { DELIVERY_STATUS_LABELS } from '../../../core/utils/labels';
import { ErrorState, LoadingState } from '../../../shared/components/state/states';

@Component({
  selector: 'tl-admin-dashboard-page',
  imports: [DatePipe, MatIconModule, RouterLink, LoadingState, ErrorState],
  template: `
    <div class="tl-admin-page">
      <h1 class="tl-admin-title">Dashboard</h1>
      <p class="text-muted-ink">Welcome back, {{ auth.admin()?.name }}. All figures are live counts from the database.</p>

      @if (loading()) {
        <tl-loading-state />
      } @else if (!stats()) {
        <tl-error-state (retry)="load()" />
      } @else {
        @let s = stats()!;
        <div class="row g-3">
          @for (card of cards(s); track card.label) {
            <div class="col-6 col-lg-3">
              <a class="stat tl-card" [routerLink]="card.link" [class.stat--alert]="card.alert">
                <mat-icon aria-hidden="true">{{ card.icon }}</mat-icon>
                <span class="stat__value">{{ card.value }}</span>
                <span class="stat__label">{{ card.label }}</span>
              </a>
            </div>
          }
        </div>

        @if (auth.isFullAdmin() && integrations(); as i) {
          <h2 class="h5 mt-5 mb-3">Integrations</h2>
          <div class="row g-3">
            <div class="col-12 col-lg-4">
              <div class="integ tl-card">
                <h3 class="h6">Email (SMTP)</h3>
                <span class="tl-badge" [class.tl-badge--orange]="!i.email.configured">{{ i.email.configured ? 'Configured' : 'Not configured' }}</span>
                @if (i.email.lastOutcome; as o) {
                  <p class="small mt-2 mb-1">Last result: <strong>{{ statusLabels[o.status] }}</strong> · {{ o.at | date: 'medium' }}</p>
                  @if (o.error) { <p class="small text-muted-ink mb-0">{{ o.error }}</p> }
                }
                @if (i.email.configured) {
                  <button type="button" class="tl-btn tl-btn--outline tl-btn--sm mt-2" (click)="verifyEmail()" [disabled]="verifying()">
                    {{ verifying() ? 'Checking…' : 'Test SMTP connection' }}
                  </button>
                }
              </div>
            </div>
            <div class="col-12 col-lg-4">
              <div class="integ tl-card">
                <h3 class="h6">WhatsApp Business Platform</h3>
                <span class="tl-badge" [class.tl-badge--orange]="!i.whatsapp.configured">{{ i.whatsapp.configured ? 'Configured' : 'Not configured' }}</span>
                <span class="tl-badge ms-1">{{ i.whatsapp.webhookConfigured ? 'Webhook ready' : 'Webhook not set' }}</span>
                @if (i.whatsapp.lastOutcome; as o) {
                  <p class="small mt-2 mb-1">Last result: <strong>{{ statusLabels[o.status] }}</strong> · {{ o.at | date: 'medium' }}</p>
                  @if (o.error) { <p class="small text-muted-ink mb-0">{{ o.error }}</p> }
                }
                <p class="small text-muted-ink mt-2 mb-0">"Accepted" means Meta accepted the request; "Delivered" is confirmed by the webhook.</p>
              </div>
            </div>
            <div class="col-12 col-lg-4">
              <div class="integ tl-card">
                <h3 class="h6">Follower count APIs</h3>
                <p class="small mb-1">YouTube Data API: <strong>{{ i.socialApis.youtube ? 'Configured' : 'Not configured' }}</strong></p>
                <p class="small mb-1">Meta Graph API: <strong>{{ i.socialApis.meta ? 'Configured' : 'Not configured' }}</strong></p>
                <p class="small text-muted-ink mb-0">Other platforms use manually maintained counts.</p>
              </div>
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: `
    .stat { display: flex; flex-direction: column; gap: 4px; padding: 18px; text-decoration: none; color: var(--tl-black); height: 100%; }
    .stat mat-icon { color: var(--tl-orange); }
    .stat__value { font: 800 2rem/1.1 var(--tl-font-display); }
    .stat__label { color: var(--tl-ink-70); font-size: .9rem; }
    .stat--alert { border: 2px solid var(--tl-orange); }
    .integ { padding: 18px; height: 100%; }
    .integ:hover { transform: none; }
  `,
})
export class AdminDashboardPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toastr = inject(ToastrService);
  protected readonly auth = inject(AuthService);
  protected readonly stats = signal<DashboardStats | null>(null);
  protected readonly integrations = signal<IntegrationStatus | null>(null);
  protected readonly loading = signal(true);
  protected readonly verifying = signal(false);
  protected readonly statusLabels = DELIVERY_STATUS_LABELS;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.get<DashboardStats>('/admin/dashboard').subscribe({
      next: (s) => {
        this.stats.set(s);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    if (this.auth.isFullAdmin()) {
      this.api.get<IntegrationStatus>('/admin/integrations').subscribe({ next: (i) => this.integrations.set(i), error: () => undefined });
    }
  }

  protected cards(s: DashboardStats) {
    const full = this.auth.isFullAdmin();
    return [
      { label: 'Total enquiries', value: s.totalEnquiries, icon: 'inbox', link: full ? '/admin/enquiries' : '/admin', alert: false },
      { label: 'New enquiries', value: s.newEnquiries, icon: 'mark_email_unread', link: full ? '/admin/enquiries' : '/admin', alert: s.newEnquiries > 0 },
      { label: 'Pending / failed notifications', value: s.pendingNotifications + s.failedNotifications, icon: 'notifications_paused', link: full ? '/admin/enquiries' : '/admin', alert: s.failedNotifications > 0 },
      { label: 'Approved feedback', value: s.approvedFeedback, icon: 'verified', link: '/admin/feedback', alert: false },
      { label: 'Feedback awaiting review', value: s.pendingFeedback, icon: 'rate_review', link: '/admin/feedback', alert: s.pendingFeedback > 0 },
      { label: 'Published projects', value: s.publishedProjects, icon: 'collections', link: '/admin/portfolio', alert: false },
      { label: 'Enquiries (last 7 days)', value: s.enquiriesLast7Days, icon: 'trending_up', link: full ? '/admin/enquiries' : '/admin', alert: false },
    ];
  }

  protected verifyEmail(): void {
    this.verifying.set(true);
    this.api.post<{ ok: boolean; error?: string }>('/admin/integrations/email/verify', {}).subscribe({
      next: (r) => {
        this.verifying.set(false);
        if (r.ok) this.toastr.success('The SMTP server accepted the connection and credentials.', 'SMTP OK');
        else this.toastr.error(r.error ?? 'Verification failed', 'SMTP check failed');
      },
      error: (e) => {
        this.verifying.set(false);
        this.toastr.error(e.message);
      },
    });
  }
}
