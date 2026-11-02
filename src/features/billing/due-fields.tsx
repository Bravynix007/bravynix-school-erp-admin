'use client';

import { InlineAlert } from '@/components/ui/inline-alert';
import { LinkButton } from '@/components/ui/link-button';
import { MoneyBreakdown } from '@/components/ui/money-breakdown';
import { MoneyField } from '@/components/ui/money-field';
import { TextField } from '@/components/ui/text-field';
import { Textarea } from '@/components/ui/textarea';
import { institutionWorkspaceHref } from '@/features/institutions/institution-workspace';
import { formatMoney } from '@/lib/format/money';
import { formatSchoolDate } from '@/lib/format/date';
import { adjustmentAmount, studentCountOf, type DueForm } from './due-form';
import { sumDue, toPaise } from './due-math';

/** The API's name for each field, which is where a server refusal is shown and cleared. */
export const DUE_FIELD: Record<keyof DueForm, string> = {
  periodStart: 'periodStartDate',
  periodEnd: 'periodEndDate',
  studentCount: 'studentCount',
  studentCountNote: 'studentCountNote',
  adjustment: 'adjustmentAmount',
  adjustmentNote: 'adjustmentNote',
  dueDate: 'dueDate',
};

/**
 * The fields the raise and the edit share (API design 10.22). `autoCount` is what the system counts, which is 0 until
 * People holds students; the count note is required when the typed count differs from it.
 */
export function DueFields({
  form,
  autoCount,
  onChange,
  errorOf,
}: {
  form: DueForm;
  autoCount: number;
  onChange: (key: keyof DueForm, value: string) => void;
  /** The line under a field, by the API's name for it: the form's own check, or the server's refusal. */
  errorOf: (field: string) => string | undefined;
}) {
  const field = (key: keyof DueForm) => ({
    value: form[key],
    onChange: (event: { target: { value: string } }) => onChange(key, event.target.value),
    error: errorOf(DUE_FIELD[key]),
  });
  const count = studentCountOf(form.studentCount);
  const countNeedsNote = count !== undefined && count !== autoCount;
  const adjustmentNeedsNote = toPaise(adjustmentAmount(form.adjustment.trim())) !== 0n;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Period starts" type="date" requiredMark {...field('periodStart')} />
        <TextField label="Period ends" type="date" requiredMark {...field('periodEnd')} />
      </div>
      <TextField
        label="Students"
        inputMode="numeric"
        autoComplete="off"
        requiredMark
        hint={
          autoCount === 0
            ? 'No students are on the system yet, so type the count and say where it comes from.'
            : `The system counts ${autoCount.toLocaleString('en-IN')}.`
        }
        {...field('studentCount')}
      />
      <Textarea
        label="Where the count comes from"
        requiredMark={countNeedsNote}
        hint={countNeedsNote ? 'Required, because the count differs from the automatic one.' : 'Optional.'}
        {...field('studentCountNote')}
      />
      <MoneyField
        label="Adjustment"
        signed
        hint="A deduction starts with a minus, such as -2500. Leave empty for none."
        value={form.adjustment}
        onValueChange={(value) => onChange('adjustment', value)}
        error={errorOf(DUE_FIELD.adjustment)}
      />
      <Textarea
        label="Note for the Owners"
        requiredMark={adjustmentNeedsNote}
        hint="Shown to the Society’s Owners. Required when there is an adjustment."
        {...field('adjustmentNote')}
      />
      <TextField label="Pay by" type="date" hint="Optional." {...field('dueDate')} />
    </>
  );
}

/** The sum as the Owners will see it, worked out here to preview; the API's answer is the one that counts. */
export function DuePreview({ form, rate }: { form: DueForm; rate: string }) {
  const count = studentCountOf(form.studentCount);
  if (count === undefined) return null;
  const sum = sumDue(count, rate, adjustmentAmount(form.adjustment.trim()));
  if (!sum) return null;
  const adjustment = adjustmentAmount(form.adjustment.trim());
  const rows = [
    {
      label: `${count.toLocaleString('en-IN')} ${count === 1 ? 'student' : 'students'} × ${formatMoney(rate)}`,
      amount: sum.base,
    },
    ...(toPaise(adjustment) !== 0n ? [{ label: 'Adjustment', amount: adjustment }] : []),
  ];
  return (
    <MoneyBreakdown label="Amount of this due" rows={rows} total={{ label: 'Total', amount: sum.total }} />
  );
}

/** Why a due cannot be raised yet: there is no rate on the day the period starts. */
export function NoRateAlert({ institutionId, periodStart }: { institutionId: string; periodStart: string }) {
  return (
    <InlineAlert tone="warning">
      No rate is in force on {formatSchoolDate(periodStart)}. Set one in the Pricing tab before raising this
      due.{' '}
      <LinkButton href={institutionWorkspaceHref(institutionId, 'pricing')} variant="tertiary">
        Open Pricing
      </LinkButton>
    </InlineAlert>
  );
}
