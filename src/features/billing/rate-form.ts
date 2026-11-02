import type { SetRateBody } from './types';

/** The rate dialog's fields as typed (API design 10.22, PLT-23). */
export interface RateForm {
  rate: string;
  effectiveFrom: string;
  note: string;
}

export const emptyRate = (): RateForm => ({ rate: '', effectiveFrom: '', note: '' });

const NOTE_LIMIT = 500;
/** The column holds eight whole digits. */
const WHOLE_DIGITS = 8;

/** "50" or "50.5" as the API wants it: "50.00" or "50.50"; digits only, so nothing passes through a float. */
export function twoDecimals(value: string): string {
  const [whole = '', fraction = ''] = value.split('.');
  const digits = whole.replace(/^0+(?=\d)/, '') || '0';
  return `${digits}.${fraction.padEnd(2, '0')}`;
}

const isRealDay = (day: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return false;
  const [year, month, date] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const parsed = new Date(Date.UTC(year, month - 1, date));
  return (
    parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === date
  );
};

/** What can be checked before the call; keys are the API's field names. */
export function rateErrors(form: RateForm): Record<string, string> {
  const errors: Record<string, string> = {};
  if (form.rate === '' || form.rate === '.') errors.ratePerStudentAmount = 'Enter the rate per student.';
  else if (twoDecimals(form.rate).split('.')[0]!.length > WHOLE_DIGITS) {
    errors.ratePerStudentAmount = `Use at most ${WHOLE_DIGITS} digits before the decimal point.`;
  }
  if (form.effectiveFrom === '') errors.effectiveFromDate = 'Choose the first day this rate applies.';
  else if (!isRealDay(form.effectiveFrom)) errors.effectiveFromDate = 'Enter a valid date.';
  if (form.note.trim().length > NOTE_LIMIT) errors.note = `Use at most ${NOTE_LIMIT} characters.`;
  return errors;
}

export function rateBody(form: RateForm): SetRateBody {
  const note = form.note.trim();
  return {
    ratePerStudentAmount: twoDecimals(form.rate),
    effectiveFromDate: form.effectiveFrom,
    ...(note ? { note } : {}),
  };
}
