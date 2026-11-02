import { describe, expect, it } from 'vitest';
import { ApiClient } from '@/lib/api/client';
import { fakeFetch, ok } from '@/test/fake-api';
import { due, dueLine, quote } from '@/test/dues';
import { createDuesApi, dueStatusQuery } from './dues-api';

function setup(...replies: Parameters<typeof fakeFetch>) {
  const fetch = fakeFetch(...replies);
  const api = createDuesApi(new ApiClient({ baseUrl: 'http://api.test/v1', fetch }));
  const call = (index: number) => {
    const [url, init] = fetch.mock.calls[index]!;
    const parsed = new URL(String(url));
    const headers = new Headers(init?.headers);
    return {
      path: parsed.pathname,
      params: parsed.searchParams,
      method: init?.method ?? 'GET',
      body: init?.body === undefined ? undefined : JSON.parse(String(init.body)),
      key: headers.get('Idempotency-Key'),
    };
  };
  return { api, call };
}

const meta = { page: 1, limit: 20, totalItems: 1, totalPages: 1 };
const base = { page: 2, limit: 20, sort: '-createdAt', q: '', status: '' };

describe('dues api', () => {
  it('maps the status filter to the API’s 0, 1 and 2, and leaves "all" out', () => {
    expect(dueStatusQuery('cancelled')).toEqual({ dueStatus: 0 });
    expect(dueStatusQuery('due')).toEqual({ dueStatus: 1 });
    expect(dueStatusQuery('paid')).toEqual({ dueStatus: 2 });
    expect(dueStatusQuery('')).toEqual({});
  });

  it('reads the ledger with its page, sort, status and Institution (PLT-25)', async () => {
    const reply = { status: 200, body: { ...(ok([dueLine()]).body as object), meta } };
    const { api, call } = setup(reply);
    const page = await api.list({ ...base, status: 'due', institutionId: 'i1' });
    expect(page.items).toEqual([dueLine()]);
    expect(call(0).path).toBe('/v1/platform/dues');
    expect(Object.fromEntries(call(0).params)).toEqual({
      page: '2',
      limit: '20',
      sort: '-createdAt',
      dueStatus: '1',
      institutionId: 'i1',
    });
  });

  it('sends a search only from two characters, trimmed', async () => {
    const reply = { status: 200, body: { ...(ok([]).body as object), meta } };
    const { api, call } = setup(reply, reply);
    await api.list({ ...base, q: 'B' });
    await api.list({ ...base, q: ' 0007 ' });
    expect(call(0).params.has('q')).toBe(false);
    expect(call(1).params.get('q')).toBe('0007');
  });

  it('asks for the quote of a period (PLT-24)', async () => {
    const { api, call } = setup(ok(quote()));
    expect(await api.quote('i1', '2026-10-01', '2026-12-31')).toEqual(quote());
    expect(call(0).path).toBe('/v1/platform/institutions/i1/due-quote');
    expect(call(0).params.get('periodStartDate')).toBe('2026-10-01');
    expect(call(0).params.get('periodEndDate')).toBe('2026-12-31');
  });

  it('raises a due with the Idempotency-Key it is given (PLT-26)', async () => {
    const { api, call } = setup(ok(due(), 'CREATED', 201));
    const body = {
      institutionId: 'i1',
      periodStartDate: '2026-10-01',
      periodEndDate: '2026-12-31',
      studentCount: 1650,
    };
    await api.raise(body, 'key-1');
    expect(call(0)).toMatchObject({ path: '/v1/platform/dues', method: 'POST', body, key: 'key-1' });
  });

  it('reads, edits, pays and cancels one due (PLT-27 to PLT-30)', async () => {
    const { api, call } = setup(ok(due()), ok(due()), ok(due()), ok(due()));
    await api.get('d1');
    await api.edit('d1', { version: 1, studentCount: 1700 });
    await api.markPaid('d1', { version: 1, paidDate: '2026-11-02', paymentMode: 3 });
    await api.cancel('d1', { version: 1, reason: 'Raised twice' });
    expect([0, 1, 2, 3].map((index) => [call(index).method, call(index).path])).toEqual([
      ['GET', '/v1/platform/dues/d1'],
      ['PATCH', '/v1/platform/dues/d1'],
      ['POST', '/v1/platform/dues/d1/mark-paid'],
      ['POST', '/v1/platform/dues/d1/cancel'],
    ]);
    expect(call(1).body).toEqual({ version: 1, studentCount: 1700 });
    expect(call(2).body).toEqual({ version: 1, paidDate: '2026-11-02', paymentMode: 3 });
  });

  it('encodes the IDs it puts in the path', async () => {
    const { api, call } = setup(ok(due()), ok(quote()));
    await api.get('a/../b');
    await api.quote('a/b', '2026-10-01', '2026-12-31');
    expect(call(0).path).toBe('/v1/platform/dues/a%2F..%2Fb');
    expect(call(1).path).toBe('/v1/platform/institutions/a%2Fb/due-quote');
  });
});
