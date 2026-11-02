import { api, type ApiClient } from '@/lib/api/client';
import type { PlatformDashboard } from './types';

/** PLT-01: worked out when asked, so a payment just recorded is already in it. */
export function createDashboardApi(client: ApiClient = api) {
  return {
    get: () => client.data<PlatformDashboard>('platform/dashboard'),
  };
}

export const dashboardApi = createDashboardApi();
