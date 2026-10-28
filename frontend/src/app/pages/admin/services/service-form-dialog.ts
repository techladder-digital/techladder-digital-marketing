import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ToastrService } from 'ngx-toastr';
import { ServiceCategory, ServiceItem, ServicePayload } from '../../../core/models/models';
import { ApiError } from '../../../core/services/api-error';
import { ApiService } from '../../../core/services/api.service';
import { SERVICE_CATEGORY_LABELS } from '../../../core/utils/labels';
import { MediaUploadField } from '../shared/media-upload-field';
import { imageSourceValidator } from '../shared/validators';

@Component({
  selector: 'tl-service-form-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatCheckboxModule, MatIconModule, MediaUploadField],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Edit service' : 'Add service' }}</h2>
    <form [formGroup]="form" (ngSubmit)="save()" class="tl-form" novalidate>
      <mat-dialog-content>
        <mat-form-field><mat-label>Category</mat-label>
          <mat-select formControlName="category" required>
            @for (c of categories; track c[0]) { <mat-option [value]="c[0]">{{ c[1] }}</mat-option> }
          </mat-select></mat-form-field>
        <mat-form-field><mat-label>Title</mat-label><input matInput formControlName="title" required maxlength="160" />
          @if (f.title.touched && f.title.invalid) { <mat-error>{{ f.title.errors?.['server'] ?? 'Title is required (2–160 characters).' }}</mat-error> }</mat-form-field>
        <mat-form-field><mat-label>URL slug (optional)</mat-label><input matInput formControlName="slug" maxlength="180" />
          <mat-hint>Lowercase words separated by hyphens. Generated from the title if left blank.</mat-hint>
          @if (f.slug.touched && f.slug.invalid) { <mat-error>{{ f.slug.errors?.['server'] ?? 'Use lowercase letters, digits and single hyphens.' }}</mat-error> }</mat-form-field>
        <mat-form-field><mat-label>Short description</mat-label><textarea matInput formControlName="description" rows="3" required maxlength="600"></textarea>
          @if (f.description.touched && f.description.invalid) { <mat-error>{{ f.description.errors?.['server'] ?? 'Description is required (10–600 characters).' }}</mat-error> }</mat-form-field>
        <mat-form-field><mat-label>Details for "Learn More" (optional)</mat-label><textarea matInput formControlName="details" rows="4" maxlength="5000"></textarea></mat-form-field>
        <div class="row g-2">
          <div class="col-8"><mat-form-field><mat-label>Material icon name</mat-label><input matInput formControlName="icon" maxlength="60" placeholder="e.g. campaign" />
            @if (f.icon.value) { <mat-icon matSuffix aria-hidden="true">{{ f.icon.value }}</mat-icon> }
            @if (f.icon.touched && f.icon.invalid) { <mat-error>Lowercase letters, digits and underscores only.</mat-error> }</mat-form-field></div>
          <div class="col-4"><mat-form-field><mat-label>Order</mat-label><input matInput type="number" formControlName="displayOrder" min="0" max="10000" /></mat-form-field></div>
        </div>
        <tl-media-upload-field [control]="f.imageUrl" kind="image" label="Image (optional — replaces the icon on the card)" />
        <mat-checkbox formControlName="isActive">Active (shown on the website)</mat-checkbox>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button type="button" class="tl-btn tl-btn--outline tl-btn--sm" mat-dialog-close>Cancel</button>
        <button type="submit" class="tl-btn tl-btn--primary tl-btn--sm" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save' }}</button>
      </mat-dialog-actions>
    </form>
  `,
})
export class ServiceFormDialog {
  protected readonly data = inject<ServiceItem | null>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<ServiceFormDialog>);
  private readonly api = inject(ApiService);
  private readonly toastr = inject(ToastrService);
  private readonly fb = inject(FormBuilder);
  protected readonly categories = Object.entries(SERVICE_CATEGORY_LABELS) as [ServiceCategory, string][];
  protected readonly saving = signal(false);

  readonly form = this.fb.nonNullable.group({
    category: [this.data?.category ?? ('digital_marketing' as ServiceCategory), [Validators.required]],
    title: [this.data?.title ?? '', [Validators.required, Validators.minLength(2), Validators.maxLength(160)]],
    slug: [this.data?.slug ?? '', [Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), Validators.maxLength(180)]],
    description: [this.data?.description ?? '', [Validators.required, Validators.minLength(10), Validators.maxLength(600)]],
    details: [this.data?.details ?? '', [Validators.maxLength(5000)]],
    icon: [this.data?.icon ?? '', [Validators.pattern(/^[a-z0-9_]{1,60}$/)]],
    imageUrl: [this.data?.imageUrl ?? '', [imageSourceValidator]],
    isActive: [this.data?.isActive ?? true],
    displayOrder: [this.data?.displayOrder ?? 0, [Validators.min(0), Validators.max(10000)]],
  });
  protected readonly f = this.form.controls;

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const payload: Partial<ServicePayload> = {
      ...v,
      slug: v.slug.trim() || undefined,
      details: v.details.trim() || null,
      icon: v.icon.trim() || null,
      imageUrl: v.imageUrl.trim() || null,
      displayOrder: Number(v.displayOrder) || 0,
    };
    if (payload.slug === undefined) delete payload.slug;
    this.saving.set(true);
    const req = this.data ? this.api.put(`/admin/services/${this.data.id}`, payload) : this.api.post('/admin/services', payload);
    req.subscribe({
      next: () => {
        this.toastr.success('Service saved.');
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
