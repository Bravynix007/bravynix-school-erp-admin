import { describe, expect, it } from 'vitest';
import { ApiClient } from '@/lib/api/client';
import { fakeFetch, ok } from '@/test/fake-api';
import { createDashboardApi } from './dashboard-api';

describe('dashboard api', () => {
  it('reads PLT-01', async () => {
    const figures = {
      societies: 3,
      institutions: 5,
      activeStudents: null,
      duesOutstandingAmount: '80000.00',
      duesCollectedThisMonthAmount: '0.00',
      duesCollectedLastMonthAmount: '0.00',
      openAiReports: null,
    };
    const fetch = fakeFetch(ok(figures));
    const api = createDashboardApi(new ApiClient({ baseUrl: 'http://api.test/v1', fetch }));
    expect(await api.get()).toEqual(figures);
    expect(new URL(String(fetch.mock.calls[0]![0])).pathname).toBe('/v1/platform/dashboard');
  });
});
