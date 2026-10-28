import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ToastrService } from 'ngx-toastr';
import { concatMap, filter, from, map, switchMap } from 'rxjs';
import { MediaFile, MediaKind, PageMeta } from '../../../core/models/models';
import { ApiError } from '../../../core/services/api-error';
import { ApiService } from '../../../core/services/api.service';
import { UploadService } from '../../../core/services/upload.service';
import { formatBytes, mediaUrl, MediaUrlPipe } from '../../../core/utils/media-url';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { EmptyState, ErrorState, LoadingState } from '../../../shared/components/state/states';

interface QueueItem {
  name: string;
  percent: number;
  status: 'waiting' | 'uploading' | 'done' | 'error';
  error?: string;
}

@Component({
  selector: 'tl-admin-media-page',
  imports: [DatePipe, MatIconModule, MatButtonToggleModule, MatPaginatorModule, MatProgressBarModule, MediaUrlPipe, LoadingState, ErrorState, EmptyState],
  template: `
    <div class="tl-admin-page">
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h1 class="tl-admin-title">Media library</h1>
          <p class="text-muted-ink mb-0">Upload photos (JPG, PNG, WebP, GIF up to 5 MB) and videos (MP4, WebM up to 100 MB), then use them in Portfolio, Services and Website settings.</p>
        </div>
        <div>
          <input #files type="file" class="visually-hidden" multiple accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" (change)="uploadMany(files)" tabindex="-1" />
          <button type="button" class="tl-btn tl-btn--primary" (click)="files.click()">
            <mat-icon aria-hidden="true">cloud_upload</mat-icon>Upload photos / videos
          </button>
        </div>
      </div>

      <div class="drop" [class.drop--over]="dragOver()" (dragover)="$event.preventDefault(); dragOver.set(true)" (dragleave)="dragOver.set(false)" (drop)="onDrop($event)">
        <mat-icon aria-hidden="true">upload_file</mat-icon>
        <span>Drag &amp; drop files here, or use the Upload button.</span>
      </div>

      @if (queue().length) {
        <ul class="queue" aria-label="Upload progress" aria-live="polite">
          @for (q of queue(); track $index) {
            <li>
              <span class="queue__name">{{ q.name }}</span>
              @switch (q.status) {
                @case ('uploading') { <mat-progress-bar mode="determinate" [value]="q.percent" /> <span>{{ q.percent }}%</span> }
                @case ('waiting') { <span class="text-muted-ink">Waiting…</span> }
                @case ('done') { <span class="tl-badge tl-badge--dark">Uploaded</span> }
                @case ('error') { <span class="tl-badge tl-badge--solid">{{ q.error }}</span> }
              }
            </li>
          }
        </ul>
      }

      <mat-button-toggle-group [value]="kind()" (change)="setKind($event.value)" aria-label="Filter by type" class="my-3">
        <mat-button-toggle value="">All</mat-button-toggle>
        <mat-button-toggle value="image">Photos</mat-button-toggle>
        <mat-button-toggle value="video">Videos</mat-button-toggle>
      </mat-button-toggle-group>

      @if (loading()) {
        <tl-loading-state />
      } @else if (failed()) {
        <tl-error-state (retry)="load()" />
      } @else {
        <div class="grid">
          @for (m of items(); track m.id) {
            <figure class="card">
              <div class="card__media">
                @if (m.kind === 'image') {
                  <img [src]="m.url | mediaUrl" [alt]="m.originalName" loading="lazy" />
                } @else {
                  <video [src]="m.url | mediaUrl" preload="metadata" controls></video>
                }
              </div>
              <figcaption>
                <strong class="card__name" [title]="m.originalName">{{ m.originalName }}</strong>
                <span class="small text-muted-ink">{{ size(m.sizeBytes) }} · {{ m.createdAt | date: 'd MMM y' }}</span>
                <div class="d-flex gap-2 mt-2">
                  <button type="button" class="tl-btn tl-btn--outline tl-btn--sm" (click)="copy(m)" [attr.aria-label]="'Copy link of ' + m.originalName">
                    <mat-icon aria-hidden="true">link</mat-icon>Copy link
                  </button>
                  <button type="button" class="tl-btn tl-btn--dark tl-btn--sm" (click)="remove(m)" [attr.aria-label]="'Delete ' + m.originalName">
                    <mat-icon aria-hidden="true">delete</mat-icon>
                  </button>
                </div>
              </figcaption>
            </figure>
          } @empty {
            <tl-empty-state icon="perm_media" title="No files yet">Upload photos and videos to use them across the website.</tl-empty-state>
          }
        </div>
        @if (meta(); as mt) {
          @if (mt.total > mt.pageSize) {
            <mat-paginator [length]="mt.total" [pageIndex]="mt.page - 1" [pageSize]="mt.pageSize" (page)="onPage($event)" aria-label="Media pages" />
          }
        }
      }
    </div>
  `,
  styles: `
    .drop { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 22px; border: 2px dashed var(--tl-ink-12); border-radius: var(--tl-radius); background: var(--tl-white); color: var(--tl-ink-70); }
    .drop--over { border-color: var(--tl-orange); background: var(--tl-orange-soft); }
    .drop mat-icon { color: var(--tl-orange); }
    .queue { list-style: none; padding: 0; margin: 12px 0 0; display: grid; gap: 8px; }
    .queue li { display: grid; grid-template-columns: minmax(0, 1fr) 160px 48px; gap: 10px; align-items: center; background: var(--tl-white); border: 1px solid var(--tl-ink-12); border-radius: 10px; padding: 8px 12px; }
    .queue li > .tl-badge { justify-self: start; }
    .queue__name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
    .card { margin: 0; background: var(--tl-white); border: 1px solid var(--tl-ink-12); border-radius: var(--tl-radius); overflow: hidden; }
    .card__media { aspect-ratio: 4 / 3; background: var(--tl-black); }
    .card__media img, .card__media video { width: 100%; height: 100%; object-fit: cover; display: block; }
    figcaption { padding: 12px; display: flex; flex-direction: column; gap: 2px; }
    .card__name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .92rem; }
    @media (max-width: 575.98px) { .queue li { grid-template-columns: 1fr; } }
  `,
})
export class AdminMediaPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly uploads = inject(UploadService);
  private readonly dialog = inject(MatDialog);
  private readonly toastr = inject(ToastrService);

  protected readonly items = signal<MediaFile[]>([]);
  protected readonly meta = signal<PageMeta | null>(null);
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);
  protected readonly kind = signal<MediaKind | ''>('');
  protected readonly queue = signal<QueueItem[]>([]);
  protected readonly dragOver = signal(false);
  protected readonly size = formatBytes;
  private page = 1;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.failed.set(false);
    this.api.getPaged<MediaFile>('/admin/media', { kind: this.kind(), page: this.page, pageSize: 48 }).subscribe({
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

  setKind(k: MediaKind | ''): void {
    this.kind.set(k);
    this.page = 1;
    this.load();
  }

  onPage(e: PageEvent): void {
    this.page = e.pageIndex + 1;
    this.load();
  }

  protected onDrop(e: DragEvent): void {
    e.preventDefault();
    this.dragOver.set(false);
    if (e.dataTransfer?.files?.length) this.start(Array.from(e.dataTransfer.files));
  }

  protected uploadMany(el: HTMLInputElement): void {
    const files = Array.from(el.files ?? []);
    el.value = '';
    this.start(files);
  }

  /** Uploads one file at a time so progress is clear and the server isn't flooded. */
  private start(files: File[]): void {
    if (!files.length) return;
    const offset = this.queue().length;
    this.queue.update((q) => [...q, ...files.map((f) => ({ name: f.name, percent: 0, status: 'waiting' as const }))]);
    const patch = (i: number, p: Partial<QueueItem>) => this.queue.update((q) => q.map((it, idx) => (idx === offset + i ? { ...it, ...p } : it)));

    from(files.map((f, i) => ({ f, i })))
      .pipe(
        concatMap(({ f, i }) => {
          const kind: MediaKind = f.type.startsWith('video/') ? 'video' : 'image';
          const problem = this.uploads.precheck(f, kind);
          if (problem) {
            patch(i, { status: 'error', error: problem });
            return [];
          }
          patch(i, { status: 'uploading' });
          return this.uploads.upload(f).pipe(
            map((p) => ({ p, i })),
          );
        }),
      )
      .subscribe({
        next: ({ p, i }) => {
          if (p.state === 'progress') patch(i, { percent: p.percent });
          else {
            patch(i, { status: 'done', percent: 100 });
            this.load();
          }
        },
        error: (e: ApiError) => {
          this.queue.update((q) => q.map((it) => (it.status === 'uploading' ? { ...it, status: 'error', error: e.message } : it)));
          this.toastr.error(e.message, 'Upload failed');
        },
      });
  }

  protected async copy(m: MediaFile): Promise<void> {
    const text = m.url;
    try {
      await navigator.clipboard.writeText(text);
      this.toastr.success('Link copied. Paste it into any image or video field.');
    } catch {
      this.toastr.info(mediaUrl(text), 'Copy this link');
    }
  }

  protected remove(m: MediaFile): void {
    this.api
      .get<{ usedIn: string[] }>(`/admin/media/${m.id}/usages`)
      .pipe(
        switchMap(({ usedIn }) =>
          this.dialog
            .open(ConfirmDialog, {
              data: {
                title: 'Delete file?',
                message: usedIn.length
                  ? `"${m.originalName}" is used in: ${usedIn.join(', ')}. Those places will show no image/video after deleting.`
                  : `"${m.originalName}" will be permanently deleted.`,
                confirmText: 'Delete',
                destructive: true,
              },
            })
            .afterClosed(),
        ),
        filter(Boolean),
        switchMap(() => this.api.delete(`/admin/media/${m.id}`)),
      )
      .subscribe({
        next: () => {
          this.toastr.success('File deleted.');
          this.load();
        },
        error: (e: ApiError) => this.toastr.error(e.message),
      });
  }
}
