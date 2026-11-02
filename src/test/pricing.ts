import type { PriceRate } from '@/features/billing/types';
import type { InstitutionDetail } from '@/features/institutions/types';

const actor = { id: 'p1', displayName: 'A. Rao', roleName: 'Super Admin' };
const stamps = {
  createdBy: actor,
  createdAt: '2026-10-01T04:30:00.000Z',
  updatedBy: actor,
  updatedAt: '2026-10-02T04:30:00.000Z',
};

export const rate = (changes: Partial<PriceRate> = {}): PriceRate => ({
  id: 'r1',
  institutionId: 'i1',
  ratePerStudentAmount: '50.00',
  effectiveFromDate: '2026-06-01',
  note: null,
  inForce: true,
  createdAt: '2026-05-28T10:10:00.000Z',
  createdBy: actor,
  ...changes,
});

/** The history of PLT-22: newest effective date first, one rate in force. */
export const history = (): PriceRate[] => [
  rate({ id: 'r3', ratePerStudentAmount: '55.00', effectiveFromDate: '2027-04-01', inForce: false }),
  rate({ note: 'Annual revision agreed in the renewal' }),
  rate({ id: 'r2', ratePerStudentAmount: '45.00', effectiveFromDate: '2025-06-01', inForce: false }),
];

export const institutionDetail = (changes: Partial<InstitutionDetail> = {}): InstitutionDetail => ({
  id: 'i1',
  societyId: 's1',
  societyName: 'Sri Vidya Educational Society',
  societyStatus: 1,
  code: 'SVHS',
  name: 'Sri Vidya High School',
  place: 'Whitefield',
  boardCode: 2,
  affiliationNumber: 'KA-089',
  gstin: null,
  email: 'office@svhs.example.org',
  phone: { countryCode: '91', number: '9876543210' },
  telephone: null,
  address: { line1: '12 Lake Road', line2: null, pincode: '560066' },
  location: null,
  status: 1,
  version: 2,
  blockedSections: [],
  ...stamps,
  ...changes,
});
