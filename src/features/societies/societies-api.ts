import { api, type ApiClient } from '@/lib/api/client';
import { getPage, type Page } from '@/lib/api/lists';
import type { CreateSocietyBody, Society, SocietyDetail, SocietySummary, UpdateSocietyBody } from './types';

export interface SocietyListQuery {
  page: number;
  limit: number;
  sort: string;
  /** Sent only from 2 characters: the API refuses shorter searches (API design 10.4b). */
  q: string;
  /** `active` or `inactive`; empty for all. */
  status: string;
}

/** The status filter as the API's `status` parameter. */
export function statusQuery(status: string): { status?: number } {
  if (status === 'active') return { status: 1 };
  if (status === 'inactive') return { status: 0 };
  return {};
}

/** The Society calls PLT-02 to PLT-06 (API design 10.4b). */
export function createSocietiesApi(client: ApiClient = api) {
  const base = 'platform/societies';
  return {
    list(query: SocietyListQuery): Promise<Page<SocietySummary>> {
      return getPage<SocietySummary>(
        base,
        {
          page: query.page,
          limit: query.limit,
          sort: query.sort,
          q: query.q.trim().length >= 2 ? query.q.trim() : undefined,
          ...statusQuery(query.status),
        },
        client,
      );
    },
    create: (body: CreateSocietyBody) => client.data<SocietyDetail>(base, { method: 'POST', body }),
    get: (id: string) => client.data<SocietyDetail>(`${base}/${id}`),
    update: (id: string, body: UpdateSocietyBody) =>
      client.data<Society>(`${base}/${id}`, { method: 'PATCH', body }),
    deactivate: (id: string) => client.data<{ id: string; status: 0 }>(`${base}/${id}`, { method: 'DELETE' }),
  };
}

export const societiesApi = createSocietiesApi();
