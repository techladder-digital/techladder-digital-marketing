import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { errorInterceptor } from '../../../core/interceptors/error.interceptor';
import { EnquiryForm } from './enquiry-form';

describe('EnquiryForm (Angular form validation + API handling)', () => {
  let fixture: ComponentFixture<EnquiryForm>;
  let component: EnquiryForm;
  let http: HttpTestingController;
  const toastr = { success: jest.fn(), error: jest.fn(), info: jest.fn() };

  const fillValid = () =>
    component.form.patchValue({
      fullName: 'Priya Kumar',
      email: 'priya@example.com',
      phone: '+91 98765 43210',
      projectType: 'website',
      serviceName: 'Business Website Development',
      message: 'We need a new website for our shop.',
      preferredContactMethod: 'both',
      consentToContact: true,
    });

  beforeEach(async () => {
    jest.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [EnquiryForm],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        { provide: ToastrService, useValue: toastr },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(EnquiryForm);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.match((r) => r.url.endsWith('/services')).forEach((r) => r.flush({ success: true, data: [] }));
    http.match((r) => r.url.includes('/settings/public') || r.url.includes('/social-links')).forEach((r) => r.flush({ success: true, data: {} }));
  });

  afterEach(() => http.verify());

  it('is invalid when empty and requires consent', () => {
    expect(component.form.valid).toBe(false);
    fillValid();
    expect(component.form.valid).toBe(true);
    component.form.controls.consentToContact.setValue(false);
    expect(component.form.controls.consentToContact.hasError('required')).toBe(true);
  });

  it.each([
    ['email', 'not-an-email', 'email'],
    ['phone', '123', 'pattern'],
    ['phone', '+1 (2) 3', 'pattern'],
    ['message', 'short', 'minlength'],
    ['fullName', 'A', 'minlength'],
  ] as const)('flags invalid %s %p', (field, value, error) => {
    fillValid();
    component.form.controls[field].setValue(value);
    expect(component.form.controls[field].hasError(error) || component.form.controls[field].invalid).toBe(true);
  });

  it('shows inline errors and does not call the API when submitted invalid', () => {
    component.submit();
    fixture.detectChanges();
    http.expectNone((r) => r.url.endsWith('/enquiries'));
    expect(fixture.nativeElement.querySelectorAll('mat-error, .tl-field-error').length).toBeGreaterThan(0);
    expect(toastr.error).toHaveBeenCalled();
  });

  it('applies "Enquire Now" preselection from inputs', () => {
    fixture.componentRef.setInput('presetType', 'software');
    fixture.componentRef.setInput('presetService', 'Software Development');
    fixture.detectChanges();
    expect(component.form.controls.projectType.value).toBe('software');
    expect(component.form.controls.serviceName.value).toBe('Software Development');
  });

  it('shows success only after the API confirms the save, and blocks duplicate submits', () => {
    fillValid();
    component.submit();
    component.submit(); // second click while pending is ignored
    const reqs = http.match((r) => r.url.endsWith('/enquiries'));
    expect(reqs).toHaveLength(1);
    expect(reqs[0].request.body).toMatchObject({ fullName: 'Priya Kumar', consentToContact: true, businessName: null });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.success')).toBeNull();

    reqs[0].flush({ success: true, data: { enquiryId: 7, notifications: { email: 'accepted', whatsapp: 'skipped' } } }, { status: 201, statusText: 'Created' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.success').textContent).toContain('#7');
    expect(toastr.success).toHaveBeenCalled();
  });

  it('maps server field errors onto controls and never shows success on failure', () => {
    fillValid();
    component.submit();
    http.expectOne((r) => r.url.endsWith('/enquiries')).flush(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Please correct the highlighted fields', details: { email: 'Enter a valid email address' } } },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    fixture.detectChanges();
    expect(component.form.controls.email.getError('server')).toBe('Enter a valid email address');
    expect(fixture.nativeElement.querySelector('.success')).toBeNull();
    expect(toastr.error).toHaveBeenCalledWith('Please correct the highlighted fields', 'Enquiry not sent');
  });
});
