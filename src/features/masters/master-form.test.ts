import { describe, expect, it } from 'vitest';
import { entry } from '@/test/masters';
import {
  changeBody,
  cleanName,
  emptyMasterForm,
  formOfEntry,
  isUnchanged,
  masterErrors,
  newEntryBody,
} from './master-form';
import { MASTER_SPECS } from './master-specs';

const designation = MASTER_SPECS.designations;
const klass = MASTER_SPECS['predefined-classes'];
const section = MASTER_SPECS['predefined-sections'];
const form = (changes: Partial<ReturnType<typeof emptyMasterForm>>) => ({ ...emptyMasterForm(), ...changes });

describe('master form', () => {
  it('collapses white space in a name, as the API reads it', () => {
    expect(cleanName('  Vice \t  Principal ')).toBe('Vice Principal');
  });

  it('asks for a code and a name when adding', () => {
    expect(masterErrors(designation, emptyMasterForm(), true)).toEqual({
      name: 'Enter a name.',
      code: 'Enter a code.',
    });
  });

  it('checks the code against the limits of its master', () => {
    expect(masterErrors(designation, form({ name: 'x', code: '1ST' }), true).code).toMatch(
      /starting with a letter/,
    );
    expect(masterErrors(designation, form({ name: 'x', code: 'A'.repeat(31) }), true).code).toBe(
      'Use at most 30 characters.',
    );
    // A section code may start with a digit, and is short.
    expect(masterErrors(section, form({ name: 'x', code: '1' }), true)).toEqual({});
    expect(masterErrors(section, form({ name: 'x', code: 'ABCDEFGHIJK' }), true).code).toBe(
      'Use at most 10 characters.',
    );
  });

  it('checks the name length of its master', () => {
    expect(masterErrors(section, form({ name: 'ABCDEFGHIJK', code: 'A' }), true).name).toBe(
      'Use at most 10 characters.',
    );
  });

  it('wants a class category and a whole numeric value from 0 to 99 for a predefined class', () => {
    expect(masterErrors(klass, form({ name: '1st', code: 'C1' }), true).classCategoryId).toBe(
      'Choose the class category.',
    );
    expect(
      masterErrors(klass, form({ name: '1st', classCategoryId: 'c1', numericValue: '100' }), false)
        .numericValue,
    ).toMatch(/whole number from 0 to 99/);
    expect(
      masterErrors(klass, form({ name: '1st', classCategoryId: 'c1', numericValue: '0' }), false),
    ).toEqual({});
    expect(masterErrors(klass, form({ name: '1st', numericValue: '' }), false)).toEqual({});
  });

  it('does not check the code or the category when editing, because neither is sent', () => {
    expect(masterErrors(klass, form({ name: '1st' }), false)).toEqual({});
  });

  it('builds the body of an add', () => {
    expect(newEntryBody(designation, form({ code: 'HM', name: ' Head  Master ' }))).toEqual({
      code: 'HM',
      name: 'Head Master',
    });
    expect(
      newEntryBody(klass, form({ code: 'C1', name: '1st', classCategoryId: 'c1', numericValue: '1' })),
    ).toEqual({ code: 'C1', name: '1st', classCategoryId: 'c1', numericValue: 1 });
    expect(newEntryBody(klass, form({ code: 'C0', name: 'Nursery', classCategoryId: 'c1' }))).toEqual({
      code: 'C0',
      name: 'Nursery',
      classCategoryId: 'c1',
    });
  });

  it('sends only what changed, with the version', () => {
    const current = entry({ version: 4, name: 'Principal' });
    expect(changeBody(designation, current, formOfEntry(current))).toEqual({ version: 4 });
    expect(isUnchanged(changeBody(designation, current, formOfEntry(current)))).toBe(true);
    expect(changeBody(designation, current, { ...formOfEntry(current), name: 'Head' })).toEqual({
      version: 4,
      name: 'Head',
    });
  });

  it('clears the numeric value with null and never sends it for another master', () => {
    const current = entry({ version: 2, name: '1st', classCategoryId: 'c1', numericValue: 1 });
    expect(changeBody(klass, current, { ...formOfEntry(current), numericValue: '' })).toEqual({
      version: 2,
      numericValue: null,
    });
    expect(changeBody(klass, current, { ...formOfEntry(current), numericValue: '2' })).toEqual({
      version: 2,
      numericValue: 2,
    });
    // An entry with no numeric value, left empty, is not a change.
    const none = entry({ classCategoryId: 'c1', numericValue: null });
    expect(isUnchanged(changeBody(klass, none, formOfEntry(none)))).toBe(true);
  });
});
