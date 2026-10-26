import { api, type ApiClient, type RequestOptions } from './client';
import type { PageMeta } from './envelope';
import { ApiError } from './api-error';

/** One page of a page-mode list (API design 13.1). */
export interface Page<T> {
  items: T[];
  meta: PageMeta;
}

/** Reads a page-mode list, keeping the paging meta the envelope carries. */
export async function getPage<T>(
  path: string,
  query: RequestOptions['query'],
  client: ApiClient = api,
): Promise<Page<T>> {
  const envelope = await client.request<T[]>(path, { query });
  const meta = envelope.meta;
  if (!envelope.data || !meta || !('totalItems' in meta)) {
    throw new ApiError(500, 'UNEXPECTED_RESPONSE', 'Something went wrong', envelope.requestId);
  }
  return { items: envelope.data, meta };
}
