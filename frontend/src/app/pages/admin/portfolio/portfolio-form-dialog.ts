import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ToastrService } from 'ngx-toastr';
import { PortfolioCategory, PortfolioPayload, PortfolioProject } from '../../../core/models/models';
import { ApiError } from '../../../core/services/api-error';
import { ApiService } from '../../../core/services/api.service';
import { PORTFOLIO_CATEGORY_LABELS } from '../../../core/utils/labels';
import { MediaUploadField } from '../shared/media-upload-field';
import { httpUrlValidator, imageSourceValidator, videoSourceValidator } from '../shared/validators';

@Component({
  selector: 'tl-portfolio-form-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatCheckboxModule, MediaUploadField],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Edit project' : 'Add project' }}</h2>
    <form [formGroup]="form" (ngSubmit)="save()" class="tl-form" novalidate>
      <mat-dialog-content>
        <mat-form-field><mat-label>Title</mat-label><input matInput formControlName="title" required maxlength="160" />
          @if (f.title.touched && f.title.invalid) { <mat-error>{{ f.title.errors?.['server'] ?? 'Title is required (2–160 characters).' }}</mat-error> }</mat-form-field>
        <mat-form-field><mat-label>Category</mat-label>
          <mat-select formControlName="category" required>
            @for (c of categories; track c[0]) { <mat-option [value]="c[0]">{{ c[1] }}</mat-option> }
          </mat-select>
          @if (f.category.touched && f.category.invalid) { <mat-error>Choose a category.</mat-error> }</mat-form-field>
        <mat-form-field><mat-label>Description</mat-label><textarea matInput formControlName="description" rows="4" required maxlength="4000"></textarea>
          @if (f.description.touched && f.description.invalid) { <mat-error>{{ f.description.errors?.['server'] ?? 'Description is required (10–4000 characters).' }}</mat-error> }</mat-form-field>
        <tl-media-upload-field [control]="f.thumbnailUrl" kind="image" label="Thumbnail image" />
        <tl-media-upload-field [control]="f.videoUrl" kind="video" label="Video (optional)" hint="Plays on the website when visitors open this project. MP4 or WebM, up to 100 MB." />
        <mat-form-field><mat-label>Project URL (optional)</mat-label><input matInput formControlName="projectUrl" placeholder="https://…" />
          @if (f.projectUrl.touched && f.projectUrl.invalid) { <mat-error>{{ f.projectUrl.errors?.['server'] ?? 'Enter a valid http(s) URL.' }}</mat-error> }</mat-form-field>
        <div class="d-flex flex-column gap-1">
          <mat-checkbox formControlName="isSample">Sample / concept work (shown with a "not a client project" label)</mat-checkbox>
          <mat-checkbox formControlName="isFeatured">Featured on the home page</mat-checkbox>
          <mat-checkbox formControlName="isPublished">Published (visible on the website)</mat-checkbox>
        </div>
        <p class="small text-muted-ink mt-2 mb-0">Only publish real client work with the client's permission. Mark demos as sample work.</p>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button type="button" class="tl-btn tl-btn--outline tl-btn--sm" mat-dialog-close>Cancel</button>
        <button type="submit" class="tl-btn tl-btn--primary tl-btn--sm" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save' }}</button>
      </mat-dialog-actions>
    </form>
  `,
})
export class PortfolioFormDialog {
  protected readonly data = inject<PortfolioProject | null>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<PortfolioFormDialog>);
  private readonly api = inject(ApiService);
  private readonly toastr = inject(ToastrService);
  private readonly fb = inject(FormBuilder);
  protected readonly categories = Object.entries(PORTFOLIO_CATEGORY_LABELS) as [PortfolioCategory, string][];
  protected readonly saving = signal(false);

  readonly form = this.fb.nonNullable.group({
    title: [this.data?.title ?? '', [Validators.required, Validators.minLength(2), Validators.maxLength(160)]],
    category: [this.data?.category ?? ('' as PortfolioCategory | ''), [Validators.required]],
    description: [this.data?.description ?? '', [Validators.required, Validators.minLength(10), Validators.maxLength(4000)]],
    thumbnailUrl: [this.data?.thumbnailUrl ?? '', [imageSourceValidator]],
    videoUrl: [this.data?.videoUrl ?? '', [videoSourceValidator]],
    projectUrl: [this.data?.projectUrl ?? '', [httpUrlValidator]],
    isSample: [this.data?.isSample ?? false],
    isFeatured: [this.data?.isFeatured ?? false],
    isPublished: [this.data?.isPublished ?? false],
  });
  protected readonly f = this.form.controls;

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const payload: PortfolioPayload = {
      ...v,
      category: v.category as PortfolioCategory,
      thumbnailUrl: v.thumbnailUrl.trim() || null,
      videoUrl: v.videoUrl.trim() || null,
      projectUrl: v.projectUrl.trim() || null,
    };
    this.saving.set(true);
    const req = this.data ? this.api.put(`/admin/portfolio/${this.data.id}`, payload) : this.api.post('/admin/portfolio', payload);
    req.subscribe({
      next: () => {
        this.toastr.success('Project saved.');
        this.ref.close(true);
      },
      error: (e: ApiError) => {
        this.saving.set(false);
        for (const [k, msg] of Object.entries(e.fieldErrors)) {
          this.form.get(k)?.setErrors({ server: msg });
          this.form.get(k)?.markAsTouched();
        }
        this.toastr.error(e.message);
      },
    });
  }
}
