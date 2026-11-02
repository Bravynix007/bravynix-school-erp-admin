'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { pricingApi } from './pricing-api';
import type { SetRateBody } from './types';

export const pricingKeys = {
  all: ['pricing'] as const,
  history: (institutionId: string) => [...pricingKeys.all, 'history', institutionId] as const,
};

export function useRateHistory(institutionId: string) {
  return useQuery({
    queryKey: pricingKeys.history(institutionId),
    queryFn: () => pricingApi.history(institutionId),
  });
}

/** A new rate refreshes the history; a due quote built from it (C2) is keyed under the same root. */
export function useSetRate(institutionId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: SetRateBody) => pricingApi.set(institutionId, body),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: pricingKeys.all });
    },
  });
}
