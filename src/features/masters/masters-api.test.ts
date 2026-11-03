import { describe, expect, it } from 'vitest';
import { ApiClient } from '@/lib/api/client';
import { fakeFetch, ok } from '@/test/fake-api';
import { entry } from '@/test/masters';
import { createMastersApi } from './masters-api';

function setup(...replies: Parameters<typeof fakeFetch>) {
  const fetch = fakeFetch(...replies);
  const api = createMastersApi(new ApiClient({ baseUrl: 'http://api.test/v1', fetch }));
  const call = (index: number) => {
    const [url, init] = fetch.mock.calls[index]!;
    const parsed = new URL(String(url));
    return {
      path: parsed.pathname,
      search: parsed.search,
      method: init?.method ?? 'GET',
      body: init?.body,
      cache: init?.cache,
    };
  };
  return { api, call };
}

describe('masters api', () => {
  it('reads every entry, hidden ones too, and asks the browser to revalidate (MST-01)', async () => {
    const { api, call } = setup(ok([entry()]));
    expect(await api.list('designations')).toEqual([entry()]);
    expect(call(0)).toMatchObject({
      path: '/v1/masters/designations',
      search: '?includeHidden=true',
      method: 'GET',
      cache: 'no-cache',
    });
  });

  it('adds an entry (PLT-31)', async () => {
    const { api, call } = setup(ok(entry(), 'CREATED', 201));
    await api.create('predefined-classes', {
      code: 'CLASS_1',
      name: '1st',
      classCategoryId: 'c1',
      numericValue: 1,
    });
    expect(call(0)).toMatchObject({ path: '/v1/platform/masters/predefined-classes', method: 'POST' });
    expect(JSON.parse(String(call(0).body))).toEqual({
      code: 'CLASS_1',
      name: '1st',
      classCategoryId: 'c1',
      numericValue: 1,
    });
  });

  it('changes, moves, hides and shows an entry with one versioned PATCH (PLT-32)', async () => {
    const { api, call } = setup(ok(entry()));
    await api.update('class-categories', 'a/b', { version: 3, displayOrder: 2, status: 0 });
    expect(call(0)).toMatchObject({ path: '/v1/platform/masters/class-categories/a%2Fb', method: 'PATCH' });
    expect(JSON.parse(String(call(0).body))).toEqual({ version: 3, displayOrder: 2, status: 0 });
  });
});
