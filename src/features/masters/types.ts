/** The four masters the console keeps (API design 10.4g). Places are edited through the API only, for now. */
export const MASTER_TYPES = [
  'class-categories',
  'predefined-classes',
  'predefined-sections',
  'designations',
] as const;

export type MasterType = (typeof MASTER_TYPES)[number];

/**
 * One entry of a master: `status` 1 is shown and 0 is hidden (nothing is ever deleted). Masters are public reference
 * data, so an entry carries no author stamps. A predefined class also has its category and a numeric value.
 */
export interface MasterEntry {
  id: string;
  status: 0 | 1;
  version: number;
  code: string;
  name: string;
  displayOrder: number;
  /** Predefined classes only; fixed once added. */
  classCategoryId?: string;
  /** Predefined classes only: 0 to 99, or null. */
  numericValue?: number | null;
}

/** PLT-31: `displayOrder` is left out, so the entry goes last; it is moved with the arrows afterwards. */
export interface NewMasterEntry {
  code: string;
  name: string;
  classCategoryId?: string;
  numericValue?: number;
}

/** PLT-32: `version` is required; the code and the category are fixed, so they are never sent. */
export interface MasterChange {
  version: number;
  name?: string;
  numericValue?: number | null;
  /** The position the entry moves to, hidden entries counted. */
  displayOrder?: number;
  status?: 0 | 1;
}
