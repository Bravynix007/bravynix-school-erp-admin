import type { Stamped } from '@/lib/api/envelope';
import type { Phone } from '@/features/societies/types';

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

/** PLT-45: one Institution of any Society, as Super Admin reads it (API design 10.4c). */
export interface InstitutionDetail extends Stamped {
  societyId: string;
  societyName: string;
  /** 1 active, 0 deactivated. The Institution keeps its own status when its Society is deactivated. */
  societyStatus: number;
  code: string;
  name: string;
  place: string | null;
  boardCode: number | null;
  affiliationNumber: string | null;
  gstin: string | null;
  email: string | null;
  phone: Phone | null;
  telephone: string | null;
  address: { line1: string; line2: string | null; pincode: string | null };
  location: { latitude: number; longitude: number } | null;
  /** 1 active, 0 deactivated. */
  status: number;
  version: number;
  blockedSections: ('staff' | 'students')[];
}
