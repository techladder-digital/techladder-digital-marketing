import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * Uploaded files are stored as site-relative paths ("/uploads/2026/10/abc.jpg").
 * When the API runs on its own domain (API_BASE_URL=https://api.example.com/api),
 * those paths must be loaded from the API origin instead of the website origin.
 */
export function mediaUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (!path.startsWith('/uploads/')) return path;
  const base = environment.apiBaseUrl;
  if (/^https?:\/\//.test(base)) {
    try {
      return new URL(base).origin + path;
    } catch {
      return path;
    }
  }
  return path;
}

@Pipe({ name: 'mediaUrl' })
export class MediaUrlPipe implements PipeTransform {
  transform(path: string | null | undefined): string {
    return mediaUrl(path);
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
