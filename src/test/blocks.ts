import type { AccessBlock } from '@/features/blocks/types';
import type { InstitutionSummary } from '@/features/institutions/types';

const actor = { id: 'p1', displayName: 'A. Rao', roleName: 'Super Admin' };

export const block = (changes: Partial<AccessBlock> = {}): AccessBlock => ({
  id: 'b1',
  section: 'staff',
  societyId: 's1',
  institutionId: 'i1',
  reason: 'Annual fee unpaid',
  blockedAt: '2026-10-27T04:30:00.000Z',
  blockedBy: actor,
  ...changes,
});

export const institution = (changes: Partial<InstitutionSummary> = {}): InstitutionSummary => ({
  id: 'i1',
  societyId: 's1',
  societyName: 'Sri Vidya Educational Society',
  code: 'SVHS',
  name: 'Sri Vidya High School',
  place: 'Bengaluru',
  boardCode: null,
  status: 1,
  blockedSections: [],
  createdBy: actor,
  createdAt: '2026-10-01T04:30:00.000Z',
  updatedBy: actor,
  updatedAt: '2026-10-02T04:30:00.000Z',
  ...changes,
});
