import type { Actor } from '@/lib/api/envelope';

/** What a block stops (API design 10.4e): a Society's Owners, or an Institution's staff or students' parents. */
export type BlockSection = 'owners' | 'staff' | 'students';

/** The block resource of PLT-42 and PLT-44. `institutionId` is null for `owners`. */
export interface AccessBlock {
  id: string;
  section: BlockSection;
  societyId: string;
  institutionId: string | null;
  reason: string;
  blockedAt: string;
  blockedBy: Actor;
}

/** The body of PLT-42. */
export interface BlockSectionBody {
  section: BlockSection;
  societyId: string;
  institutionId?: string;
  reason: string;
}

/** The one section of one Society or Institution a block applies to. */
export interface BlockTarget {
  section: BlockSection;
  societyId: string;
  institutionId: string | null;
}
