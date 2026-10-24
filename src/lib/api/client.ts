import { env } from '@/lib/env';
import { tokenStore } from '@/lib/auth/token-store';
import { ApiError } from './api-error';
import { isEnvelope, type ApiEnvelope } from './envelope';

/** Sent on refresh and logout so a cross-site form cannot call them (API design 6.1). */
export const CONSOLE_CSRF_HEADER = { 'X-Requested-With': 'bravynix-console' } as const;

const TIMEOUT_MS = 15_000;

/** Serialises refreshes across tabs: the refresh cookie is single use (API design 6.3). */
const REFRESH_LOCK = 'bravynix-console-refresh';

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | readonly (string | number)[] | undefined | null>;
  headers?: Record<string, string>;
  /** For the 7 operations that need one (API design 14). Reuse it on retry. */
  idempotencyKey?: string;
  /**
   * Skip the access token, e.g. for the OTP and MFA calls. An anonymous call
   * never refreshes or ends the session: its 401s belong to the sign-in flow.
   */
  anonymous?: boolean;
  signal?: AbortSignal;
}

type Fetch = typeof fetch;

/** `ok: false` only when the API refused the refresh with 401: the session is over. */
export type RefreshResult = { ok: true } | { ok: false; error: ApiError };

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
    // Error details such as `attemptsLeft` or `reason` come in `data` (API design 8).
    const details =
      typeof data === 'object' && data !== null && !Array.isArray(data)
        ? (data as Record<string, unknown>)
        : {};
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

/** Runs `task` while holding a lock shared by every tab, where the browser has Web Locks. */
async function withTabLock<T>(task: () => Promise<T>): Promise<T> {
  const locks = typeof navigator === 'undefined' ? undefined : navigator.locks;
  return locks ? await locks.request(REFRESH_LOCK, task) : task();
}

/**
 * The one way the console calls the API. It unwraps the envelope, turns
 * errors into `ApiError`, and on 401 TOKEN_EXPIRED refreshes the access
 * token once and repeats the call (API design 8.2).
 */
export class ApiClient {
  private refreshing: Promise<RefreshResult> | null = null;
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
    const usedToken = tokenStore.get();
    try {
      return await this.send<T>(path, options);
    } catch (error) {
      if (!(error instanceof ApiError) || options.anonymous) throw error;
      if (error.status === 401 && error.code === 'TOKEN_EXPIRED') {
        // Another call may have refreshed while this one was in flight.
        const current = tokenStore.get();
        if (current === null || current === usedToken) {
          const result = await this.refresh();
          if (!result.ok) this.endSession(result.error);
        }
        return this.retry<T>(path, options);
      }
      if (error.isSessionEnded) this.endSession(error);
      throw error;
    }
  }

  /** Data only, for the common case. */
  async data<T>(path: string, options?: RequestOptions): Promise<T> {
    return (await this.request<T>(path, options)).data as T;
  }

  /**
   * Exchanges the HttpOnly refresh cookie for a new access token. Resolves
   * `ok: false` with the API's 401 when the session is over. A network
   * failure, timeout or 5xx rejects with that `ApiError` and ends nothing:
   * the cookie may still be good (API design 8.2).
   *
   * Calls in this tab share one request, and tabs take turns through a Web
   * Lock, because a refresh token is single use and a second use ends the
   * session (API design 6.3). A tab that waited sends the cookie the first
   * tab's answer has just set.
   */
  refresh(): Promise<RefreshResult> {
    this.refreshing ??= withTabLock(() => this.doRefresh()).finally(() => {
      this.refreshing = null;
    });
    return this.refreshing;
  }

  private async doRefresh(): Promise<RefreshResult> {
    try {
      const envelope = await this.send<{ accessToken: string }>('auth/refresh', {
        method: 'POST',
        anonymous: true,
        headers: CONSOLE_CSRF_HEADER,
      });
      const token = envelope.data?.accessToken;
      if (!token) throw new ApiError(500, 'UNEXPECTED_RESPONSE', 'Something went wrong', envelope.requestId);
      tokenStore.set(token);
      return { ok: true };
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
      tokenStore.clear();
      return { ok: false, error };
    }
  }

  /** The repeat after a refresh: any 401 now is final, and so is the session. */
  private async retry<T>(path: string, options: RequestOptions): Promise<ApiEnvelope<T>> {
    try {
      return await this.send<T>(path, options);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) this.endSession(error);
      throw error;
    }
  }

  private endSession(error: ApiError): never {
    tokenStore.clear();
    this.onSessionEnded?.(error);
    throw error;
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
