import { Component, DestroyRef, inject, input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ToastrService } from 'ngx-toastr';
import { MediaFile, MediaKind } from '../../../core/models/models';
import { ApiError } from '../../../core/services/api-error';
import { UPLOAD_LIMITS, UploadService } from '../../../core/services/upload.service';
import { MediaUrlPipe } from '../../../core/utils/media-url';
import { MediaPickerDialog } from './media-picker-dialog';

let nextId = 0;

/**
 * A form field for an image/video source with three ways to fill it:
 *   1. "Upload" from the computer (with progress), 2. "Library" (pick an earlier upload), 3. type/paste a URL.
 * Usage: <tl-media-upload-field [control]="form.controls.thumbnailUrl" kind="image" label="Thumbnail" />
 */
@Component({
  selector: 'tl-media-upload-field',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatIconModule, MatProgressBarModule, MediaUrlPipe],
  template: `
    <div class="muf">
      <div class="muf__row">
        <div class="muf__preview" [class.muf__preview--empty]="!showPreview()">
          @if (showPreview()) {
            @if (kind() === 'image') {
              <img [src]="control().value | mediaUrl" [alt]="label() + ' preview'" (error)="previewFailed.set(true)" (load)="previewFailed.set(false)" />
            } @else {
              <video [src]="control().value | mediaUrl" preload="metadata" controls muted (error)="previewFailed.set(true)"></video>
            }
          } @else {
            <mat-icon aria-hidden="true">{{ kind() === 'image' ? 'image' : 'movie' }}</mat-icon>
          }
        </div>
        <div class="muf__body">
          <mat-form-field>
            <mat-label>{{ label() }}</mat-label>
            <input matInput [formControl]="control()" [placeholder]="kind() === 'image' ? 'Upload, choose from library, or paste https://…' : 'Upload an MP4/WebM, or paste https://…/video.mp4'" />
            <mat-hint>{{ hint() || (limits.label + ', up to ' + limits.mb + ' MB') }}</mat-hint>
            @if (control().invalid && control().touched) {
              <mat-error>{{ control().errors?.['server'] ?? (kind() === 'image' ? 'Use Upload, the library, an https:// image URL or an /assets/ path.' : 'Use Upload, the library, or an https:// link to an .mp4/.webm file.') }}</mat-error>
            }
          </mat-form-field>
          <div class="muf__actions">
            <input #fileInput type="file" class="visually-hidden" [id]="inputId" [accept]="limits.accept" (change)="onFile(fileInput)" tabindex="-1" />
            <button type="button" class="tl-btn tl-btn--dark tl-btn--sm" (click)="fileInput.click()" [disabled]="uploading()">
              <mat-icon aria-hidden="true">upload</mat-icon>{{ uploading() ? 'Uploading…' : 'Upload' }}
            </button>
            <button type="button" class="tl-btn tl-btn--outline tl-btn--sm" (click)="openLibrary()" [disabled]="uploading()">
              <mat-icon aria-hidden="true">photo_library</mat-icon>Library
            </button>
            @if (control().value) {
              <button type="button" class="tl-btn tl-btn--outline tl-btn--sm" (click)="clear()" [disabled]="uploading()" [attr.aria-label]="'Remove ' + label()">
                <mat-icon aria-hidden="true">close</mat-icon>Remove
              </button>
            }
          </div>
          @if (uploading()) {
            <mat-progress-bar mode="determinate" [value]="percent()" [attr.aria-label]="'Upload progress ' + percent() + '%'" />
            <span class="small text-muted-ink" aria-live="polite">{{ percent() }}%</span>
          }
        </div>
      </div>
    </div>
  `,
  styles: `
    .muf { margin: 4px 0 12px; }
    .muf__row { display: flex; gap: 14px; align-items: flex-start; }
    .muf__preview { width: 120px; flex-shrink: 0; aspect-ratio: 4 / 3; border-radius: 10px; overflow: hidden; background: var(--tl-black); display: grid; place-items: center; border: 1px solid var(--tl-ink-12); }
    .muf__preview--empty { background: var(--tl-ink-06); }
    .muf__preview--empty mat-icon { color: var(--tl-ink-50); font-size: 36px; width: 36px; height: 36px; }
    .muf__preview img, .muf__preview video { width: 100%; height: 100%; object-fit: cover; }
    .muf__body { flex: 1; min-width: 0; }
    .muf__actions { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0 6px; }
    @media (max-width: 575.98px) { .muf__row { flex-direction: column; } .muf__preview { width: 100%; max-width: 240px; } }
  `,
})
export class MediaUploadField implements OnInit {
  private readonly uploads = inject(UploadService);
  private readonly dialog = inject(MatDialog);
  private readonly toastr = inject(ToastrService);
  private readonly destroyRef = inject(DestroyRef);

  readonly control = input.required<FormControl<string>>();
  readonly kind = input<MediaKind>('image');
  readonly label = input('Image');
  readonly hint = input<string>('');

  protected readonly inputId = `tl-media-file-${nextId++}`;
  protected readonly uploading = signal(false);
  protected readonly percent = signal(0);
  protected readonly previewFailed = signal(false);
  protected limits = UPLOAD_LIMITS.image;

  ngOnInit(): void {
    this.limits = UPLOAD_LIMITS[this.kind()];
    this.control()
      .valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.previewFailed.set(false));
  }

  protected showPreview(): boolean {
    return !!this.control().value && this.control().valid && !this.previewFailed();
  }

  protected onFile(el: HTMLInputElement): void {
    const file = el.files?.[0];
    el.value = ''; // allow choosing the same file again
    if (!file) return;
    const problem = this.uploads.precheck(file, this.kind());
    if (problem) {
      this.toastr.error(problem, 'Cannot upload');
      return;
    }
    this.uploading.set(true);
    this.percent.set(0);
    this.uploads
      .upload(file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => {
          if (p.state === 'progress') this.percent.set(p.percent);
          else this.apply(p.file, 'Uploaded');
        },
        error: (e: ApiError) => {
          this.uploading.set(false);
          this.toastr.error(e.message, 'Upload failed');
        },
        complete: () => this.uploading.set(false),
      });
  }

  protected openLibrary(): void {
    this.dialog
      .open(MediaPickerDialog, { data: this.kind(), width: '760px', maxWidth: '95vw' })
      .afterClosed()
      .subscribe((m?: MediaFile) => m && this.apply(m, 'Selected'));
  }

  protected clear(): void {
    this.control().setValue('');
    this.control().markAsDirty();
  }

  private apply(m: MediaFile, verb: string): void {
    this.control().setValue(m.url);
    this.control().markAsDirty();
    this.control().markAsTouched();
    this.toastr.success(`${verb} "${m.originalName}". Remember to save.`);
  }
}
