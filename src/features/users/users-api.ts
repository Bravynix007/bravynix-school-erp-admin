import { api, type ApiClient } from '@/lib/api/client';
import { getPage, type Page } from '@/lib/api/lists';
import type { Account, NewPerson, SocietyOwner, SuperAdmin, UnlockResult } from './types';

export interface OwnerListQuery {
  page: number;
  limit: number;
  sort: string;
  /** Sent only from 2 characters: the API refuses shorter searches (API design 10.4d). */
  q: string;
}

/** The people and account calls PLT-09 to PLT-18 and PLT-41 (API design 10.4d). */
export function createUsersApi(client: ApiClient = api) {
  const platform = 'platform';
  return {
    superAdmins: () => client.data<SuperAdmin[]>(`${platform}/super-admins`),
    addSuperAdmin: (body: NewPerson) =>
      client.data<SuperAdmin>(`${platform}/super-admins`, { method: 'POST', body }),
    removeSuperAdmin: (userId: string) =>
      client.data<{ id: string; status: 0 }>(`${platform}/super-admins/${userId}`, { method: 'DELETE' }),
    owners(query: OwnerListQuery): Promise<Page<SocietyOwner>> {
      return getPage<SocietyOwner>(
        `${platform}/society-owners`,
        {
          page: query.page,
          limit: query.limit,
          sort: query.sort,
          q: query.q.trim().length >= 2 ? query.q.trim() : undefined,
        },
        client,
      );
    },
    block: (userId: string, body: { reason: string; version: number }) =>
      client.data<Account>(`${platform}/users/${userId}/block`, { method: 'POST', body }),
    unblock: (userId: string, body: { version: number }) =>
      client.data<Account>(`${platform}/users/${userId}/unblock`, { method: 'POST', body }),
    changeEmail: (userId: string, body: { email: string; version: number }) =>
      client.data<Account>(`${platform}/users/${userId}/email`, { method: 'PUT', body }),
    resetAuthenticator: (userId: string) =>
      client.data<{ id: string; authenticatorSetUp: false }>(`${platform}/users/${userId}/mfa`, {
        method: 'DELETE',
      }),
    unlock: (userId: string, body: { reason: string }) =>
      client.data<UnlockResult>(`${platform}/users/${userId}/unlock`, { method: 'POST', body }),
  };
}

export const usersApi = createUsersApi();
