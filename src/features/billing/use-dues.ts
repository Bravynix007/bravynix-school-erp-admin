'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { duesApi, type DueListQuery } from './dues-api';
import type { CancelDueBody, EditDueBody, PayDueBody, RaiseDueBody } from './types';

export const dueKeys = {
  all: ['dues'] as const,
  list: (query: DueListQuery) => [...dueKeys.all, 'list', query] as const,
  detail: (id: string) => [...dueKeys.all, 'detail', id] as const,
  quote: (institutionId: string, start: string, end: string) =>
    [...dueKeys.all, 'quote', institutionId, start, end] as const,
};

export function useDueList(query: DueListQuery) {
  return useQuery({
    queryKey: dueKeys.list(query),
    queryFn: () => duesApi.list(query),
    placeholderData: keepPreviousData,
  });
}

export function useDue(id: string | null) {
  return useQuery({
    queryKey: dueKeys.detail(id ?? ''),
    queryFn: () => duesApi.get(id ?? ''),
    enabled: id !== null,
  });
}

/** The prefill for a period; asked only once the Institution and a period that runs forward are known. */
export function useDueQuote(institutionId: string | null, start: string, end: string, enabled: boolean) {
  return useQuery({
    queryKey: dueKeys.quote(institutionId ?? '', start, end),
    queryFn: () => duesApi.quote(institutionId ?? '', start, end),
    enabled: enabled && institutionId !== null,
  });
}

/**
 * A due write changes the ledger and what each Society owes (PLT-02, PLT-04) and what the dashboard totals (PLT-01),
 * so all three are read again.
 */
function useDueWrite<Input, Output>(write: (input: Input) => Promise<Output>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: write,
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: dueKeys.all }),
        client.invalidateQueries({ queryKey: ['societies'] }),
        client.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
    },
  });
}

export const useRaiseDue = () =>
  useDueWrite(({ body, idempotencyKey }: { body: RaiseDueBody; idempotencyKey: string }) =>
    duesApi.raise(body, idempotencyKey),
  );

export const useEditDue = (id: string) => useDueWrite((body: EditDueBody) => duesApi.edit(id, body));

export const useMarkDuePaid = (id: string) => useDueWrite((body: PayDueBody) => duesApi.markPaid(id, body));

export const useCancelDue = (id: string) => useDueWrite((body: CancelDueBody) => duesApi.cancel(id, body));
