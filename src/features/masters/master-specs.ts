import type { MasterType } from './types';

/** What differs between the four masters: their names, and the limits the API puts on a code and a name. */
export interface MasterSpec {
  type: MasterType;
  /** The tab. */
  label: string;
  /** "class category": used in sentences, in lower case. */
  noun: string;
  addLabel: string;
  codeMax: number;
  /** Upper case letters, digits and `_`; a section code may also start with a digit (API design 10.4g). */
  codePattern: RegExp;
  codeHint: string;
  nameMax: number;
  /** Predefined classes belong to a category and carry a numeric value. */
  isClass: boolean;
}

const CODE = /^[A-Z][A-Z0-9_]*$/;
const CODE_HINT = 'Capital letters, digits and _, starting with a letter. It cannot be changed later.';

export const MASTER_SPECS: Record<MasterType, MasterSpec> = {
  'class-categories': {
    type: 'class-categories',
    label: 'Class categories',
    noun: 'class category',
    addLabel: 'Add class category',
    codeMax: 30,
    codePattern: CODE,
    codeHint: CODE_HINT,
    nameMax: 60,
    isClass: false,
  },
  'predefined-classes': {
    type: 'predefined-classes',
    label: 'Predefined classes',
    noun: 'predefined class',
    addLabel: 'Add predefined class',
    codeMax: 20,
    codePattern: CODE,
    codeHint: CODE_HINT,
    nameMax: 50,
    isClass: true,
  },
  'predefined-sections': {
    type: 'predefined-sections',
    label: 'Predefined sections',
    noun: 'predefined section',
    addLabel: 'Add predefined section',
    codeMax: 10,
    codePattern: /^[A-Z0-9][A-Z0-9_]*$/,
    codeHint: 'Capital letters, digits and _. It cannot be changed later.',
    nameMax: 10,
    isClass: false,
  },
  designations: {
    type: 'designations',
    label: 'Designations',
    noun: 'designation',
    addLabel: 'Add designation',
    codeMax: 30,
    codePattern: CODE,
    codeHint: CODE_HINT,
    nameMax: 60,
    isClass: false,
  },
};

/** Copy for the codes the masters' writes can answer with (API design 10.4g), beside the shared ones. */
export const MASTER_WRITE_COPY: Record<string, string> = {
  DUPLICATE: 'Another entry already uses this code or name.',
  NOT_FOUND: 'This entry, or its class category, no longer exists. Reload to see the latest.',
  REFERENCE_INACTIVE: 'This class category is hidden. Show it again first, or choose another.',
  OUT_OF_RANGE: 'That position is outside the list. Reload to see the latest order.',
  FIELD_NOT_ALLOWED: 'The code and the class category cannot be changed once an entry is added.',
};
