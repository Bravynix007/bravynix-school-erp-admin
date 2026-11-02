import { fromPaise, sumDue, toPaise } from './due-math';
import { twoDecimals } from './rate-form';
import type { Due, EditDueBody, RaiseDueBody } from './types';

/** The raise and edit forms' fields as typed (API design 10.22). */
export interface DueForm {
  periodStart: string;
  periodEnd: string;
  studentCount: string;
  studentCountNote: string;
  /** Signed rupees; empty means 0.00. */
  adjustment: string;
  adjustmentNote: string;
  dueDate: string;
}

export const emptyDueForm = (): DueForm => ({
  periodStart: '',
  periodEnd: '',
  studentCount: '',
  studentCountNote: '',
  adjustment: '',
  adjustmentNote: '',
  dueDate: '',
});

export const dueFormOf = (due: Due): DueForm => ({
  periodStart: due.periodStartDate,
  periodEnd: due.periodEndDate,
  studentCount: String(due.studentCount),
  studentCountNote: due.studentCountNote ?? '',
  adjustment: toPaise(due.adjustmentAmount) === 0n ? '' : due.adjustmentAmount,
  adjustmentNote: due.adjustmentNote ?? '',
  dueDate: due.dueDate ?? '',
});

const NOTE_LIMIT = 500;
/** The most students one due may count (API design 10.22). */
export const MAX_STUDENTS = 1_000_000;
/** The adjustment column holds eight whole digits. */
const WHOLE_DIGITS = 8;

export function isRealDay(day: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return false;
  const [year, month, date] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const parsed = new Date(Date.UTC(year, month - 1, date));
  return (
    parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === date
  );
}

/** "-500" as "-500.00", "" and "-" as "0.00": the API wants exactly two decimals. */
export function adjustmentAmount(value: string): string {
  const negative = value.startsWith('-');
  const digits = negative ? value.slice(1) : value;
  if (digits === '' || digits === '.') return '0.00';
  const amount = twoDecimals(digits);
  return negative && amount !== '0.00' ? `-${amount}` : amount;
}

/** The typed count as a number, or `undefined` while it is empty or not whole digits. */
export function studentCountOf(value: string): number | undefined {
  return /^\d{1,7}$/.test(value.trim()) ? Number(value.trim()) : undefined;
}

export interface FormContext {
  /** What the system counts by itself: the quote's, or the due's own; 0 until People holds students. */
  autoCount: number;
  /** The rate per student the total is worked out with, when known. */
  rate: string | null;
}

/** What can be checked before the call; keys are the API's field names. */
export function dueFormErrors(form: DueForm, context: FormContext): Record<string, string> {
  const errors: Record<string, string> = {};
  if (form.periodStart === '') errors.periodStartDate = 'Choose the first day of the period.';
  else if (!isRealDay(form.periodStart)) errors.periodStartDate = 'Enter a valid date.';
  if (form.periodEnd === '') errors.periodEndDate = 'Choose the last day of the period.';
  else if (!isRealDay(form.periodEnd)) errors.periodEndDate = 'Enter a valid date.';
  else if (!errors.periodStartDate && form.periodEnd < form.periodStart) {
    errors.periodEndDate = 'The period must end on or after the day it starts.';
  }

  const count = studentCountOf(form.studentCount);
  if (form.studentCount.trim() === '') errors.studentCount = 'Enter the number of students.';
  else if (count === undefined || count > MAX_STUDENTS) {
    errors.studentCount = `Enter a whole number from 0 to ${MAX_STUDENTS.toLocaleString('en-IN')}.`;
  }

  const countNote = form.studentCountNote.trim();
  if (count !== undefined && count !== context.autoCount && countNote === '') {
    errors.studentCountNote = 'Say where this count comes from. It differs from the automatic count.';
  } else if (countNote.length > NOTE_LIMIT) {
    errors.studentCountNote = `Use at most ${NOTE_LIMIT} characters.`;
  }

  const adjustment = form.adjustment.trim();
  const amount = adjustmentAmount(adjustment);
  const digits = amount.replace('-', '').split('.')[0]!.length;
  if (digits > WHOLE_DIGITS) {
    errors.adjustmentAmount = `Use at most ${WHOLE_DIGITS} digits before the decimal point.`;
  } else if (toPaise(amount) !== 0n && form.adjustmentNote.trim() === '') {
    errors.adjustmentNote = 'Say why. The Society’s Owners see this note.';
  } else if (form.adjustmentNote.trim().length > NOTE_LIMIT) {
    errors.adjustmentNote = `Use at most ${NOTE_LIMIT} characters.`;
  }
  if (!errors.adjustmentAmount && count !== undefined && context.rate !== null) {
    if (sumDue(count, context.rate, amount)?.negative) {
      errors.adjustmentAmount = 'The total cannot be below ₹0.00. Reduce the deduction.';
    }
  }

  if (form.dueDate !== '' && !isRealDay(form.dueDate)) errors.dueDate = 'Enter a valid date.';
  return errors;
}

const orNull = (text: string): string | null => (text.trim() === '' ? null : text.trim());

/** PLT-26: the fields that have a value; a note or due date left empty is left out. */
export function raiseBody(institutionId: string, form: DueForm): RaiseDueBody {
  const amount = adjustmentAmount(form.adjustment.trim());
  const countNote = orNull(form.studentCountNote);
  const adjustmentNote = orNull(form.adjustmentNote);
  return {
    institutionId,
    periodStartDate: form.periodStart,
    periodEndDate: form.periodEnd,
    studentCount: Number(form.studentCount.trim()),
    ...(countNote ? { studentCountNote: countNote } : {}),
    ...(toPaise(amount) !== 0n ? { adjustmentAmount: amount } : {}),
    ...(adjustmentNote ? { adjustmentNote } : {}),
    ...(form.dueDate ? { dueDate: form.dueDate } : {}),
  };
}

/**
 * PLT-28: the version the due was read at and only what changed, because the API keeps a field that is left out. An
 * emptied note or due date is sent as `null`, which clears it. An amount is compared by value, so `-0.00` is no change.
 */
export function editBody(due: Due, form: DueForm): EditDueBody {
  const body: EditDueBody = { version: due.version };
  if (form.periodStart !== due.periodStartDate) body.periodStartDate = form.periodStart;
  if (form.periodEnd !== due.periodEndDate) body.periodEndDate = form.periodEnd;
  const count = Number(form.studentCount.trim());
  if (count !== due.studentCount) body.studentCount = count;
  const countNote = orNull(form.studentCountNote);
  if (countNote !== due.studentCountNote) body.studentCountNote = countNote;
  const amount = adjustmentAmount(form.adjustment.trim());
  if (toPaise(amount) !== toPaise(due.adjustmentAmount)) body.adjustmentAmount = fromPaise(toPaise(amount)!);
  const adjustmentNote = orNull(form.adjustmentNote);
  if (adjustmentNote !== due.adjustmentNote) body.adjustmentNote = adjustmentNote;
  const dueDate = form.dueDate === '' ? null : form.dueDate;
  if (dueDate !== due.dueDate) body.dueDate = dueDate;
  return body;
}

/** True when the edit would change nothing, so the form can say so instead of sending it. */
export const isUnchanged = (body: EditDueBody): boolean => Object.keys(body).length === 1;
