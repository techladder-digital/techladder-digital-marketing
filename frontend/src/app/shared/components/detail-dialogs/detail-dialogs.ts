import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { PortfolioProject, ServiceItem } from '../../../core/models/models';
import { PORTFOLIO_CATEGORY_LABELS, projectTypeForService, SERVICE_CATEGORY_LABELS } from '../../../core/utils/labels';
import { MediaUrlPipe } from '../../../core/utils/media-url';

@Component({
  selector: 'tl-service-detail-dialog',
  imports: [MatDialogModule, MatIconModule],
  template: `
    <h2 mat-dialog-title class="d-flex align-items-center gap-2">
      <mat-icon class="text-orange" aria-hidden="true">{{ s.icon || 'auto_awesome' }}</mat-icon>{{ s.title }}
    </h2>
    <mat-dialog-content>
      <span class="tl-badge tl-badge--orange mb-3">{{ categoryLabels[s.category] }}</span>
      <p class="fw-semibold">{{ s.description }}</p>
      @if (s.details) { <p class="text-muted-ink" style="white-space: pre-line">{{ s.details }}</p> }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button type="button" class="tl-btn tl-btn--outline tl-btn--sm" mat-dialog-close>Close</button>
      <button type="button" class="tl-btn tl-btn--primary tl-btn--sm" (click)="enquire()">Enquire Now</button>
    </mat-dialog-actions>
  `,
})
export class ServiceDetailDialog {
  protected readonly s = inject<ServiceItem>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<ServiceDetailDialog>);
  private readonly router = inject(Router);
  protected readonly categoryLabels = SERVICE_CATEGORY_LABELS;

  protected enquire(): void {
    this.ref.close();
    this.router.navigate(['/contact'], {
      queryParams: { type: projectTypeForService(this.s.category, this.s.title), service: this.s.title },
      fragment: 'enquiry-form',
    });
  }
}

@Component({
  selector: 'tl-portfolio-detail-dialog',
  imports: [MatDialogModule, MatIconModule, MediaUrlPipe],
  template: `
    <h2 mat-dialog-title>{{ p.title }}</h2>
    <mat-dialog-content>
      @if (p.videoUrl) {
        <video class="w-100 rounded-3 mb-3 bg-black" style="max-height: 56vh" controls playsinline preload="metadata"
               [src]="p.videoUrl | mediaUrl" [poster]="p.thumbnailUrl | mediaUrl" [attr.aria-label]="'Video: ' + p.title">
          Your browser cannot play this video.
        </video>
      } @else if (p.thumbnailUrl) {
        <img [src]="p.thumbnailUrl | mediaUrl" [alt]="'Preview of ' + p.title" class="w-100 rounded-3 mb-3" style="max-height: 360px; object-fit: cover" />
      }
      <div class="d-flex flex-wrap gap-2 mb-3">
        <span class="tl-badge tl-badge--dark">{{ labels[p.category] }}</span>
        @if (p.isSample) { <span class="tl-badge tl-badge--orange">Sample / concept work — not a client project</span> }
      </div>
      <p style="white-space: pre-line">{{ p.description }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button type="button" class="tl-btn tl-btn--outline tl-btn--sm" mat-dialog-close>Close</button>
      @if (p.projectUrl) {
        <a class="tl-btn tl-btn--primary tl-btn--sm" [href]="p.projectUrl" target="_blank" rel="noopener noreferrer nofollow">
          Visit project <mat-icon aria-hidden="true">open_in_new</mat-icon>
        </a>
      }
    </mat-dialog-actions>
  `,
})
export class PortfolioDetailDialog {
  protected readonly p = inject<PortfolioProject>(MAT_DIALOG_DATA);
  protected readonly labels = PORTFOLIO_CATEGORY_LABELS;
}
