import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ToastrService } from 'ngx-toastr';
import { filter, switchMap } from 'rxjs';
import { ServiceCategory, ServiceItem } from '../../../core/models/models';
import { ApiError } from '../../../core/services/api-error';
import { ApiService } from '../../../core/services/api.service';
import { SERVICE_CATEGORY_LABELS } from '../../../core/utils/labels';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { ErrorState, LoadingState } from '../../../shared/components/state/states';
import { ServiceFormDialog } from './service-form-dialog';

@Component({
  selector: 'tl-admin-services-page',
  imports: [MatIconModule, LoadingState, ErrorState],
  template: `
    <div class="tl-admin-page">
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h1 class="tl-admin-title">Services</h1>
          <p class="text-muted-ink mb-0">Edit the services shown on the Services and Home pages.</p>
        </div>
        <button type="button" class="tl-btn tl-btn--primary" (click)="edit(null)"><mat-icon aria-hidden="true">add</mat-icon>Add service</button>
      </div>
      @if (loading()) {
        <tl-loading-state />
      } @else if (failed()) {
        <tl-error-state (retry)="load()" />
      } @else {
        @for (group of groups(); track group.category) {
          <h2 class="h5 mt-4">{{ labels[group.category] }} <span class="tl-badge">{{ group.items.length }}</span></h2>
          <div class="tl-table-wrap">
            <table class="tl-table">
              <caption class="visually-hidden">{{ labels[group.category] }} services</caption>
              <thead><tr><th scope="col">Order</th><th scope="col">Service</th><th scope="col">Status</th><th scope="col"><span class="visually-hidden">Actions</span></th></tr></thead>
              <tbody>
                @for (s of group.items; track s.id) {
                  <tr>
                    <td>{{ s.displayOrder }}</td>
                    <td><div class="d-flex gap-2 align-items-center"><mat-icon class="text-orange" aria-hidden="true">{{ s.icon || 'auto_awesome' }}</mat-icon><strong>{{ s.title }}</strong></div>
                      <span class="small text-muted-ink">{{ s.description }}</span></td>
                    <td><span class="tl-badge" [class.tl-badge--dark]="s.isActive">{{ s.isActive ? 'Active' : 'Hidden' }}</span></td>
                    <td class="text-nowrap">
                      <button type="button" class="tl-btn tl-btn--outline tl-btn--sm me-2" (click)="edit(s)">Edit</button>
                      <button type="button" class="tl-btn tl-btn--dark tl-btn--sm" (click)="remove(s)" [attr.aria-label]="'Delete ' + s.title">Delete</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }
    </div>
  `,
})
export class AdminServicesPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly dialog = inject(MatDialog);
  private readonly toastr = inject(ToastrService);
  protected readonly labels = SERVICE_CATEGORY_LABELS;
  private readonly items = signal<ServiceItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);
  protected readonly groups = computed(() =>
    (['digital_marketing', 'website_software'] as ServiceCategory[]).map((category) => ({
      category,
      items: this.items().filter((s) => s.category === category),
    })),
  );

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.failed.set(false);
    this.api.get<ServiceItem[]>('/admin/services').subscribe({
      next: (s) => {
        this.items.set(s);
        this.loading.set(false);
      },
      error: () => {
        this.failed.set(true);
        this.loading.set(false);
      },
    });
  }

  protected edit(s: ServiceItem | null): void {
    this.dialog.open(ServiceFormDialog, { data: s, width: '640px', maxWidth: '95vw' }).afterClosed().subscribe((ok) => ok && this.load());
  }

  protected remove(s: ServiceItem): void {
    this.dialog
      .open(ConfirmDialog, {
        data: { title: 'Delete service?', message: `"${s.title}" will be permanently deleted. To hide it temporarily, edit it and untick "Active" instead.`, confirmText: 'Delete', destructive: true },
      })
      .afterClosed()
      .pipe(filter(Boolean), switchMap(() => this.api.delete(`/admin/services/${s.id}`)))
      .subscribe({
        next: () => {
          this.toastr.success('Service deleted.');
          this.load();
        },
        error: (e: ApiError) => this.toastr.error(e.message),
      });
  }
}
