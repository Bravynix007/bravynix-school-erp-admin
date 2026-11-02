import { describe, expect, it } from 'vitest';
import { due } from '@/test/dues';
import {
  adjustmentAmount,
  dueFormErrors,
  dueFormOf,
  editBody,
  emptyDueForm,
  isUnchanged,
  raiseBody,
  studentCountOf,
  type DueForm,
} from './due-form';

const form = (changes: Partial<DueForm> = {}): DueForm => ({
  periodStart: '2026-10-01',
  periodEnd: '2026-12-31',
  studentCount: '1650',
  studentCountNote: 'Counted from the register',
  adjustment: '-2500',
  adjustmentNote: 'Festive discount',
  dueDate: '',
  ...changes,
});
const context = { autoCount: 0, rate: '50.00' };

describe('adjustmentAmount', () => {
  it.each([
    ['', '0.00'],
    ['-', '0.00'],
    ['.', '0.00'],
    ['-0', '0.00'],
    ['-2500', '-2500.00'],
    ['-2500.5', '-2500.50'],
    ['300', '300.00'],
    ['007.1', '7.10'],
  ])('%j → %s', (typed, expected) => {
    expect(adjustmentAmount(typed)).toBe(expected);
  });
});

describe('studentCountOf', () => {
  it('reads whole digits only', () => {
    expect(studentCountOf(' 1650 ')).toBe(1650);
    expect(studentCountOf('0')).toBe(0);
    for (const text of ['', '1.5', '-3', 'ten', '12345678']) expect(studentCountOf(text)).toBeUndefined();
  });
});

describe('dueFormErrors', () => {
  it('accepts a complete form', () => {
    expect(dueFormErrors(form(), context)).toEqual({});
  });

  it('asks for the period and the count', () => {
    expect(dueFormErrors(emptyDueForm(), context)).toEqual({
      periodStartDate: 'Choose the first day of the period.',
      periodEndDate: 'Choose the last day of the period.',
      studentCount: 'Enter the number of students.',
    });
  });

  it('refuses a period that ends before it starts, and dates that are not days', () => {
    expect(dueFormErrors(form({ periodEnd: '2026-09-30' }), context).periodEndDate).toMatch(/on or after/);
    expect(dueFormErrors(form({ periodStart: '2026-02-30' }), context).periodStartDate).toBe(
      'Enter a valid date.',
    );
    expect(dueFormErrors(form({ dueDate: '31/12/2026' }), context).dueDate).toBe('Enter a valid date.');
  });

  it('refuses a count that is not a whole number up to a million', () => {
    expect(dueFormErrors(form({ studentCount: '1.5' }), context).studentCount).toMatch(/whole number/);
    expect(dueFormErrors(form({ studentCount: '1000001' }), context).studentCount).toMatch(/whole number/);
    expect(dueFormErrors(form({ studentCount: '1000000' }), context)).toEqual({});
  });

  it('needs a note for a count that differs from the automatic one, and none for the same count', () => {
    expect(dueFormErrors(form({ studentCountNote: ' ' }), context).studentCountNote).toMatch(/Say where/);
    expect(
      dueFormErrors(
        form({ studentCount: '0', studentCountNote: '', adjustment: '', adjustmentNote: '' }),
        context,
      ),
    ).toEqual({});
    expect(
      dueFormErrors(form({ studentCountNote: '' }), { autoCount: 1650, rate: '50.00' }).studentCountNote,
    ).toBeUndefined();
  });

  it('needs a note for an adjustment that is not zero, and none for zero or nothing', () => {
    expect(dueFormErrors(form({ adjustmentNote: '' }), context).adjustmentNote).toMatch(/Say why/);
    expect(dueFormErrors(form({ adjustment: '', adjustmentNote: '' }), context)).toEqual({});
    expect(dueFormErrors(form({ adjustment: '-0.00', adjustmentNote: '' }), context)).toEqual({});
  });

  it('limits both notes to 500 characters', () => {
    const long = 'a'.repeat(501);
    const errors = dueFormErrors(form({ studentCountNote: long, adjustmentNote: long }), context);
    expect(errors.studentCountNote).toBe('Use at most 500 characters.');
    expect(errors.adjustmentNote).toBe('Use at most 500 characters.');
  });

  it('refuses a deduction that takes the total below zero, once the rate is known', () => {
    const errors = dueFormErrors(form({ studentCount: '10', adjustment: '-500.01' }), context);
    expect(errors.adjustmentAmount).toMatch(/below ₹0\.00/);
    expect(
      dueFormErrors(form({ studentCount: '10', adjustment: '-500' }), context).adjustmentAmount,
    ).toBeUndefined();
    expect(
      dueFormErrors(form({ studentCount: '10', adjustment: '-500.01' }), { autoCount: 0, rate: null })
        .adjustmentAmount,
    ).toBeUndefined();
  });

  it('refuses an adjustment with more than eight whole digits', () => {
    expect(dueFormErrors(form({ adjustment: '123456789' }), context).adjustmentAmount).toMatch(
      /at most 8 digits/,
    );
  });
});

