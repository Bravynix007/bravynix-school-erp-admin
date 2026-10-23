import type { FieldError } from './envelope';

/**
 * An API failure, carrying the envelope's stable `code`. UI code branches on
 * `code`, never on `message` (API design 7.1, 8.2).
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly requestId: string | null,
    readonly fieldErrors: FieldError[] = [],
    readonly details: Record<string, unknown> = {},
    readonly retryAfterSeconds: number | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** The client could not reach the API at all (offline, DNS, CORS, timeout). */
  static network(cause: unknown): ApiError {
    const error = new ApiError(
      0,
      'NETWORK_ERROR',
      "Can't reach the server. Check your connection and try again.",
      null,
    );
    error.cause = cause;
    return error;
  }

  get isSessionEnded(): boolean {
    return this.status === 401 && this.code !== 'TOKEN_EXPIRED';
  }

  /** 429 and 503 may be retried after `Retry-After` (API design 8.2). */
  get isRetryable(): boolean {
    return this.status === 429 || this.status === 503 || this.status === 0;
  }

  fieldError(field: string): FieldError | undefined {
    return this.fieldErrors.find((e) => e.field === field);
  }
}
