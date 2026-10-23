import { env } from '@/lib/env';
import { tokenStore } from '@/lib/auth/token-store';
import { ApiError } from './api-error';
import { isEnvelope, type ApiEnvelope } from './envelope';

/** Sent on refresh and logout so a cross-site form cannot call them (API design 6.1). */
export const CONSOLE_CSRF_HEADER = { 'X-Requested-With': 'bravynix-console' } as const;

const TIMEOUT_MS = 15_000;

const ENVELOPE_KEYS = new Set([
  'success',
  'statusCode',
  'code',
  'message',
  'data',
  'meta',
  'errors',
  'requestId',
]);

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | readonly (string | number)[] | undefined | null>;
  headers?: Record<string, string>;
  /** For the 7 operations that need one (API design 14). Reuse it on retry. */
  idempotencyKey?: string;
  /** Skip the access token, e.g. for the OTP calls. */
  anonymous?: boolean;
  signal?: AbortSignal;
}

type Fetch = typeof fetch;

export interface ApiClientConfig {
  baseUrl: string;
  fetch?: Fetch;
  language?: () => string;
  /** Called when the session cannot be recovered; the app shows "Session ended". */
  onSessionEnded?: (error: ApiError) => void;
}

function buildUrl(baseUrl: string, path: string, query?: RequestOptions['query']): string {
  const url = new URL(`${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null) continue;
    // Repeated values mean OR: status=1&status=2 (API design 13.1).
    for (const item of Array.isArray(value) ? value : [value]) {
      url.searchParams.append(key, String(item));
    }
  }
  return url.toString();
}

function toApiError(response: Response, body: unknown): ApiError {
  const retryAfter = Number(response.headers.get('Retry-After'));
  if (isEnvelope(body)) {
    const { code, message, errors, requestId, data } = body;
    // Error data such as `attemptsLeft` (API design 10.2) and extra envelope
    // fields such as `reason` (6.4) both land in `details`.
    const details = {
      ...(typeof data === 'object' && data !== null && !Array.isArray(data) ? data : {}),
      ...Object.fromEntries(Object.entries(body).filter(([key]) => !ENVELOPE_KEYS.has(key))),
    };
    return new ApiError(
      response.status,
      code,
      message,
      requestId,
      errors ?? [],
      details,
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null,
    );
  }
  return new ApiError(
    response.status,
    response.status >= 500 ? 'INTERNAL_ERROR' : 'UNEXPECTED_RESPONSE',
    'Something went wrong',
    response.headers.get('X-Request-Id'),
  );
}

/**
 * The one way the console calls the API. It unwraps the envelope, turns
 * errors into `ApiError`, and on 401 TOKEN_EXPIRED refreshes the access
 * token once (single flight) and repeats the call (API design 8.2).
 */
export class ApiClient {
  private refreshing: Promise<boolean> | null = null;
  private readonly fetchImpl: Fetch;
  private onSessionEnded: ((error: ApiError) => void) | undefined;

  constructor(private readonly config: ApiClientConfig) {
    this.fetchImpl = config.fetch ?? ((...args) => fetch(...args));
    this.onSessionEnded = config.onSessionEnded;
  }

  setSessionEndedHandler(handler: ((error: ApiError) => void) | undefined): void {
    this.onSessionEnded = handler;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<ApiEnvelope<T>> {
    try {
      return await this.send<T>(path, options);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401 && error.code === 'TOKEN_EXPIRED') {
        if (await this.refresh()) return this.send<T>(path, options);
        const ended = new ApiError(401, 'SESSION_ENDED', error.message, error.requestId, [], {
          reason: 'expired',
        });
        this.onSessionEnded?.(ended);
        throw ended;
      }
      if (error instanceof ApiError && error.isSessionEnded && !options.anonymous) {
        tokenStore.clear();
        this.onSessionEnded?.(error);
      }
      throw error;
    }
  }

  /** Data only, for the common case. */
  async data<T>(path: string, options?: RequestOptions): Promise<T> {
    return (await this.request<T>(path, options)).data as T;
  }

  /**
   * Exchanges the HttpOnly refresh cookie for a new access token. Concurrent
   * callers share one request, because a refresh token is single use and a
   * second use ends the session (API design 6.3).
   */
  refresh(): Promise<boolean> {
    this.refreshing ??= this.doRefresh().finally(() => {
      this.refreshing = null;
    });
    return this.refreshing;
  }

  private async doRefresh(): Promise<boolean> {
    try {
      const envelope = await this.send<{ accessToken: string }>('auth/refresh', {
        method: 'POST',
        anonymous: true,
        headers: CONSOLE_CSRF_HEADER,
      });
      tokenStore.set(envelope.data?.accessToken ?? null);
      return Boolean(envelope.data?.accessToken);
    } catch {
      tokenStore.clear();
      return false;
    }
  }

  private async send<T>(path: string, options: RequestOptions): Promise<ApiEnvelope<T>> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Accept-Language': this.config.language?.() ?? 'en',
      'X-Request-Id': crypto.randomUUID(),
      ...options.headers,
    };
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;
    const token = tokenStore.get();
    if (token && !options.anonymous) headers.Authorization = `Bearer ${token}`;

    const timeout = AbortSignal.timeout(TIMEOUT_MS);
    const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;

    let response: Response;
    try {
      response = await this.fetchImpl(buildUrl(this.config.baseUrl, path, options.query), {
        method: options.method ?? 'GET',
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        // Sends the refresh cookie to /v1/auth on the API's domain.
        credentials: 'include',
        signal,
      });
    } catch (error) {
      throw ApiError.network(error);
    }

    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) throw toApiError(response, body);
    if (!isEnvelope(body)) throw toApiError(response, body);
    return body as ApiEnvelope<T>;
  }
}

export const api = new ApiClient({ baseUrl: env.NEXT_PUBLIC_API_BASE_URL });
