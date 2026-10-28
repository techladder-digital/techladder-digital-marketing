import { Component, computed, DestroyRef, effect, inject, input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { ToastrService } from 'ngx-toastr';
import { catchError, finalize, of, startWith } from 'rxjs';
import { EnquiryPayload, EnquiryResult, ProjectType, ServiceItem } from '../../../core/models/models';
import { ApiError } from '../../../core/services/api-error';
import { ApiService } from '../../../core/services/api.service';
import { SiteDataService } from '../../../core/services/site-data.service';
import { BUDGET_RANGES, PROJECT_TYPE_LABELS, projectTypeForService } from '../../../core/utils/labels';

const PHONE_PATTERN = /^\+?[0-9\s\-()]{7,25}$/;
const OTHER_SERVICE = 'Other / Not sure yet';

@Component({
  selector: 'tl-enquiry-form',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatRadioModule, MatCheckboxModule, MatIconModule],
  templateUrl: './enquiry-form.html',
  styleUrl: './enquiry-form.scss',
})
export class EnquiryForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly toastr = inject(ToastrService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly site = inject(SiteDataService);

  /** Preselection from "Enquire Now" (query params ?type=&service=). */
  readonly presetType = input<string | null | undefined>(null);
  readonly presetService = input<string | null | undefined>(null);

  protected readonly projectTypes = Object.entries(PROJECT_TYPE_LABELS) as [ProjectType, string][];
  protected readonly budgets = BUDGET_RANGES;
  protected readonly submitting = signal(false);
  protected readonly result = signal<EnquiryResult | null>(null);
  protected readonly submittedService = signal('');
  private readonly services = signal<ServiceItem[]>([]);

  readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    businessName: ['', [Validators.maxLength(160)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(190)]],
    phone: ['', [Validators.required, Validators.pattern(PHONE_PATTERN), phoneDigits]],
    projectType: ['' as ProjectType | '', [Validators.required]],
    serviceName: ['', [Validators.required, Validators.maxLength(160)]],
    budgetRange: [''],
    message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(3000)]],
    preferredContactMethod: ['email' as 'email' | 'whatsapp' | 'both', [Validators.required]],
    consentToContact: [false, [Validators.requiredTrue]],
    website: [''], // honeypot (hidden from people, bots tend to fill it)
  });

  private readonly selectedType = toSignal(
    this.form.controls.projectType.valueChanges.pipe(startWith(this.form.controls.projectType.value)),
    { initialValue: '' as ProjectType | '' },
  );

  protected readonly serviceOptions = computed(() => {
    const type = this.selectedType();
    const titles = this.services()
      .filter((s) => (type ? projectTypeForService(s.category, s.title) === type : true))
      .map((s) => s.title);
    const preset = this.presetService();
    if (preset && type === this.presetType() && !titles.includes(preset)) titles.unshift(preset);
    return [...titles, OTHER_SERVICE];
  });

  protected readonly messageLength = toSignal(this.form.controls.message.valueChanges.pipe(startWith('')), { initialValue: '' });

  constructor() {
    // Apply "Enquire Now" preselection whenever the inputs change.
    effect(() => {
      const type = this.presetType();
      const service = this.presetService();
      if (type && type in PROJECT_TYPE_LABELS) {
        this.form.controls.projectType.setValue(type as ProjectType);
        if (service) this.form.controls.serviceName.setValue(service.slice(0, 160));
      }
    });
  }

  ngOnInit(): void {
    this.api
      .get<ServiceItem[]>('/services')
      .pipe(catchError(() => of([] as ServiceItem[])), takeUntilDestroyed(this.destroyRef))
      .subscribe((list) => this.services.set(list));

    // Changing the project type clears a service that no longer belongs to it.
    this.form.controls.projectType.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      const current = this.form.controls.serviceName.value;
      if (current && !this.serviceOptions().includes(current)) this.form.controls.serviceName.setValue('');
    });
  }

  protected error(name: keyof typeof this.form.controls): string | null {
    const c = this.form.controls[name];
    if (!c.errors || !(c.touched || c.dirty)) return null;
    const e = c.errors;
    if (e['server']) return e['server'];
    if (e['required']) return requiredMessage(name);
    if (e['requiredTrue']) return 'Please agree to be contacted so we can reply to your enquiry.';
    if (e['email']) return 'Enter a valid email address.';
    if (e['pattern'] || e['phoneDigits']) return 'Enter a valid phone number (7–15 digits, optional +country code).';
    if (e['minlength']) return `Please enter at least ${e['minlength'].requiredLength} characters.`;
    if (e['maxlength']) return `Please keep this under ${e['maxlength'].requiredLength} characters.`;
    return 'Please check this field.';
  }

  submit(): void {
    if (this.submitting()) return; // duplicate-submit guard
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastr.error('Please correct the highlighted fields.', 'Check the form');
      focusFirstInvalid();
      return;
    }
    const v = this.form.getRawValue();
    const payload: EnquiryPayload = {
      fullName: v.fullName.trim(),
      businessName: v.businessName.trim() || null,
      email: v.email.trim(),
      phone: v.phone.trim(),
      projectType: v.projectType as ProjectType,
      serviceName: v.serviceName,
      budgetRange: v.budgetRange || null,
      message: v.message.trim(),
      preferredContactMethod: v.preferredContactMethod,
      consentToContact: true,
      ...(v.website ? { website: v.website } : {}),
    };

    this.submitting.set(true);
    this.form.disable({ emitEvent: false });
    this.api
      .post<EnquiryResult>('/enquiries', payload)
      .pipe(
        // The form is re-enabled inside next/error BEFORE server errors are applied,
        // because enable() recalculates validity and would clear them.
        finalize(() => this.submitting.set(false)),
      )
      .subscribe({
        next: (res) => {
          this.form.enable({ emitEvent: false });
          // Success is shown ONLY after the API confirms the enquiry was saved.
          this.submittedService.set(payload.serviceName);
          this.result.set(res);
          this.toastr.success(`Your enquiry #${res.enquiryId} has been received.`, 'Thank you!');
          this.form.reset({ preferredContactMethod: 'email', consentToContact: false });
        },
        error: (err: ApiError) => {
          this.form.enable({ emitEvent: false });
          this.applyServerErrors(err);
          this.toastr.error(err.message, 'Enquiry not sent');
        },
      });
  }

  protected whatsappFollowUp(): string | null {
    const r = this.result();
    if (!r) return null;
    return this.site.whatsappWith(`Hello TechLadder, I just submitted enquiry #${r.enquiryId} about "${this.submittedService()}".`);
  }

  protected startAnother(): void {
    this.result.set(null);
  }

  private applyServerErrors(err: ApiError): void {
    for (const [field, message] of Object.entries(err.fieldErrors ?? {})) {
      const control = this.form.get(field);
      if (control) {
        control.setErrors({ ...(control.errors ?? {}), server: message });
        control.markAsTouched();
      }
    }
    if (Object.keys(err.fieldErrors ?? {}).length) focusFirstInvalid();
  }
}

function phoneDigits(control: { value: string }) {
  const digits = (control.value ?? '').replace(/\D/g, '').length;
  return !control.value || (digits >= 7 && digits <= 15) ? null : { phoneDigits: true };
}

function requiredMessage(name: string): string {
  const labels: Record<string, string> = {
    fullName: 'Please enter your full name.',
    email: 'Please enter your email address.',
    phone: 'Please enter your phone number.',
    projectType: 'Please choose a project type.',
    serviceName: 'Please choose a service.',
    message: 'Please tell us about your project.',
    preferredContactMethod: 'Please choose how we should contact you.',
  };
  return labels[name] ?? 'This field is required.';
}

function focusFirstInvalid(): void {
  setTimeout(() => {
    const el = document.querySelector<HTMLElement>(
      'tl-enquiry-form .ng-invalid[formControlName] input, tl-enquiry-form .ng-invalid[formControlName] textarea, tl-enquiry-form mat-select.ng-invalid, tl-enquiry-form input.ng-invalid, tl-enquiry-form textarea.ng-invalid',
    );
    el?.focus();
  });
}
