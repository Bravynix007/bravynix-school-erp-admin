import type { Actor } from '@/lib/api/envelope';
import type { SocietyDetail, SocietySummary } from '@/features/societies/types';

const actor: Actor = { id: 'p1', displayName: 'A. Rao', roleName: 'Super Admin' };
const stamps = {
  createdBy: actor,
  createdAt: '2026-10-01T04:30:00.000Z',
  updatedBy: actor,
  updatedAt: '2026-10-02T04:30:00.000Z',
};

export const summary = (changes: Partial<SocietySummary> = {}): SocietySummary => ({
  id: 's1',
  code: 'SVES',
  name: 'Sri Vidya Educational Society',
  status: 1,
  institutionCount: 2,
  blocked: false,
  ...stamps,
  ...changes,
});

export const society = (changes: Partial<SocietyDetail> = {}): SocietyDetail => ({
  id: 's1',
  code: 'SVES',
  name: 'Sri Vidya Educational Society',
  description: 'A trust',
  email: 'office@svs.example.org',
  phone: { countryCode: '91', number: '9876543210' },
  website: null,
  foundedDate: '1998-06-01',
  address: { line1: '12 MG Road', line2: null, pincode: '560001' },
  status: 1,
  institutionCount: 1,
  version: 3,
  blockedSections: [],
  institutions: [{ id: 'i1', code: 'SVHS', name: 'Sri Vidya High School', status: 1, blockedSections: [] }],
  owners: [{ id: 'o1', displayName: 'Asha Rao', email: 'asha@example.org', accountStatus: 1 }],
  ...stamps,
  ...changes,
});
