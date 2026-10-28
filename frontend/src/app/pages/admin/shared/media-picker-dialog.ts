import { Component, inject, OnInit, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MediaFile, MediaKind } from '../../../core/models/models';
import { ApiService } from '../../../core/services/api.service';
import { MediaUrlPipe } from '../../../core/utils/media-url';
import { EmptyState, ErrorState, LoadingState } from '../../../shared/components/state/states';

/** Pick an already-uploaded file. Closes with the chosen MediaFile. */
@Component({
  selector: 'tl-media-picker-dialog',
  imports: [MatDialogModule, MatIconModule, MediaUrlPipe, LoadingState, ErrorState, EmptyState],
  template: `
    <h2 mat-dialog-title>Choose {{ kind === 'image' ? 'an image' : 'a video' }}</h2>
    <mat-dialog-content>
      @if (loading()) {
        <tl-loading-state />
      } @else if (failed()) {
        <tl-error-state (retry)="load()" />
      } @else {
        <div class="grid" role="listbox" [attr.aria-label]="'Uploaded ' + kind + 's'">
          @for (m of items(); track m.id) {
            <button type="button" class="tile" role="option" [attr.aria-selected]="false" (click)="ref.close(m)" [attr.aria-label]="'Select ' + m.originalName">
              @if (m.kind === 'image') {
                <img [src]="m.url | mediaUrl" [alt]="m.originalName" loading="lazy" />
              } @else {
                <video [src]="m.url | mediaUrl" preload="metadata" muted></video>
                <mat-icon class="play" aria-hidden="true">play_circle</mat-icon>
              }
              <span class="name">{{ m.originalName }}</span>
            </button>
          } @empty {
            <tl-empty-state icon="perm_media" title="Nothing uploaded yet">Use the Upload button to add {{ kind === 'image' ? 'images' : 'videos' }}.</tl-empty-state>
          }
        </div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button type="button" class="tl-btn tl-btn--outline tl-btn--sm" mat-dialog-close>Cancel</button>
    </mat-dialog-actions>
  `,
  styles: `
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
    .tile { position: relative; display: flex; flex-direction: column; gap: 6px; padding: 6px; border: 2px solid var(--tl-ink-12); border-radius: 10px; background: var(--tl-white); cursor: pointer; text-align: left; }
    .tile:hover, .tile:focus-visible { border-color: var(--tl-orange); }
    .tile img, .tile video { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: 6px; background: var(--tl-black); }
    .play { position: absolute; top: 40px; left: 50%; transform: translateX(-50%); color: var(--tl-orange); font-size: 40px; width: 40px; height: 40px; }
    .name { font-size: .78rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  `,
})
export class MediaPickerDialog implements OnInit {
  protected readonly kind = inject<MediaKind>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<MediaPickerDialog, MediaFile>);
  private readonly api = inject(ApiService);
  protected readonly items = signal<MediaFile[]>([]);
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.failed.set(false);
    this.api.getPaged<MediaFile>('/admin/media', { kind: this.kind, pageSize: 100 }).subscribe({
      next: (r) => {
        this.items.set(r.items);
        this.loading.set(false);
      },
      error: () => {
        this.failed.set(true);
        this.loading.set(false);
      },
    });
  }
}
