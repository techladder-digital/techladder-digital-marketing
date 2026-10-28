import { createEnquirySchema } from '../src/validators/enquiry.validator';
import { validEnquiryBody } from './helpers';

const check = (body: unknown) => createEnquirySchema.safeParse(body);
const fieldsWithErrors = (body: unknown) => {
  const r = check(body);
  return r.success ? [] : r.error.issues.map((i) => i.path.join('.'));
};

describe('enquiry validation', () => {
  it('accepts a complete, valid enquiry and normalises optional fields', () => {
    const r = check({ ...validEnquiryBody, businessName: '  ', budgetRange: '', email: ' Priya@Example.COM ' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.businessName).toBeNull();
      expect(r.data.budgetRange).toBeNull();
      expect(r.data.email).toBe('priya@example.com');
    }
  });

  it('accepts missing optional fields', () => {
    const { businessName: _b, budgetRange: _r, ...rest } = validEnquiryBody;
    expect(check(rest).success).toBe(true);
  });

  it.each([
    ['fullName', ''],
    ['email', 'not-an-email'],
    ['phone', '123'],
    ['phone', 'call me maybe'],
    ['projectType', 'seo'],
    ['serviceName', ''],
    ['message', 'short'],
    ['preferredContactMethod', 'fax'],
    ['budgetRange', 'a million dollars'],
  ])('rejects invalid %s (%p)', (field, value) => {
    expect(fieldsWithErrors({ ...validEnquiryBody, [field]: value })).toContain(field);
  });

  it('requires explicit consent to be contacted', () => {
    expect(fieldsWithErrors({ ...validEnquiryBody, consentToContact: false })).toContain('consentToContact');
    expect(fieldsWithErrors({ ...validEnquiryBody, consentToContact: 'yes' })).toContain('consentToContact');
  });

  it('rejects oversized and malformed submissions', () => {
    expect(fieldsWithErrors({ ...validEnquiryBody, message: 'x'.repeat(3001) })).toContain('message');
    expect(fieldsWithErrors({ ...validEnquiryBody, fullName: 'Bad\u0000Name' })).toContain('fullName');
    expect(check({ ...validEnquiryBody, isAdmin: true }).success).toBe(false); // unknown keys
    expect(check({ ...validEnquiryBody, website: 'http://spam' }).success).toBe(false); // honeypot
    expect(check(null).success).toBe(false);
  });
});
