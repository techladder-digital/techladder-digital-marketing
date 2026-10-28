import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { Enquiry, EnquiryStatus, PageMeta, ProjectType } from '../../../core/models/models';
import { ApiService } from '../../../core/services/api.service';
import { PROJECT_TYPE_LABELS } from '../../../core/utils/labels';
import { EmptyState, ErrorState, LoadingState } from '../../../shared/components/state/states';

export const ENQUIRY_STATUS_LABELS: Record<EnquiryStatus, string> = {
  new: 'New', contacted: 'Contacted', in_progress: 'In progress', closed: 'Closed', spam: 'Spam',
};

@Component({
  selector: 'tl-admin-enquiries-page',
  imports: [DatePipe, FormsModule, RouterLink, MatFormFieldModule, MatInputModule, MatSelectModule, MatPaginatorModule, LoadingState, ErrorState, EmptyState],
  template: `
    <div class="tl-admin-page">
      <h1 class="tl-admin-title">Enquiries</h1>
      <p class="text-muted-ink">Private customer enquiries. Handle according to your privacy policy.</p>

      <form class="filters" (ngSubmit)="applyFilters()" role="search">
        <mat-form-field>
          <mat-label>Search</mat-label>
          <input matInput name="search" [(ngModel)]="search" maxlength="100" placeholder="Name, email, business, service" />
        </mat-form-field>
        <mat-form-field>
          <mat-label>Status</mat-label>
          <mat-select name="status" [(ngModel)]="status" (selectionChange)="applyFilters()">
            <mat-option value="">All</mat-option>
            @for (s of statuses; track s[0]) { <mat-option [value]="s[0]">{{ s[1] }}</mat-option> }
          </mat-select>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Project type</mat-label>
          <mat-select name="projectType" [(ngModel)]="projectType" (selectionChange)="applyFilters()">
            <mat-option value="">All</mat-option>
            @for (t of types; track t[0]) { <mat-option [value]="t[0]">{{ t[1] }}</mat-option> }
          </mat-select>
        </mat-form-field>
        <button type="submit" class="tl-btn tl-btn--dark tl-btn--sm">Search</button>
      </form>

      @if (loading()) {
        <tl-loading-state />
      } @else if (failed()) {
        <tl-error-state (retry)="load()" />
      } @else if (items().length === 0) {
        <tl-empty-state icon="inbox" title="No enquiries found">Try changing the filters.</tl-empty-state>
      } @else {
        <div class="tl-table-wrap">
          <table class="tl-table">
            <caption class="visually-hidden">Enquiries</caption>
            <thead><tr><th scope="col">#</th><th scope="col">Received</th><th scope="col">Name</th><th scope="col">Service</th><th scope="col">Contact</th><th scope="col">Status</th><th scope="col"><span class="visually-hidden">Actions</span></th></tr></thead>
            <tbody>
              @for (e of items(); track e.id) {
                <tr>
                  <td>{{ e.id }}</td>
                  <td>{{ e.createdAt | date: 'd MMM y, h:mm a' }}</td>
                  <td><strong>{{ e.fullName }}</strong>@if (e.businessName) {<br /><span class="text-muted-ink small">{{ e.businessName }}</span>}</td>
                  <td>{{ e.serviceName }}<br /><span class="text-muted-ink small">{{ typeLabels[e.projectType] }}</span></td>
                  <td class="small">{{ e.email }}<br />{{ e.phone }}</td>
                  <td><span class="tl-badge" [class.tl-badge--orange]="e.enquiryStatus === 'new'">{{ statusLabels[e.enquiryStatus] }}</span></td>
                  <td><a class="tl-btn tl-btn--outline tl-btn--sm" [routerLink]="['/admin/enquiries', e.id]" [attr.aria-label]="'Open enquiry ' + e.id">Open</a></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        @if (meta(); as m) {
          <mat-paginator [length]="m.total" [pageIndex]="m.page - 1" [pageSize]="m.pageSize" [pageSizeOptions]="[10, 20, 50]" (page)="onPage($event)" aria-label="Enquiry pages" />
        }
      }
    </div>
  `,
  styles: `.filters { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 8px; } .filters mat-form-field { min-width: 200px; flex: 1 1 200px; }`,
})
export class AdminEnquiriesPage implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly statuses = Object.entries(ENQUIRY_STATUS_LABELS) as [EnquiryStatus, string][];
  protected readonly types = Object.entries(PROJECT_TYPE_LABELS) as [ProjectType, string][];
  protected readonly statusLabels = ENQUIRY_STATUS_LABELS;
  protected readonly typeLabels = PROJECT_TYPE_LABELS;
  protected readonly items = signal<Enquiry[]>([]);
  protected readonly meta = signal<PageMeta | null>(null);
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);
  protected search = '';
  protected status: EnquiryStatus | '' = '';
  protected projectType: ProjectType | '' = '';
  private page = 1;
  private pageSize = 20;

  ngOnInit(): void {
    this.load();
  }

  applyFilters(): void {
    this.page = 1;
    this.load();
  }

  onPage(e: PageEvent): void {
    this.page = e.pageIndex + 1;
    this.pageSize = e.pageSize;
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.failed.set(false);
    this.api
      .getPaged<Enquiry>('/admin/enquiries', { page: this.page, pageSize: this.pageSize, search: this.search.trim(), status: this.status, projectType: this.projectType })
      .subscribe({
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
}
