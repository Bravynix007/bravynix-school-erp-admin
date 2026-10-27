'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { societyKeys } from '@/features/societies/use-societies';
import type { NewPerson } from './types';
import { usersApi, type OwnerListQuery } from './users-api';

export const userKeys = {
  all: ['users'] as const,
  superAdmins: () => [...userKeys.all, 'super-admins'] as const,
  owners: (query: OwnerListQuery) => [...userKeys.all, 'owners', query] as const,
};

export function useSuperAdmins() {
  return useQuery({ queryKey: userKeys.superAdmins(), queryFn: () => usersApi.superAdmins() });
}

export function useOwnerList(query: OwnerListQuery) {
  return useQuery({
    queryKey: userKeys.owners(query),
    queryFn: () => usersApi.owners(query),
    placeholderData: keepPreviousData,
  });
}

/** Every account write refreshes both lists, and the Societies that show their Owners' state. */
function useUserWrite<Input, Output>(write: (input: Input) => Promise<Output>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: write,
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: userKeys.all }),
        client.invalidateQueries({ queryKey: societyKeys.all }),
      ]);
    },
  });
}

export const useAddSuperAdmin = () => useUserWrite((body: NewPerson) => usersApi.addSuperAdmin(body));
export const useRemoveSuperAdmin = () => useUserWrite((userId: string) => usersApi.removeSuperAdmin(userId));
export const useBlockAccount = (userId: string) =>
  useUserWrite((body: { reason: string; version: number }) => usersApi.block(userId, body));
export const useUnblockAccount = (userId: string) =>
  useUserWrite((body: { version: number }) => usersApi.unblock(userId, body));
export const useChangeEmail = (userId: string) =>
  useUserWrite((body: { email: string; version: number }) => usersApi.changeEmail(userId, body));
export const useResetAuthenticator = (userId: string) =>
  useUserWrite(() => usersApi.resetAuthenticator(userId));
export const useUnlockAccount = (userId: string) =>
  useUserWrite((body: { reason: string }) => usersApi.unlock(userId, body));
