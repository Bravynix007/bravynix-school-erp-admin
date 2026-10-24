import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fail, fakeFetch, ok } from '@/test/fake-api';
import { tokenStore } from '@/lib/auth/token-store';
import { ApiError } from './api-error';
import { ApiClient } from './client';

const BASE = 'http://api.test/v1';

function headersOf(call: unknown[]): Record<string, string> {
  return (call[1] as RequestInit).headers as Record<string, string>;
}

describe('ApiClient', () => {
  beforeEach(() => tokenStore.clear());

  it('unwraps data and sends the standard headers', async () => {
    tokenStore.set('access-1');
    const fetch = fakeFetch(ok({ name: 'Sri Vidya Educational Society' }));
    const client = new ApiClient({ baseUrl: BASE, fetch });

    await expect(client.data('platform/societies/1')).resolves.toEqual({
      name: 'Sri Vidya Educational Society',
    });

    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe(`${BASE}/platform/societies/1`);
    expect(init?.credentials).toBe('include');
    const headers = headersOf(fetch.mock.calls[0]!);
    expect(headers.Authorization).toBe('Bearer access-1');
    expect(headers['X-Request-Id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(headers['Accept-Language']).toBe('en');
  });

  it('repeats array query values (status=1&status=2)', async () => {
    const fetch = fakeFetch(ok([]));
    const client = new ApiClient({ baseUrl: BASE, fetch });
    await client.data('platform/societies', { query: { status: [1, 2], q: 'vidya', cursor: undefined } });
    expect(fetch.mock.calls[0]![0]).toBe(`${BASE}/platform/societies?status=1&status=2&q=vidya`);
  });

  it('maps an error envelope to ApiError with field errors, data and Retry-After', async () => {
    const fetch = fakeFetch(
      fail(401, 'OTP_INVALID', { data: { attemptsLeft: 3 } }),
      fail(429, 'OTP_RESEND_TOO_SOON', {}, { 'Retry-After': '42' }),
      fail(400, 'VALIDATION_FAILED', {
        errors: [{ field: 'email', code: 'INVALID_EMAIL', message: 'Bad email' }],
      }),
    );
    const client = new ApiClient({ baseUrl: BASE, fetch });

    const invalid = (await client
      .data('auth/otp/verify', { method: 'POST', anonymous: true })
      .catch((e) => e)) as ApiError;
    expect(invalid).toBeInstanceOf(ApiError);
    expect(invalid).toMatchObject({ status: 401, code: 'OTP_INVALID', requestId: 'req-2' });
    expect(invalid.details.attemptsLeft).toBe(3);

    const tooSoon = (await client
      .data('auth/otp', { method: 'POST', anonymous: true })
      .catch((e) => e)) as ApiError;
    expect(tooSoon.retryAfterSeconds).toBe(42);
    expect(tooSoon.isRetryable).toBe(true);

    const invalidBody = (await client
      .data('auth/otp', { method: 'POST', anonymous: true })
      .catch((e) => e)) as ApiError;
    expect(invalidBody.fieldError('email')?.message).toBe('Bad email');
  });

  it('turns a network failure into NETWORK_ERROR', async () => {
    const fetch = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    const client = new ApiClient({ baseUrl: BASE, fetch });
    await expect(client.data('health')).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });

  it('refreshes once on TOKEN_EXPIRED and repeats the call', async () => {
    tokenStore.set('old');
    const fetch = fakeFetch(fail(401, 'TOKEN_EXPIRED'), ok({ accessToken: 'new' }), ok({ id: 1 }));
    const client = new ApiClient({ baseUrl: BASE, fetch });

    await expect(client.data('me')).resolves.toEqual({ id: 1 });
    expect(fetch.mock.calls[1]![0]).toBe(`${BASE}/auth/refresh`);
    expect(headersOf(fetch.mock.calls[1]!)['X-Requested-With']).toBe('bravynix-console');
    expect(headersOf(fetch.mock.calls[2]!).Authorization).toBe('Bearer new');
    expect(tokenStore.get()).toBe('new');
  });

  it('shares one refresh between concurrent callers', async () => {
    const fetch = fakeFetch(ok({ accessToken: 'a' }));
    const client = new ApiClient({ baseUrl: BASE, fetch });
    const results = await Promise.all([client.refresh(), client.refresh(), client.refresh()]);
    expect(results).toEqual([{ ok: true }, { ok: true }, { ok: true }]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('ends the session when the refresh fails', async () => {
    tokenStore.set('old');
    const onSessionEnded = vi.fn();
    const fetch = fakeFetch(fail(401, 'TOKEN_EXPIRED'), fail(401, 'REFRESH_TOKEN_INVALID'));
    const client = new ApiClient({ baseUrl: BASE, fetch, onSessionEnded });

    await expect(client.data('me')).rejects.toMatchObject({ code: 'REFRESH_TOKEN_INVALID' });
    expect(onSessionEnded).toHaveBeenCalledWith(expect.objectContaining({ code: 'REFRESH_TOKEN_INVALID' }));
    expect(tokenStore.get()).toBeNull();
  });

  it('keeps the session when the refresh cannot reach the API (review C1)', async () => {
    tokenStore.set('old');
    const onSessionEnded = vi.fn();
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(fail(401, 'TOKEN_EXPIRED').body), { status: 401 }))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const client = new ApiClient({ baseUrl: BASE, fetch, onSessionEnded });

    await expect(client.data('me')).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    expect(onSessionEnded).not.toHaveBeenCalled();
    expect(tokenStore.get()).toBe('old');
  });

  it('rejects a refresh that fails with 5xx instead of reporting the session over', async () => {
    const client = new ApiClient({ baseUrl: BASE, fetch: fakeFetch(fail(503, 'SERVICE_UNAVAILABLE')) });
    await expect(client.refresh()).rejects.toMatchObject({ status: 503 });
  });

  it('ends the session when the repeat after a refresh is refused (review C5)', async () => {
    tokenStore.set('old');
    const onSessionEnded = vi.fn();
    const fetch = fakeFetch(
      fail(401, 'TOKEN_EXPIRED'),
      ok({ accessToken: 'new' }),
      fail(401, 'SESSION_ENDED', { data: { reason: 'blocked' } }),
    );
    const client = new ApiClient({ baseUrl: BASE, fetch, onSessionEnded });

    await expect(client.data('me')).rejects.toMatchObject({ code: 'SESSION_ENDED' });
    expect(onSessionEnded).toHaveBeenCalledTimes(1);
    expect(tokenStore.get()).toBeNull();
  });

  it('never refreshes for an anonymous call (review C6)', async () => {
    tokenStore.set('t');
    const onSessionEnded = vi.fn();
    const fetch = fakeFetch(fail(401, 'TOKEN_EXPIRED'));
    const client = new ApiClient({ baseUrl: BASE, fetch, onSessionEnded });

    await expect(client.data('auth/mfa/verify', { method: 'POST', anonymous: true })).rejects.toMatchObject({
      code: 'TOKEN_EXPIRED',
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(onSessionEnded).not.toHaveBeenCalled();
    expect(tokenStore.get()).toBe('t');
  });

  it('retries without refreshing when another call already replaced the token (review C9)', async () => {
    tokenStore.set('old');
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    const fetch = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      const auth = (init?.headers as Record<string, string>).Authorization;
      if (auth === 'Bearer old') {
        await gate;
        return new Response(JSON.stringify(fail(401, 'TOKEN_EXPIRED').body), { status: 401 });
      }
      return new Response(JSON.stringify(ok({ id: 1 }).body), { status: 200 });
    });
    const client = new ApiClient({ baseUrl: BASE, fetch });

    const pending = client.data('me');
    tokenStore.set('new');
    release();
    await expect(pending).resolves.toEqual({ id: 1 });
    expect(fetch.mock.calls.map(([url]) => String(url))).toEqual([`${BASE}/me`, `${BASE}/me`]);
  });

  it('ends the session on a revoked token, but not for anonymous calls', async () => {
    tokenStore.set('t');
    const onSessionEnded = vi.fn();
    const fetch = fakeFetch(
      fail(401, 'SESSION_ENDED', { data: { reason: 'logout_all' } }),
      fail(401, 'OTP_INVALID'),
    );
    const client = new ApiClient({ baseUrl: BASE, fetch, onSessionEnded });

    await expect(client.data('me')).rejects.toMatchObject({ code: 'SESSION_ENDED' });
    expect(onSessionEnded).toHaveBeenCalledTimes(1);
    expect(tokenStore.get()).toBeNull();

    await expect(client.data('auth/otp/verify', { method: 'POST', anonymous: true })).rejects.toBeInstanceOf(
      ApiError,
    );
    expect(onSessionEnded).toHaveBeenCalledTimes(1);
  });

  it('sends the Idempotency-Key when given', async () => {
    const fetch = fakeFetch(ok({}, 'CREATED', 201));
    const client = new ApiClient({ baseUrl: BASE, fetch });
    await client.data('platform/dues', { method: 'POST', body: { a: 1 }, idempotencyKey: 'key-1' });
    const headers = headersOf(fetch.mock.calls[0]!);
    expect(headers['Idempotency-Key']).toBe('key-1');
    expect(headers['Content-Type']).toBe('application/json');
  });
});
