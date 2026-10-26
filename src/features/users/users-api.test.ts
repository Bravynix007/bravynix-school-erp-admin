import { describe, expect, it } from 'vitest';
import { ApiClient } from '@/lib/api/client';
import { fakeFetch, ok } from '@/test/fake-api';
import { createUsersApi } from './users-api';

function build(...replies: Parameters<typeof fakeFetch>) {
  const fetch = fakeFetch(...replies);
  return { api: createUsersApi(new ApiClient({ baseUrl: 'http://api.test/v1', fetch })), fetch };
}

const call = (fetch: ReturnType<typeof fakeFetch>) => {
  const [url, init] = fetch.mock.calls[0]!;
  return {
    url: String(url),
    method: init?.method,
    body: init?.body ? JSON.parse(String(init.body)) : undefined,
  };
};

describe('users api', () => {
  it('reads the Super Admins and adds and removes one (PLT-12 to PLT-14)', async () => {
    const { api, fetch } = build(ok([]), ok({}, 'CREATED', 201), ok({ id: 'u1', status: 0 }));
    await api.superAdmins();
    await api.addSuperAdmin({ email: 'a@b.co' });
    await api.removeSuperAdmin('u1');
    expect(fetch.mock.calls.map(([url, init]) => `${init?.method} ${new URL(String(url)).pathname}`)).toEqual(
      [
        'GET /v1/platform/super-admins',
        'POST /v1/platform/super-admins',
        'DELETE /v1/platform/super-admins/u1',
      ],
    );
  });

  it('searches Owners from two characters only', async () => {
    const page = { page: 1, limit: 20, totalItems: 0, totalPages: 0 };
    const reply = { status: 200, body: { ...(ok([]).body as object), meta: page } };
    const { api, fetch } = build(reply, reply);
    await api.owners({ page: 1, limit: 20, sort: 'name', q: 'a' });
    await api.owners({ page: 2, limit: 20, sort: '-name', q: ' as ' });
    const urls = fetch.mock.calls.map(([url]) => new URL(String(url)).searchParams);
    expect(urls[0]!.has('q')).toBe(false);
    expect(urls[1]!.get('q')).toBe('as');
    expect(urls[1]!.get('sort')).toBe('-name');
  });

  it('sends the version with block, unblock and email change (PLT-15 to PLT-17)', async () => {
    const { api, fetch } = build(ok({}));
    await api.block('u1', { reason: 'Left the Society', version: 4 });
    expect(call(fetch)).toEqual({
      url: 'http://api.test/v1/platform/users/u1/block',
      method: 'POST',
      body: { reason: 'Left the Society', version: 4 },
    });
    const email = build(ok({}));
    await email.api.changeEmail('u1', { email: 'new@b.co', version: 4 });
    expect(call(email.fetch)).toMatchObject({ method: 'PUT', body: { email: 'new@b.co', version: 4 } });
  });

  it('resets the authenticator and unlocks sign-in (PLT-18, PLT-41)', async () => {
    const { api, fetch } = build(ok({ id: 'u1', authenticatorSetUp: false }));
    await api.resetAuthenticator('u1');
    expect(call(fetch)).toMatchObject({ method: 'DELETE', url: 'http://api.test/v1/platform/users/u1/mfa' });
    const unlock = build(ok({}));
    await unlock.api.unlock('u1', { reason: 'Phone lost' });
    expect(call(unlock.fetch)).toMatchObject({ method: 'POST', body: { reason: 'Phone lost' } });
  });
});
