import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiSuccess, Paged } from '../models/models';

type QueryValue = string | number | boolean | null | undefined;

/** Centralised HTTP layer. Unwraps { success, data } envelopes; errors are normalised by the error interceptor. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  readonly baseUrl = environment.apiBaseUrl.replace(/\/$/, '');

  private params(query?: Record<string, QueryValue>): HttpParams {
    let p = new HttpParams();
    for (const [k, v] of Object.entries(query ?? {})) {
      if (v !== undefined && v !== null && v !== '') p = p.set(k, String(v));
    }
    return p;
  }

  url(path: string): string {
    return `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  }

  get<T>(path: string, query?: Record<string, QueryValue>): Observable<T> {
    return this.http.get<ApiSuccess<T>>(this.url(path), { params: this.params(query) }).pipe(map((r) => r.data));
  }

  getPaged<T>(path: string, query?: Record<string, QueryValue>): Observable<Paged<T>> {
    return this.http
      .get<ApiSuccess<T[]>>(this.url(path), { params: this.params(query) })
      .pipe(map((r) => ({ items: r.data, meta: r.meta ?? { page: 1, pageSize: r.data.length, total: r.data.length, totalPages: 1 } })));
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<ApiSuccess<T>>(this.url(path), body).pipe(map((r) => r.data));
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<ApiSuccess<T>>(this.url(path), body).pipe(map((r) => r.data));
  }

  patch<T>(path: string, body: unknown): Observable<T> {
    return this.http.patch<ApiSuccess<T>>(this.url(path), body).pipe(map((r) => r.data));
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<ApiSuccess<T>>(this.url(path)).pipe(map((r) => r.data));
  }
}
