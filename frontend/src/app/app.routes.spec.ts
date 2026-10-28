import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router, RouterOutlet, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ToastrService } from 'ngx-toastr';
import { routes } from './app.routes';
import { AuthService } from './core/services/auth.service';

@Component({ imports: [RouterOutlet], template: '<router-outlet />' })
class Host {}

describe('Angular routing', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [Host],
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        { provide: ToastrService, useValue: { success: jest.fn(), error: jest.fn(), info: jest.fn() } },
      ],
    });
  });

  it('defines exactly five main public pages', () => {
    const publicChildren = routes[0].children!.filter((r) => r.loadComponent);
    expect(publicChildren.map((r) => r.path)).toEqual(['', 'services', 'portfolio', 'contact', 'feedback']);
    expect(publicChildren.every((r) => typeof r.title === 'string')).toBe(true);
  });

  it.each([
    ['/', 'tl-home-page'],
    ['/services', 'tl-services-page'],
    ['/portfolio', 'tl-portfolio-page'],
    ['/contact', 'tl-contact-page'],
    ['/feedback', 'tl-feedback-page'],
    ['/this/does/not/exist', 'tl-not-found-page'],
  ])('navigates to %s', async (url, selector) => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    expect(harness.routeNativeElement?.querySelector(selector) ?? harness.fixture.nativeElement.querySelector(selector)).toBeTruthy();
  });

  it('redirects /enquiry to the contact page', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/enquiry');
    expect(TestBed.inject(Router).url).toBe('/contact');
  });

  it('sends anonymous visitors from /admin to the login page with a return URL', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/enquiries');
    expect(TestBed.inject(Router).url).toBe('/admin/login?returnUrl=%2Fadmin%2Fenquiries');
  });

  it('keeps editors out of admin-only pages', async () => {
    sessionStorage.setItem(
      'tl_admin_session',
      JSON.stringify({ token: 't', expiresAt: new Date(Date.now() + 60_000).toISOString(), admin: { id: 2, name: 'Ed', email: 'e@x.com', role: 'editor' } }),
    );
    // Re-create AuthService so it restores the stored session.
    TestBed.inject(AuthService);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/settings');
    expect(TestBed.inject(Router).url).toBe('/admin');
  });
});
