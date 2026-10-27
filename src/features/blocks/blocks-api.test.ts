import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api/api-error';
import { ApiClient } from '@/lib/api/client';
import { fakeFetch, ok } from '@/test/fake-api';
import { createBlocksApi } from './blocks-api';
import { block } from '@/test/blocks';
import type { AccessBlock } from './types';

const meta = (totalItems: number) => ({ page: 1, limit: 1, totalItems, totalPages: totalItems });
const listed = (...items: AccessBlock[]) => ({
  status: 200,
  body: { ...(ok(items).body as object), meta: meta(items.length) },
});

function setup(...replies: Parameters<typeof fakeFetch>) {
  const fetch = fakeFetch(...replies);
  const api = createBlocksApi(new ApiClient({ baseUrl: 'http://api.test/v1', fetch }));
  const call = (index: number) => {
    const [url, init] = fetch.mock.calls[index]!;
    return { url: new URL(String(url)), method: init?.method ?? 'GET', body: init?.body };
  };
  return { api, fetch, call };
}

describe('blocks api', () => {
  it('lists the active blocks of a Society, up to the limit it is given', async () => {
    const { api, call } = setup(listed(block()));
    const page = await api.list({ societyId: 's1', limit: 100 });
    expect(page.items).toEqual([block()]);
    expect(call(0).url.pathname).toBe('/v1/platform/access-blocks');
    expect(call(0).url.searchParams.get('societyId')).toBe('s1');
    expect(call(0).url.searchParams.get('limit')).toBe('100');
  });

  it('blocks a section with the reason', async () => {
    const { api, call } = setup(ok(block(), 'CREATED', 201));
    await api.block({ section: 'staff', societyId: 's1', institutionId: 'i1', reason: 'Annual fee unpaid' });
    expect(call(0).method).toBe('POST');
    expect(JSON.parse(String(call(0).body))).toEqual({
      section: 'staff',
      societyId: 's1',
      institutionId: 'i1',
      reason: 'Annual fee unpaid',
    });
  });

  it('lifts a block by finding its ID first, because the lists show the sections but not the IDs', async () => {
    const { api, call } = setup(listed(block()), ok({ id: 'b1', status: 0 }));
    await api.unblock({ section: 'staff', societyId: 's1', institutionId: 'i1' });
    expect(call(0).url.searchParams.get('institutionId')).toBe('i1');
    expect(call(0).url.searchParams.get('section')).toBe('staff');
    expect(call(1).method).toBe('DELETE');
    expect(call(1).url.pathname).toBe('/v1/platform/access-blocks/b1');
  });

  it('looks for the Owners’ block without an Institution', async () => {
    const owners = block({ id: 'b2', section: 'owners', institutionId: null });
    const { api, call } = setup(listed(owners), ok({ id: 'b2', status: 0 }));
    await api.unblock({ section: 'owners', societyId: 's1', institutionId: null });
    expect(call(0).url.searchParams.has('institutionId')).toBe(false);
    expect(call(1).url.pathname).toBe('/v1/platform/access-blocks/b2');
  });

  it('answers not found, and sends no lift, when the block is already gone', async () => {
    const { api, fetch } = setup(listed());
    const error = await api
      .unblock({ section: 'staff', societyId: 's1', institutionId: 'i1' })
      .catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 404, code: 'NOT_FOUND' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
