import { ApiError } from '@/lib/api/api-error';
import { api, type ApiClient } from '@/lib/api/client';
import { getPage, type Page } from '@/lib/api/lists';
import type { AccessBlock, BlockSection, BlockSectionBody, BlockTarget } from './types';

export interface BlockListQuery {
  societyId: string;
  institutionId?: string;
  section?: BlockSection;
  limit: number;
}

/** The section-block calls PLT-42 to PLT-44 (API design 10.4e). */
export function createBlocksApi(client: ApiClient = api) {
  const base = 'platform/access-blocks';

  const list = (query: BlockListQuery): Promise<Page<AccessBlock>> =>
    getPage<AccessBlock>(base, { page: 1, ...query }, client);

  return {
    list,
    block: (body: BlockSectionBody) => client.data<AccessBlock>(base, { method: 'POST', body }),
    lift: (id: string) => client.data<{ id: string; status: 0 }>(`${base}/${id}`, { method: 'DELETE' }),
    /**
     * Lifts the active block of one section. A list of Institutions shows which sections are blocked but not the
     * block's ID, so this finds it first. A block that is gone by then answers as PLT-43 does for one already lifted.
     */
    async unblock(target: BlockTarget): Promise<{ id: string; status: 0 }> {
      const found = await list({
        societyId: target.societyId,
        institutionId: target.institutionId ?? undefined,
        section: target.section,
        limit: 1,
      });
      const block = found.items.find((item) => item.institutionId === target.institutionId);
      if (!block) throw new ApiError(404, 'NOT_FOUND', 'No active block', null);
      return client.data<{ id: string; status: 0 }>(`${base}/${block.id}`, { method: 'DELETE' });
    },
  };
}

export const blocksApi = createBlocksApi();
