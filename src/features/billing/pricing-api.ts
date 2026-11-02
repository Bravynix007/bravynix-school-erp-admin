import { api, type ApiClient } from '@/lib/api/client';
import type { PriceRate, SetRateBody } from './types';

/** The rate calls PLT-22 and PLT-23 (API design 10.22): per student, only ever added. */
export function createPricingApi(client: ApiClient = api) {
  const path = (institutionId: string) => `platform/institutions/${institutionId}/price-rates`;
  return {
    /** Newest effective date first; `inForce` marks the rate that applies today. */
    history: (institutionId: string) => client.data<PriceRate[]>(path(institutionId)),
    set: (institutionId: string, body: SetRateBody) =>
      client.data<PriceRate>(path(institutionId), { method: 'POST', body }),
  };
}

export const pricingApi = createPricingApi();
