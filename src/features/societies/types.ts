import type { Stamped } from '@/lib/api/envelope';

export interface Phone {
  countryCode: string;
  number: string;
}

export interface Address {
  line1: string | null;
  line2: string | null;
  pincode: string | null;
}

/** One row of PLT-02 (API design 10.4b). */
export interface SocietySummary extends Stamped {
  code: string;
  name: string;
  /** 1 active, 0 deactivated. */
  status: number;
  institutionCount: number;
}

/** The Society resource of PLT-03, PLT-04, PLT-05, PLT-07 and PLT-08. */
export interface Society extends Stamped {
  code: string;
  name: string;
  description: string | null;
  email: string | null;
  phone: Phone | null;
  website: string | null;
  foundedDate: string | null;
  address: Address;
  status: number;
  institutionCount: number;
  version: number;
}

export interface SocietyDetail extends Society {
  institutions: { id: string; code: string; name: string; status: number }[];
  owners: { id: string; displayName: string; email: string; accountStatus: number }[];
}

export interface NewOwner {
  email: string;
  firstName?: string;
  lastName?: string;
}

/** The body of PLT-03; an empty optional field is left out. */
export interface CreateSocietyBody {
  name: string;
  code: string;
  description?: string;
  email?: string;
  phone?: Phone;
  website?: string;
  foundedDate?: string;
  address?: { line1: string; line2?: string; pincode?: string };
  owners: NewOwner[];
}

/** The body of PLT-05: `null` clears an optional field. */
export interface UpdateSocietyBody {
  version: number;
  name?: string;
  description?: string | null;
  email?: string | null;
  phone?: Phone | null;
  website?: string | null;
  foundedDate?: string | null;
  address?: { line1: string; line2?: string; pincode?: string } | null;
}
