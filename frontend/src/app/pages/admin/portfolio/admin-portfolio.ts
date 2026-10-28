import { Component, inject, OnInit, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ToastrService } from 'ngx-toastr';
import { filter, switchMap } from 'rxjs';
import { PortfolioProject } from '../../../core/models/models';
import { ApiError } from '../../../core/services/api-error';
import { ApiService } from '../../../core/services/api.service';
import { PORTFOLIO_CATEGORY_LABELS } from '../../../core/utils/labels';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { EmptyState, ErrorState, LoadingState } from '../../../shared/components/state/states';
import { PortfolioFormDialog } from './portfolio-form-dialog';

@Component({
  selector: 'tl-admin-portfolio-page',
  imports: [MatIconModule, MatSlideToggleModule, LoadingState, ErrorState, EmptyState],
  template: `
    <div class="tl-admin-page">
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h1 class="tl-admin-title">Portfolio</h1>
          <p class="text-muted-ink mb-0">Create, edit, publish and remove portfolio projects.</p>
        </div>
        <button type="button" class="tl-btn tl-btn--primary" (click)="edit(null)"><mat-icon aria-hidden="true">add</mat-icon>Add project</button>
      </div>
      @if (loading()) {
        <tl-loading-state />
      } @else if (failed()) {
        <tl-error-state (retry)="load()" />
      } @else if (items().length === 0) {
        <tl-empty-state icon="collections" title="No projects yet">Add your first project. Unpublished projects stay hidden from visitors.</tl-empty-state>
      } @else {
        <div class="tl-table-wrap">
          <table class="tl-table">
            <caption class="visually-hidden">Portfolio projects</caption>
            <thead><tr><th scope="col">Project</th><th scope="col">Category</th><th scope="col">Published</th><th scope="col">Featured</th><th scope="col"><span class="visually-hidden">Actions</span></th></tr></thead>
            <tbody>
              @for (p of items(); track p.id) {
                <tr>
                  <td><strong>{{ p.title }}</strong>@if (p.isSample) { <span class="tl-badge tl-badge--orange ms-1">Sample</span> }@if (p.videoUrl) { <span class="tl-badge ms-1">Video</span> }</td>
                  <td>{{ labels[p.category] }}</td>
                  <td><mat-slide-toggle [checked]="p.isPublished" (change)="toggle(p, 'isPublished', $event.checked)" [attr.aria-label]="'Published: ' + p.title" /></td>
                  <td><mat-slide-toggle [checked]="p.isFeatured" (change)="toggle(p, 'isFeatured', $event.checked)" [attr.aria-label]="'Featured: ' + p.title" /></td>
                  <td class="text-nowrap">
                    <button type="button" class="tl-btn tl-btn--outline tl-btn--sm me-2" (click)="edit(p)">Edit</button>
                    <button type="button" class="tl-btn tl-btn--dark tl-btn--sm" (click)="remove(p)" [attr.aria-label]="'Delete ' + p.title">Delete</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
})
export class AdminPortfolioPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly dialog = inject(MatDialog);
  private readonly toastr = inject(ToastrService);
  protected readonly labels = PORTFOLIO_CATEGORY_LABELS;
  protected readonly items = signal<PortfolioProject[]>([]);
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.failed.set(false);
    this.api.get<PortfolioProject[]>('/admin/portfolio').subscribe({
      next: (p) => {
        this.items.set(p);
        this.loading.set(false);
      },
      error: () => {
        this.failed.set(true);
        this.loading.set(false);
      },
    });
  }

  protected edit(p: PortfolioProject | null): void {
    this.dialog
      .open(PortfolioFormDialog, { data: p, width: '720px', maxWidth: '95vw' })
      .afterClosed()
      .subscribe((saved) => saved && this.load());
  }

  protected toggle(p: PortfolioProject, field: 'isPublished' | 'isFeatured', value: boolean): void {
    const payload = {
      title: p.title, category: p.category, description: p.description, thumbnailUrl: p.thumbnailUrl, videoUrl: p.videoUrl,
      projectUrl: p.projectUrl, isSample: p.isSample, isFeatured: p.isFeatured, isPublished: p.isPublished, [field]: value,
    };
    this.api.put(`/admin/portfolio/${p.id}`, payload).subscribe({
      next: () => {
        this.toastr.success('Project updated.');
        this.load();
      },
      error: (e: ApiError) => {
        this.toastr.error(e.message);
        this.load();
      },
    });
  }

  protected remove(p: PortfolioProject): void {
    this.dialog
      .open(ConfirmDialog, { data: { title: 'Delete project?', message: `"${p.title}" will be permanently deleted.`, confirmText: 'Delete', destructive: true } })
      .afterClosed()
      .pipe(
        filter(Boolean),
        switchMap(() => this.api.delete(`/admin/portfolio/${p.id}`)),
      )
      .subscribe({
        next: () => {
          this.toastr.success('Project deleted.');
          this.load();
        },
        error: (e: ApiError) => this.toastr.error(e.message),
      });
  }
}
