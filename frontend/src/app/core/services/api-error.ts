import { HttpErrorResponse } from '@angular/common/http';

/** Normalised error thrown by every API call. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code: string,
    public readonly fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static fromHttp(err: unknown): ApiError {
    if (err instanceof ApiError) return err;
    if (err instanceof HttpErrorResponse) {
      if (err.status === 0) {
        return new ApiError(0, 'Unable to reach the server. Check your internet connection and try again.', 'NETWORK_ERROR');
      }
      const body = err.error as { error?: { code?: string; message?: string; details?: Record<string, string> } } | null;
      const message =
        body?.error?.message ??
        (err.status === 429
          ? 'Too many requests. Please wait a few minutes and try again.'
          : err.status >= 500
            ? 'Something went wrong on our side. Please try again later.'
            : 'The request could not be completed.');
      const details = body?.error?.details && typeof body.error.details === 'object' ? body.error.details : {};
      return new ApiError(err.status, message, body?.error?.code ?? `HTTP_${err.status}`, details);
    }
    return new ApiError(-1, 'An unexpected error occurred.', 'UNKNOWN');
  }
}
