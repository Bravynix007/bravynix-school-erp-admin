import type { SocietyOwner, SuperAdmin } from '@/features/users/types';

export const superAdmin = (changes: Partial<SuperAdmin> = {}): SuperAdmin => ({
  id: 'u1',
  email: 'ananya.rao@bravynix.in',
  displayName: 'Ananya Rao',
  accountStatus: 1,
  blockedAt: null,
  blockReason: null,
  version: 4,
  seatNo: 1,
  authenticatorSetUp: true,
  grantedAt: '2026-10-01T04:30:00.000Z',
  ...changes,
});

export const owner = (changes: Partial<SocietyOwner> = {}): SocietyOwner => ({
  id: 'o1',
  email: 'asha@example.org',
  displayName: 'Asha Rao',
  accountStatus: 1,
  blockedAt: null,
  blockReason: null,
  version: 2,
  seatNo: 1,
  grantedAt: '2026-10-02T04:30:00.000Z',
  society: { id: 's1', code: 'SVES', name: 'Sri Vidya Educational Society' },
  ...changes,
});

export const ownerPage = (items: SocietyOwner[]) => ({
  items,
  meta: { page: 1, limit: 20, totalItems: items.length, totalPages: 1 },
});
