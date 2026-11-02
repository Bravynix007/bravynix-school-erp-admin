import type { Actor } from '@/lib/api/envelope';

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
