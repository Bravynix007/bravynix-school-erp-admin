/** The account fields PLT-12 and PLT-11 share, and what PLT-15 to PLT-17 answer (API design 10.4d). */
export interface Account {
  id: string;
  email: string;
  displayName: string;
  /** 1 active, 2 blocked, 0 inactive (a Pending account is reported Active). */
  accountStatus: number;
  blockedAt: string | null;
  blockReason: string | null;
  version: number;
}

/** One Super Admin of PLT-12. */
export interface SuperAdmin extends Account {
  seatNo: number;
  authenticatorSetUp: boolean;
  grantedAt: string;
}

/** One Society Owner of PLT-11, with the Society they own. */
export interface SocietyOwner extends Account {
  seatNo: number;
  grantedAt: string;
  society: { id: string; code: string; name: string };
}

/** The person a Users screen acts on: both kinds carry the account, and Super Admins also an authenticator. */
export type Person = SuperAdmin | SocietyOwner;

export const isSuperAdmin = (person: Person): person is SuperAdmin => 'authenticatorSetUp' in person;

export interface NewPerson {
  email: string;
  firstName?: string;
  lastName?: string;
}

export interface UnlockResult {
  id: string;
  loginLockCleared: boolean;
  authenticatorLockCleared: boolean;
}

export const MAX_SUPER_ADMINS = 3;
export const ACCOUNT_BLOCKED = 2;
