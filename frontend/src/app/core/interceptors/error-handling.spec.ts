import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiError } from '../services/api-error';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';
import { errorInterceptor } from './error.interceptor';

describe('Frontend API error handling', () => {
  let api: ApiService;
  let http: HttpTestingController;
  let auth: AuthService;
  let router: Router;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])), provideHttpClientTesting()],
    });
    api = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    jest.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => http.verify());

  it('unwraps the { success, data } envelope', async () => {
    const p = firstValueFrom(api.get<number[]>('/services'));
    http.expectOne('/api/services').flush({ success: true, data: [1, 2] });
    await expect(p).resolves.toEqual([1, 2]);
  });

  it('normalises validation errors with field details', async () => {
    const p = firstValueFrom(api.post('/enquiries', {}));
    http.expectOne('/api/enquiries').flush(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Fix fields', details: { email: 'Bad email' } } },
      { status: 422, statusText: 'Unprocessable' },
    );
    await expect(p).rejects.toMatchObject({ status: 422, code: 'VALIDATION_ERROR', message: 'Fix fields', fieldErrors: { email: 'Bad email' } });
  });

  it('gives a friendly message for network failures, rate limits and server errors', () => {
    expect(ApiError.fromHttp(new HttpErrorResponse({ status: 0 })).message).toMatch(/Unable to reach the server/);
    expect(ApiError.fromHttp(new HttpErrorResponse({ status: 429 })).message).toMatch(/Too many requests/);
    expect(ApiError.fromHttp(new HttpErrorResponse({ status: 500 })).message).toMatch(/Something went wrong/);
  });

  it('clears the admin session and redirects to login on 401 from admin APIs', async () => {
    sessionStorage.setItem('tl_admin_session', JSON.stringify({ token: 'abc', expiresAt: new Date(Date.now() + 60_000).toISOString(), admin: { id: 1, name: 'A', email: 'a@x.com', role: 'admin' } }));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])), provideHttpClientTesting()],
    });
    api = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    const nav = jest.spyOn(router, 'navigate').mockResolvedValue(true);

    const p = firstValueFrom(api.get('/admin/dashboard'));
    const req = http.expectOne('/api/admin/dashboard');
    expect(req.request.headers.get('Authorization')).toBe('Bearer abc');
    req.flush({ success: false, error: { code: 'UNAUTHORIZED', message: 'expired' } }, { status: 401, statusText: 'Unauthorized' });
    await expect(p).rejects.toBeInstanceOf(ApiError);
    expect(auth.isLoggedIn()).toBe(false);
    expect(nav).toHaveBeenCalledWith(['/admin/login'], expect.anything());
  });

  it('never attaches the admin token to public API calls or other hosts', () => {
    sessionStorage.setItem('tl_admin_session', JSON.stringify({ token: 'abc', expiresAt: new Date(Date.now() + 60_000).toISOString(), admin: { id: 1, name: 'A', email: 'a@x.com', role: 'admin' } }));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])), provideHttpClientTesting()],
    });
    const client = TestBed.inject(HttpClient);
    const ctl = TestBed.inject(HttpTestingController);
    TestBed.inject(ApiService).get('/services').subscribe();
    client.get('https://example.com/admin/x').subscribe();
    expect(ctl.expectOne('/api/services').request.headers.has('Authorization')).toBe(false);
    expect(ctl.expectOne('https://example.com/admin/x').request.headers.has('Authorization')).toBe(false);
    ctl.match(() => true).forEach((r) => r.flush({ success: true, data: [] }));
  });
});
