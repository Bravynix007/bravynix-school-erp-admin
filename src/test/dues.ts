import type { PlatformDashboard } from '@/features/dashboard/types';
import type { Due, DueLine, DueQuote } from '@/features/billing/types';

const actor = { id: 'p1', displayName: 'A. Rao', roleName: 'Super Admin' };

export const dueLine = (changes: Partial<DueLine> = {}): DueLine => ({
  id: 'd1',
  invoiceNo: 'BNX/FY2026-27/0007',
  societyId: 's1',
  societyName: 'Sri Vidya Educational Society',
  institution: { id: 'i1', name: 'Sri Vidya High School' },
  periodStartDate: '2026-10-01',
  periodEndDate: '2026-12-31',
  totalAmount: '80000.00',
  dueStatus: 1,
  dueDate: '2026-11-15',
  paidDate: null,
  ...changes,
});

/** 1,650 students at ₹50.00 less a ₹2,500.00 rebate. */
export const due = (changes: Partial<Due> = {}): Due => ({
  ...dueLine(),
  studentCountAuto: 0,
  studentCount: 1650,
  studentCountNote: 'Counted from the register',
  priceRateId: 'r1',
  ratePerStudentAmount: '50.00',
  baseAmount: '82500.00',
  adjustmentAmount: '-2500.00',
  adjustmentNote: 'Festive discount',
  paymentMode: null,
  paymentReference: null,
  cancelledAt: null,
  cancelledBy: null,
  cancelReason: null,
  version: 1,
  createdBy: actor,
  createdAt: '2026-10-23T04:45:00.000Z',
  updatedBy: actor,
  updatedAt: '2026-10-23T04:45:00.000Z',
  ...changes,
});

export const quote = (changes: Partial<DueQuote> = {}): DueQuote => ({
  institutionId: 'i1',
  periodStartDate: '2026-10-01',
  periodEndDate: '2026-12-31',
  studentCountAuto: 0,
  priceRateId: 'r1',
  ratePerStudentAmount: '50.00',
  rateEffectiveFromDate: '2026-06-01',
  baseAmount: '0.00',
  ...changes,
});

export const dashboardFigures = (changes: Partial<PlatformDashboard> = {}): PlatformDashboard => ({
  societies: 3,
  institutions: 5,
  activeStudents: null,
  duesOutstandingAmount: '240000.00',
  duesCollectedThisMonthAmount: '80000.00',
  duesCollectedLastMonthAmount: '0.00',
  openAiReports: null,
  ...changes,
});
