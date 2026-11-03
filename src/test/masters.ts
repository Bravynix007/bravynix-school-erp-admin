import type { MasterEntry } from '@/features/masters/types';

export const entry = (changes: Partial<MasterEntry> = {}): MasterEntry => ({
  id: 'e1',
  status: 1,
  version: 1,
  code: 'DES_PRINCIPAL',
  name: 'Principal',
  displayOrder: 1,
  ...changes,
});

/** Seven categories would be noise: two are enough to see grouping and order. */
export const categories = (): MasterEntry[] => [
  entry({ id: 'c1', code: 'LOWER_PRIMARY', name: 'Lower Primary', displayOrder: 1 }),
  entry({ id: 'c2', code: 'HIGH_SCHOOL', name: 'High School', displayOrder: 2 }),
];

export const classes = (): MasterEntry[] => [
  entry({ id: 'k1', code: 'CLASS_1', name: '1st', displayOrder: 1, classCategoryId: 'c1', numericValue: 1 }),
  entry({ id: 'k2', code: 'CLASS_2', name: '2nd', displayOrder: 2, classCategoryId: 'c1', numericValue: 2 }),
  entry({
    id: 'k3',
    code: 'CLASS_9',
    name: '9th',
    displayOrder: 3,
    classCategoryId: 'c2',
    numericValue: 9,
    status: 0,
  }),
];
