import { describe, expect, it } from 'vitest';
import { ApiClient } from '@/lib/api/client';
import { fakeFetch, ok } from '@/test/fake-api';
import { history, rate } from '@/test/pricing';
import { createPricingApi } from './pricing-api';

function setup(...replies: Parameters<typeof fakeFetch>) {
  const fetch = fakeFetch(...replies);
  const api = createPricingApi(new ApiClient({ baseUrl: 'http://api.test/v1', fetch }));
  const call = (index: number) => {
    const [url, init] = fetch.mock.calls[index]!;
    return { path: new URL(String(url)).pathname, method: init?.method ?? 'GET', body: init?.body };
  };
  return { api, call };
}

describe('pricing api', () => {
  it('reads the rate history of an Institution (PLT-22)', async () => {
    const { api, call } = setup(ok(history()));
    expect(await api.history('i1')).toEqual(history());
    expect(call(0)).toMatchObject({ path: '/v1/platform/institutions/i1/price-rates', method: 'GET' });
  });

  it('encodes the Institution ID it puts in the path', async () => {
    const { api, call } = setup(ok([]));
    await api.history('a/../b');
    expect(call(0).path).toBe('/v1/platform/institutions/a%2F..%2Fb/price-rates');
  });

  it('adds a rate with its date and note (PLT-23)', async () => {
    const { api, call } = setup(ok(rate(), 'CREATED', 201));
    await api.set('i1', { ratePerStudentAmount: '50.00', effectiveFromDate: '2026-06-01', note: 'Renewal' });
    expect(call(0)).toMatchObject({ path: '/v1/platform/institutions/i1/price-rates', method: 'POST' });
    expect(JSON.parse(String(call(0).body))).toEqual({
      ratePerStudentAmount: '50.00',
      effectiveFromDate: '2026-06-01',
      note: 'Renewal',
    });
  });
});
