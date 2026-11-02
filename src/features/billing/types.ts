import type { Actor, Stamped } from '@/lib/api/envelope';

/** One rate of an Institution (PLT-22, PLT-23; API design 10.22). */
export interface PriceRate {
  id: string;
  institutionId: string;
  /** Rupees per student, an exact decimal string with two decimals. */
  ratePerStudentAmount: string;
  /** The first day the rate applies, `YYYY-MM-DD`. */
  effectiveFromDate: string;
  note: string | null;
  /** The rate that applies today; at most one row is. */
  inForce: boolean;
  createdAt: string;
  createdBy: Actor;
}

/** The body of PLT-23. */
export interface SetRateBody {
  ratePerStudentAmount: string;
  effectiveFromDate: string;
  note?: string;
}

/** 0 Cancelled, 1 Due, 2 Paid (PRD 11.4). */
export const DueStatus = { Cancelled: 0, Due: 1, Paid: 2 } as const;

/** 1 Cash, 2 Bank transfer, 3 UPI, 4 Cheque (PRD 11.4). */
export const PAYMENT_MODE_NAMES: Record<number, string> = {
  1: 'Cash',
  2: 'Bank transfer',
  3: 'UPI',
  4: 'Cheque',
};

/** One line of the Dues ledger (PLT-25). */
export interface DueLine {
  id: string;
  invoiceNo: string;
  societyId: string;
  societyName: string;
  institution: { id: string; name: string };
  periodStartDate: string;
  periodEndDate: string;
  totalAmount: string;
  dueStatus: number;
  dueDate: string | null;
  paidDate: string | null;
}

/** One due in full (PLT-26, PLT-27, PLT-28 to PLT-30). */
export interface Due extends DueLine, Stamped {
  studentCountAuto: number;
  studentCount: number;
  studentCountNote: string | null;
  priceRateId: string;
  ratePerStudentAmount: string;
  baseAmount: string;
  adjustmentAmount: string;
  adjustmentNote: string | null;
  paymentMode: number | null;
  paymentReference: string | null;
  cancelledAt: string | null;
  cancelledBy: Actor | null;
  cancelReason: string | null;
  version: number;
}

/** PLT-24: what a due for a period starts from. The rate is `null` while none applies yet. */
export interface DueQuote {
  institutionId: string;
  periodStartDate: string;
  periodEndDate: string;
  studentCountAuto: number;
  priceRateId: string | null;
  ratePerStudentAmount: string | null;
  rateEffectiveFromDate: string | null;
  baseAmount: string | null;
}

/** The body of PLT-26. */
export interface RaiseDueBody {
  institutionId: string;
  periodStartDate: string;
  periodEndDate: string;
  studentCount: number;
  studentCountNote?: string;
  adjustmentAmount?: string;
  adjustmentNote?: string;
  dueDate?: string;
}

/** The body of PLT-28: the version read, and only the fields that changed. A note or the due date set to `null` is cleared. */
export interface EditDueBody {
  version: number;
  periodStartDate?: string;
  periodEndDate?: string;
  studentCount?: number;
  studentCountNote?: string | null;
  adjustmentAmount?: string;
  adjustmentNote?: string | null;
  dueDate?: string | null;
}

/** The body of PLT-29. */
export interface PayDueBody {
  version: number;
  paidDate: string;
  paymentMode: number;
  paymentReference?: string;
}

/** The body of PLT-30. */
export interface CancelDueBody {
  version: number;
  reason: string;
}
