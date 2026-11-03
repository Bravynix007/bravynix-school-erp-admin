import type { MasterSpec } from './master-specs';
import type { MasterChange, MasterEntry, NewMasterEntry } from './types';

/** The add and edit dialog's fields as typed. */
export interface MasterForm {
  code: string;
  name: string;
  classCategoryId: string;
  /** Whole digits, or empty for none. */
  numericValue: string;
}

export const emptyMasterForm = (classCategoryId = ''): MasterForm => ({
  code: '',
  name: '',
  classCategoryId,
  numericValue: '',
});

export const formOfEntry = (entry: MasterEntry): MasterForm => ({
  code: entry.code,
  name: entry.name,
  classCategoryId: entry.classCategoryId ?? '',
  numericValue:
    entry.numericValue === null || entry.numericValue === undefined ? '' : String(entry.numericValue),
});

/** Any run of white space is one space, as the API reads a name, so what is sent is what is compared. */
export const cleanName = (name: string): string => name.trim().replace(/\s+/gu, ' ');

const NUMERIC_VALUE = /^\d{1,2}$/;

/** What can be checked before the call; keys are the API's field names. `adding` also checks the fixed fields. */
export function masterErrors(spec: MasterSpec, form: MasterForm, adding: boolean): Record<string, string> {
  const errors: Record<string, string> = {};
  const name = cleanName(form.name);
  if (name === '') errors.name = 'Enter a name.';
  else if (name.length > spec.nameMax) errors.name = `Use at most ${spec.nameMax} characters.`;
  if (adding) {
    if (form.code === '') errors.code = 'Enter a code.';
    else if (form.code.length > spec.codeMax) errors.code = `Use at most ${spec.codeMax} characters.`;
    else if (!spec.codePattern.test(form.code)) errors.code = spec.codeHint;
    if (spec.isClass && form.classCategoryId === '') errors.classCategoryId = 'Choose the class category.';
  }
  if (spec.isClass && form.numericValue !== '' && !NUMERIC_VALUE.test(form.numericValue)) {
    errors.numericValue = 'Use a whole number from 0 to 99, or leave it empty.';
  }
  return errors;
}

export function newEntryBody(spec: MasterSpec, form: MasterForm): NewMasterEntry {
  return {
    code: form.code,
    name: cleanName(form.name),
    ...(spec.isClass ? { classCategoryId: form.classCategoryId } : {}),
    ...(spec.isClass && form.numericValue !== '' ? { numericValue: Number(form.numericValue) } : {}),
  };
}

/** Only what changed, with the version that was read; `null` clears the numeric value. */
export function changeBody(spec: MasterSpec, entry: MasterEntry, form: MasterForm): MasterChange {
  const name = cleanName(form.name);
  const numericValue = form.numericValue === '' ? null : Number(form.numericValue);
  return {
    version: entry.version,
    ...(name === entry.name ? {} : { name }),
    ...(spec.isClass && numericValue !== (entry.numericValue ?? null) ? { numericValue } : {}),
  };
}

/** A change that carries only the version has nothing to write. */
export const isUnchanged = (body: MasterChange): boolean => Object.keys(body).length === 1;
