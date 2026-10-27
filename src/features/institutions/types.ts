import type { Stamped } from '@/lib/api/envelope';

/** One row of PLT-19 (API design 10.4c). */
export interface InstitutionSummary extends Stamped {
  societyId: string;
  societyName: string;
  code: string;
  name: string;
  place: string | null;
  boardCode: number | null;
  /** 1 active, 0 deactivated. */
  status: number;
  blockedSections: ('staff' | 'students')[];
}