describe('raiseBody', () => {
  it('sends what has a value, with the adjustment as two decimals and the notes trimmed', () => {
    expect(raiseBody('i1', form({ studentCountNote: ' Register ', dueDate: '2026-11-15' }))).toEqual({
      institutionId: 'i1',
      periodStartDate: '2026-10-01',
      periodEndDate: '2026-12-31',
      studentCount: 1650,
      studentCountNote: 'Register',
      adjustmentAmount: '-2500.00',
      adjustmentNote: 'Festive discount',
      dueDate: '2026-11-15',
    });
  });

  it('leaves out an empty note, a zero adjustment and no due date', () => {
    expect(raiseBody('i1', form({ studentCountNote: '', adjustment: '-0', adjustmentNote: '' }))).toEqual({
      institutionId: 'i1',
      periodStartDate: '2026-10-01',
      periodEndDate: '2026-12-31',
      studentCount: 1650,
    });
  });
});

describe('editBody', () => {
  const current = due({ dueDate: '2026-11-15' });
  const same = dueFormOf(current);

  it('starts from the due as it is, with the rebate shown and a zero adjustment empty', () => {
    expect(same).toMatchObject({ studentCount: '1650', adjustment: '-2500.00', dueDate: '2026-11-15' });
    expect(dueFormOf(due({ adjustmentAmount: '0.00', adjustmentNote: null })).adjustment).toBe('');
  });

  it('is only the version when nothing changed, including an amount written another way', () => {
    expect(editBody(current, same)).toEqual({ version: 1 });
    expect(isUnchanged(editBody(current, { ...same, adjustment: '-2500' }))).toBe(true);
    expect(
      isUnchanged(editBody(current, { ...same, studentCountNote: '  Counted from the register ' })),
    ).toBe(true);
  });

  it('sends only the fields that changed', () => {
    const body = editBody(current, {
      ...same,
      studentCount: '1700',
      studentCountNote: 'Recount',
      dueDate: '2026-12-01',
    });
    expect(body).toEqual({
      version: 1,
      studentCount: 1700,
      studentCountNote: 'Recount',
      dueDate: '2026-12-01',
    });
    expect(isUnchanged(body)).toBe(false);
  });

  it('clears a note or the due date by sending null, and a zero adjustment as 0.00', () => {
    expect(editBody(current, { ...same, adjustment: '', adjustmentNote: '', dueDate: '' })).toEqual({
      version: 1,
      adjustmentAmount: '0.00',
      adjustmentNote: null,
      dueDate: null,
    });
  });

  it('sends a changed period', () => {
    expect(editBody(current, { ...same, periodStart: '2026-10-02', periodEnd: '2027-01-01' })).toEqual({
      version: 1,
      periodStartDate: '2026-10-02',
      periodEndDate: '2027-01-01',
    });
  });
});
