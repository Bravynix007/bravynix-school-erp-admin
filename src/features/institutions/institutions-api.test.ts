import { describe, expect, it } from 'vitest';
import { ApiClient } from '@/lib/api/client';
import { fakeFetch, ok } from '@/test/fake-api';
import { blockedQuery, createInstitutionsApi } from './institutions-api';

function listed(query: Parameters<ReturnType<typeof createInstitutionsApi>['list']>[0]) {
  const meta = { page: 1, limit: 20, totalItems: 0, totalPages: 0 };
  const fetch = fakeFetch({ status: 200, body: { ...(ok([]).body as object), meta } });
  const api = createInstitutionsApi(new ApiClient({ baseUrl: 'http://api.test/v1', fetch }));
  return api.list(query).then(() => {
    const url = new URL(String(fetch.mock.calls[0]![0]));
    return { path: url.pathname, params: url.searchParams };
  });
}

const base = { page: 1, limit: 20, sort: 'name', q: '', status: '', blocked: '' };

describe('institutions api', () => {
  it('reads PLT-19 with the page, limit and sort', async () => {
    const { path, params } = await listed(base);
    expect(path).toBe('/v1/platform/institutions');
    expect(params.get('limit')).toBe('20');
    expect(params.get('sort')).toBe('name');
  });

  it('sends a search only from two characters, because the API refuses shorter ones', async () => {
    expect((await listed({ ...base, q: 'a' })).params.has('q')).toBe(false);
    expect((await listed({ ...base, q: ' hi ' })).params.get('q')).toBe('hi');
  });

  it('maps the status and blocked filters to the API’s values, and leaves "all" out', async () => {
    expect(blockedQuery('blocked')).toEqual({ blocked: true });
    expect(blockedQuery('open')).toEqual({ blocked: false });
    expect(blockedQuery('')).toEqual({});
    const { params } = await listed({ ...base, status: 'inactive', blocked: 'open' });
    expect(params.get('status')).toBe('0');
    expect(params.get('blocked')).toBe('false');
    expect((await listed(base)).params.has('blocked')).toBe(false);
  });
});
