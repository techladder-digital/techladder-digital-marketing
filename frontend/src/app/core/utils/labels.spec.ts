import { mailtoLink, projectTypeForService, telLink, whatsappLink } from './labels';

describe('contact link helpers', () => {
  it('builds wa.me links only for valid numbers and encodes the message', () => {
    expect(whatsappLink('+91 98765-43210', 'Hi & hello')).toBe('https://wa.me/919876543210?text=Hi%20%26%20hello');
    expect(whatsappLink('')).toBeNull();
    expect(whatsappLink('123')).toBeNull();
  });
  it('builds tel: and mailto: links safely', () => {
    expect(telLink('+91 (98765) 43210')).toBe('tel:+919876543210');
    expect(mailtoLink('javascript:alert(1)')).toBeNull();
    expect(mailtoLink('hello@example.com', 'Hi')).toBe('mailto:hello@example.com?subject=Hi');
  });
  it('maps services to enquiry project types', () => {
    expect(projectTypeForService('digital_marketing', 'Logo Design')).toBe('digital_marketing');
    expect(projectTypeForService('website_software', 'Business Website Development')).toBe('website');
    expect(projectTypeForService('website_software', 'Software Maintenance')).toBe('software');
    expect(projectTypeForService('website_software', 'Custom Web Application Development')).toBe('software');
  });
});
