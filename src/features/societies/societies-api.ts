import { api, type ApiClient } from '@/lib/api/client';
import { getPage, type Page } from '@/lib/api/lists';
import type { CreateSocietyBody, Society, SocietyDetail, SocietySummary, UpdateSocietyBody } from './types';

export interface SocietyListQuery {
  page: number;
  limit: number;
  sort: string;
  /** Sent only from 2 characters: the API refuses shorter searches (API design 10.4b). */
  q: string;
  /** `active`, `paused` or `inactive`; empty for all. */
  status: string;
}

/** The status filter as the API's `status` and `paused` parameters. */
export function statusQuery(status: string): { status?: number; paused?: boolean } {
  if (status === 'active') return { status: 1, paused: false };
  if (status === 'paused') return { status: 1, paused: true };
  if (status === 'inactive') return { status: 0 };
  return {};
}

/** The Society calls PLT-02 to PLT-08 (API design 10.4b). */
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
    pause: (id: string, body: { reason: string; version: number }) =>
      client.data<Society>(`${base}/${id}/pause`, { method: 'POST', body }),
    resume: (id: string, body: { version: number }) =>
      client.data<Society>(`${base}/${id}/resume`, { method: 'POST', body }),
  };
}

export const societiesApi = createSocietiesApi();
