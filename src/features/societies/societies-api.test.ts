import { describe, expect, it } from 'vitest';
import { ApiClient } from '@/lib/api/client';
import { fakeFetch, ok } from '@/test/fake-api';
import { createSocietiesApi, statusQuery } from './societies-api';

function listed(query: Parameters<ReturnType<typeof createSocietiesApi>['list']>[0]) {
  const meta = { page: 1, limit: 20, totalItems: 0, totalPages: 0 };
  const fetch = fakeFetch({ status: 200, body: { ...(ok([]).body as object), meta } });
  const api = createSocietiesApi(new ApiClient({ baseUrl: 'http://api.test/v1', fetch }));
  return api.list(query).then(() => new URL(String(fetch.mock.calls[0]![0])).searchParams);
}

const base = { page: 2, limit: 20, sort: '-name', q: '', status: '' };

describe('societies api', () => {
  it('asks for the page, limit and sort it was given', async () => {
    const params = await listed(base);
    expect(params.get('page')).toBe('2');
    expect(params.get('limit')).toBe('20');
    expect(params.get('sort')).toBe('-name');
  });

  it('sends a search only from two characters, trimmed, because the API refuses shorter ones', async () => {
    expect((await listed({ ...base, q: 'a' })).has('q')).toBe(false);
    expect((await listed({ ...base, q: ' a ' })).has('q')).toBe(false);
    expect((await listed({ ...base, q: ' sv ' })).get('q')).toBe('sv');
  });

  it('maps the status filter to the API’s 1 and 0, and leaves "all" out', async () => {
    expect(statusQuery('active')).toEqual({ status: 1 });
    expect(statusQuery('inactive')).toEqual({ status: 0 });
    expect(statusQuery('')).toEqual({});
    expect((await listed({ ...base, status: 'inactive' })).get('status')).toBe('0');
    expect((await listed(base)).has('status')).toBe(false);
  });
});
