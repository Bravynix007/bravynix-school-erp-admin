import { api, type ApiClient } from '@/lib/api/client';
import type { MasterChange, MasterEntry, MasterType, NewMasterEntry } from './types';

/**
 * MST-01 and PLT-31 to PLT-33 (API design 10.4g). A hidden entry is shown again by a `status` change, so PLT-33
 * (hide) is not needed: one PATCH carries the version check for hiding, showing and moving alike.
 */
export function createMastersApi(client: ApiClient = api) {
  const entryPath = (type: MasterType, id: string) => `platform/masters/${type}/${encodeURIComponent(id)}`;
  return {
    /** Every entry, hidden ones too, in display order. `no-cache` so the browser revalidates: the console must see a change at once. */
    list: (type: MasterType) =>
      client.data<MasterEntry[]>(`masters/${type}`, { query: { includeHidden: true }, cache: 'no-cache' }),
    create: (type: MasterType, body: NewMasterEntry) =>
      client.data<MasterEntry>(`platform/masters/${type}`, { method: 'POST', body }),
    update: (type: MasterType, id: string, body: MasterChange) =>
      client.data<MasterEntry>(entryPath(type, id), { method: 'PATCH', body }),
  };
}

export const mastersApi = createMastersApi();
