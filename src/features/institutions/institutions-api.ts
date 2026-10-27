import { api, type ApiClient } from '@/lib/api/client';
import { getPage, type Page } from '@/lib/api/lists';
import { statusQuery } from '@/features/societies/societies-api';
import type { InstitutionSummary } from './types';

export interface InstitutionListQuery {
  page: number;
  limit: number;
  sort: string;
  /** Sent only from 2 characters: the API refuses shorter searches (API design 10.4c). */
  q: string;
  /** `active` or `inactive`; empty for all. */
  status: string;
  /** `blocked` or `open`; empty for all. */
  blocked: string;
}

/** The blocked filter as the API's `blocked` parameter. */
export function blockedQuery(blocked: string): { blocked?: boolean } {
  if (blocked === 'blocked') return { blocked: true };
  if (blocked === 'open') return { blocked: false };
  return {};
}

/** PLT-19: Super Admin reads the Institutions of every Society; Owners add and edit them (API design 10.4c). */
export function createInstitutionsApi(client: ApiClient = api) {
  return {
    list(query: InstitutionListQuery): Promise<Page<InstitutionSummary>> {
      return getPage<InstitutionSummary>(
        'platform/institutions',
        {
          page: query.page,
          limit: query.limit,
          sort: query.sort,
          q: query.q.trim().length >= 2 ? query.q.trim() : undefined,
          ...statusQuery(query.status),
          ...blockedQuery(query.blocked),
        },
        client,
      );
    },
  };
}

export const institutionsApi = createInstitutionsApi();
