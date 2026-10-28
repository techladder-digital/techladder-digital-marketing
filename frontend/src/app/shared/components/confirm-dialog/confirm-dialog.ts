import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

/** Usage: dialog.open(ConfirmDialog, { data }).afterClosed() → true when confirmed. */
@Component({
  selector: 'tl-confirm-dialog',
  imports: [MatDialogModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content><p class="mb-0">{{ data.message }}</p></mat-dialog-content>
    <mat-dialog-actions align="end">
      <button type="button" class="tl-btn tl-btn--outline tl-btn--sm" [mat-dialog-close]="false" cdkFocusInitial>{{ data.cancelText ?? 'Cancel' }}</button>
      <button type="button" class="tl-btn tl-btn--sm" [class.tl-btn--dark]="data.destructive" [class.tl-btn--primary]="!data.destructive" [mat-dialog-close]="true">
        {{ data.confirmText ?? 'Confirm' }}
      </button>
    </mat-dialog-actions>
  `,
})
export class ConfirmDialog {
  protected readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
}
