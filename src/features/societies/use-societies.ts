'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { societiesApi, type SocietyListQuery } from './societies-api';
import type { NewPerson } from '@/features/users/types';
import type { CreateSocietyBody, UpdateSocietyBody } from './types';

export const societyKeys = {
  all: ['societies'] as const,
  list: (query: SocietyListQuery) => [...societyKeys.all, 'list', query] as const,
  detail: (id: string) => [...societyKeys.all, 'detail', id] as const,
};

export function useSocietyList(query: SocietyListQuery) {
  return useQuery({
    queryKey: societyKeys.list(query),
    queryFn: () => societiesApi.list(query),
    placeholderData: keepPreviousData,
  });
}

export function useSociety(id: string | null) {
  return useQuery({
    queryKey: societyKeys.detail(id ?? ''),
    queryFn: () => societiesApi.get(id ?? ''),
    enabled: id !== null,
  });
}

/** Every Society write refreshes the lists and the open detail. */
function useSocietyWrite<Input, Output>(write: (input: Input) => Promise<Output>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: write,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: societyKeys.all });
    },
  });
}

export const useCreateSociety = () => useSocietyWrite((body: CreateSocietyBody) => societiesApi.create(body));

export const useUpdateSociety = (id: string) =>
  useSocietyWrite((body: UpdateSocietyBody) => societiesApi.update(id, body));

export const useDeactivateSociety = (id: string) => useSocietyWrite(() => societiesApi.deactivate(id));

/** An Owner seat changes the Society's Owners and the Users list. */
function useOwnerWrite<Input, Output>(write: (input: Input) => Promise<Output>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: write,
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: societyKeys.all }),
        client.invalidateQueries({ queryKey: ['users'] }),
      ]);
    },
  });
}

export const useAddOwner = (societyId: string) =>
  useOwnerWrite((body: NewPerson) => societiesApi.addOwner(societyId, body));

export const useRemoveOwner = (societyId: string) =>
  useOwnerWrite((userId: string) => societiesApi.removeOwner(societyId, userId));
