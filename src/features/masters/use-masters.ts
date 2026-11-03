'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { mastersApi } from './masters-api';
import type { MasterChange, MasterType, NewMasterEntry } from './types';

export const masterKeys = {
  all: ['masters'] as const,
  list: (type: MasterType) => [...masterKeys.all, type] as const,
};

export function useMasterList(type: MasterType, enabled = true) {
  return useQuery({ queryKey: masterKeys.list(type), queryFn: () => mastersApi.list(type), enabled });
}

/** Any write can move other entries (a new position shifts the ones it passes), so the list is read again. */
function useMasterWrite<Input, Output>(write: (input: Input) => Promise<Output>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: write,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: masterKeys.all });
    },
  });
}

export const useAddMasterEntry = (type: MasterType) =>
  useMasterWrite((body: NewMasterEntry) => mastersApi.create(type, body));

export const useChangeMasterEntry = (type: MasterType) =>
  useMasterWrite(({ id, body }: { id: string; body: MasterChange }) => mastersApi.update(type, id, body));
