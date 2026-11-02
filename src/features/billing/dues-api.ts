import { api, type ApiClient } from '@/lib/api/client';
import { getPage, type Page } from '@/lib/api/lists';
import type { CancelDueBody, Due, DueLine, DueQuote, EditDueBody, PayDueBody, RaiseDueBody } from './types';

export interface DueListQuery {
  page: number;
  limit: number;
  sort: string;
  /** Part of the invoice number; sent only from 2 characters, like every search (API design 10.22). */
  q: string;
  /** `due`, `paid` or `cancelled`; empty for all. */
  status: string;
  societyId?: string;
  institutionId?: string;
}

const STATUS_CODE: Record<string, number> = { cancelled: 0, due: 1, paid: 2 };

/** The status filter as the API's `dueStatus` parameter. */
export function dueStatusQuery(status: string): { dueStatus?: number } {
  const code = STATUS_CODE[status];
  return code === undefined ? {} : { dueStatus: code };
}

/** The due calls PLT-24 to PLT-30 (API design 10.22). */
export function createDuesApi(client: ApiClient = api) {
  const base = 'platform/dues';
  return {
    list(query: DueListQuery): Promise<Page<DueLine>> {
      return getPage<DueLine>(
        base,
        {
          page: query.page,
          limit: query.limit,
          sort: query.sort,
          q: query.q.trim().length >= 2 ? query.q.trim() : undefined,
          societyId: query.societyId,
          institutionId: query.institutionId,
          ...dueStatusQuery(query.status),
        },
        client,
      );
    },
    get: (id: string) => client.data<Due>(`${base}/${encodeURIComponent(id)}`),
    quote: (institutionId: string, periodStartDate: string, periodEndDate: string) =>
      client.data<DueQuote>(`platform/institutions/${encodeURIComponent(institutionId)}/due-quote`, {
        query: { periodStartDate, periodEndDate },
      }),
    /** One key for one raise: a retry of the same form sends it again, so a lost answer cannot raise a second invoice. */
    raise: (body: RaiseDueBody, idempotencyKey: string) =>
      client.data<Due>(base, { method: 'POST', body, idempotencyKey }),
    edit: (id: string, body: EditDueBody) =>
      client.data<Due>(`${base}/${encodeURIComponent(id)}`, { method: 'PATCH', body }),
    markPaid: (id: string, body: PayDueBody) =>
      client.data<Due>(`${base}/${encodeURIComponent(id)}/mark-paid`, { method: 'POST', body }),
    cancel: (id: string, body: CancelDueBody) =>
      client.data<Due>(`${base}/${encodeURIComponent(id)}/cancel`, { method: 'POST', body }),
  };
}

export const duesApi = createDuesApi();
