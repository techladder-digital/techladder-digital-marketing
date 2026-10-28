import { HttpClient, HttpEventType } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { filter, map, Observable } from 'rxjs';
import { ApiSuccess, MediaFile, MediaKind } from '../models/models';
import { ApiService } from './api.service';

export type UploadProgress = { state: 'progress'; percent: number } | { state: 'done'; file: MediaFile };

export const UPLOAD_LIMITS: Record<MediaKind, { mb: number; accept: string; label: string }> = {
  image: { mb: 5, accept: 'image/jpeg,image/png,image/webp,image/gif', label: 'JPG, PNG, WebP or GIF' },
  video: { mb: 100, accept: 'video/mp4,video/webm', label: 'MP4 or WebM' },
};

/** Uploads one photo/video to the admin media library with progress events. */
@Injectable({ providedIn: 'root' })
export class UploadService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiService);

  /** Quick client-side check so people get instant feedback; the server re-validates everything. */
  precheck(file: File, kind: MediaKind): string | null {
    const isImage = /^image\/(jpeg|png|webp|gif)$/.test(file.type);
    const isVideo = /^video\/(mp4|webm)$/.test(file.type);
    if (kind === 'image' && !isImage) return `Please choose a ${UPLOAD_LIMITS.image.label} image.`;
    if (kind === 'video' && !isVideo) return `Please choose an ${UPLOAD_LIMITS.video.label} video.`;
    const max = UPLOAD_LIMITS[kind].mb * 1024 * 1024;
    if (file.size > max) return `The file is larger than ${UPLOAD_LIMITS[kind].mb} MB.`;
    return null;
  }

  upload(file: File): Observable<UploadProgress> {
    const body = new FormData();
    body.append('file', file, file.name);
    return this.http
      .post<ApiSuccess<MediaFile>>(this.api.url('/admin/uploads'), body, { reportProgress: true, observe: 'events' })
      .pipe(
        filter((e) => e.type === HttpEventType.UploadProgress || e.type === HttpEventType.Response),
        map((e): UploadProgress => {
          if (e.type === HttpEventType.UploadProgress) {
            return { state: 'progress', percent: e.total ? Math.round((100 * e.loaded) / e.total) : 0 };
          }
          return { state: 'done', file: (e as { body: ApiSuccess<MediaFile> }).body.data };
        }),
      );
  }
}
