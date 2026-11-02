import { describe, expect, it } from 'vitest';
import { rateBody, rateErrors, twoDecimals, type RateForm } from './rate-form';

const form = (changes: Partial<RateForm> = {}): RateForm => ({
  rate: '50',
  effectiveFrom: '2026-06-01',
  note: '',
  ...changes,
});

describe('twoDecimals', () => {
  it.each([
    ['50', '50.00'],
    ['50.5', '50.50'],
    ['50.', '50.00'],
    ['.5', '0.50'],
    ['007.25', '7.25'],
    ['0', '0.00'],
    ['12345678.99', '12345678.99'],
  ])('%s → %s', (input, expected) => {
    expect(twoDecimals(input)).toBe(expected);
  });
});

describe('rateErrors', () => {
  it('accepts a rate and a date', () => {
    expect(rateErrors(form())).toEqual({});
  });

  it('asks for the rate and the date', () => {
    expect(rateErrors(form({ rate: '', effectiveFrom: '' }))).toEqual({
      ratePerStudentAmount: 'Enter the rate per student.',
      effectiveFromDate: 'Choose the first day this rate applies.',
    });
    expect(rateErrors(form({ rate: '.' })).ratePerStudentAmount).toBe('Enter the rate per student.');
  });

  it('refuses a rate with more than eight whole digits, which the column cannot hold', () => {
    expect(rateErrors(form({ rate: '99999999.99' }))).toEqual({});
    expect(rateErrors(form({ rate: '100000000' })).ratePerStudentAmount).toMatch(/at most 8 digits/);
  });

  it('refuses a date that is not a real day', () => {
    expect(rateErrors(form({ effectiveFrom: '2026-02-30' })).effectiveFromDate).toBe('Enter a valid date.');
    expect(rateErrors(form({ effectiveFrom: '2028-02-29' }))).toEqual({});
    expect(rateErrors(form({ effectiveFrom: '06/01/2026' })).effectiveFromDate).toBe('Enter a valid date.');
  });

  it('limits the note to 500 characters, counting what is kept', () => {
    expect(rateErrors(form({ note: ` ${'a'.repeat(500)} ` }))).toEqual({});
    expect(rateErrors(form({ note: 'a'.repeat(501) })).note).toBe('Use at most 500 characters.');
  });
});

describe('rateBody', () => {
  it('sends the rate with two decimals and leaves an empty note out', () => {
    expect(rateBody(form())).toEqual({ ratePerStudentAmount: '50.00', effectiveFromDate: '2026-06-01' });
  });

  it('trims the note', () => {
    expect(rateBody(form({ rate: '45.5', note: '  Renewal  ' }))).toEqual({
      ratePerStudentAmount: '45.50',
      effectiveFromDate: '2026-06-01',
      note: 'Renewal',
    });
  });
});
