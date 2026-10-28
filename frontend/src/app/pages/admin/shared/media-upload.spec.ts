import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpEventType } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { errorInterceptor } from '../../../core/interceptors/error.interceptor';
import { UploadProgress, UploadService } from '../../../core/services/upload.service';
import { mediaUrl } from '../../../core/utils/media-url';
import { imageSourceValidator, videoSourceValidator } from './validators';

const file = (name: string, type: string, bytes = 10) => new File([new Uint8Array(bytes)], name, { type });

describe('upload validation (client side)', () => {
  let svc: UploadService;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(withInterceptors([errorInterceptor])), provideHttpClientTesting()] });
    svc = TestBed.inject(UploadService);
  });

  it('accepts allowed images and videos', () => {
    expect(svc.precheck(file('a.jpg', 'image/jpeg'), 'image')).toBeNull();
    expect(svc.precheck(file('a.webp', 'image/webp'), 'image')).toBeNull();
    expect(svc.precheck(file('a.mp4', 'video/mp4'), 'video')).toBeNull();
  });

  it('rejects wrong types and oversize files', () => {
    expect(svc.precheck(file('a.svg', 'image/svg+xml'), 'image')).toMatch(/JPG/);
    expect(svc.precheck(file('a.mov', 'video/quicktime'), 'video')).toMatch(/MP4/);
    expect(svc.precheck(file('a.mp4', 'video/mp4'), 'image')).toMatch(/image/);
    expect(svc.precheck(file('big.png', 'image/png', 6 * 1024 * 1024), 'image')).toMatch(/5 MB/);
  });

  it('reports progress then the stored file', () => {
    const http = TestBed.inject(HttpTestingController);
    const events: UploadProgress[] = [];
    svc.upload(file('a.png', 'image/png')).subscribe((e) => events.push(e));
    const req = http.expectOne('/api/admin/uploads');
    expect(req.request.body instanceof FormData).toBe(true);
    req.event({ type: HttpEventType.UploadProgress, loaded: 50, total: 100 });
    req.flush({ success: true, data: { id: 1, kind: 'image', url: '/uploads/2026/10/0123456789abcdef0123456789abcdef.png', originalName: 'a.png' } });
    expect(events[0]).toEqual({ state: 'progress', percent: 50 });
    expect(events[1]).toMatchObject({ state: 'done', file: { id: 1 } });
    http.verify();
  });
});

describe('media field validators', () => {
  const up = '/uploads/2026/10/0123456789abcdef0123456789abcdef';
  it.each([`${up}.jpg`, `${up}.webp`, 'https://cdn.example.com/a.png', '/assets/images/hero-banner.svg', ''])('image accepts %p', (v) => {
    expect(imageSourceValidator(new FormControl(v))).toBeNull();
  });
  it.each(['javascript:alert(1)', `${up}.mp4`, '/uploads/../x.jpg', 'http://insecure.com/a.png'])('image rejects %p', (v) => {
    expect(imageSourceValidator(new FormControl(v))).not.toBeNull();
  });
  it.each([`${up}.mp4`, `${up}.webm`, 'https://cdn.example.com/v.mp4?x=1', ''])('video accepts %p', (v) => {
    expect(videoSourceValidator(new FormControl(v))).toBeNull();
  });
  it.each([`${up}.jpg`, 'https://youtube.com/watch?v=x', 'javascript:x', '/uploads/../a.mp4'])('video rejects %p', (v) => {
    expect(videoSourceValidator(new FormControl(v))).not.toBeNull();
  });
  it('leaves same-origin upload paths relative', () => {
    expect(mediaUrl('/uploads/2026/10/a.png')).toBe('/uploads/2026/10/a.png');
    expect(mediaUrl('https://x.com/a.png')).toBe('https://x.com/a.png');
    expect(mediaUrl(null)).toBe('');
  });
});
