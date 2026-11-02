'use client';

import { useState } from 'react';
import { MoneyField } from '@/components/ui/money-field';
import { TextField } from '@/components/ui/text-field';
import { Textarea } from '@/components/ui/textarea';
import { FormDialog, useServerErrors, type WriteState } from '@/components/shell/form-dialog';
import { emptyRate, rateBody, rateErrors, type RateForm } from './rate-form';
import type { SetRateBody } from './types';

/**
 * PLT-23: a new rate and the first day it applies. Rates are only ever added; the dues already raised keep the
 * rate they were raised at. Mounted only while open.
 */
export function SetRateDialog({
  institutionName,
  write,
  onSubmit,
  onEdit,
  onClose,
}: {
  institutionName: string;
  write: WriteState;
  onSubmit: (body: SetRateBody) => void;
  /** A field was edited: the refusal was about the old values, so its banner goes too. */
  onEdit: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<RateForm>(emptyRate);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const server = useServerErrors(write.error);
  const set = (key: keyof RateForm, field: string) => (value: string) => {
    server.edit(field);
    onEdit();
    setForm((current) => ({ ...current, [key]: value }));
  };

  return (
    <FormDialog
      title={`Set a new rate for ${institutionName}`}
      description="Dues raised from now on for a period starting on or after this date use it. Dues already raised keep their rate."
      submitLabel="Set rate"
      write={write}
      onClose={onClose}
      onSubmit={() => {
        const found = rateErrors(form);
        setErrors(found);
        if (Object.keys(found).length === 0) onSubmit(rateBody(form));
      }}
    >
      <MoneyField
        label="Rate per student"
        autoFocus
        requiredMark
        value={form.rate}
        onValueChange={set('rate', 'ratePerStudentAmount')}
        error={errors.ratePerStudentAmount ?? server.of('ratePerStudentAmount')}
      />
      <TextField
        label="In force from"
        type="date"
        requiredMark
        value={form.effectiveFrom}
        onChange={(event) => set('effectiveFrom', 'effectiveFromDate')(event.target.value)}
        error={errors.effectiveFromDate ?? server.of('effectiveFromDate')}
        hint="It can be today, a day in the past or a day to come. One rate per day."
      />
      <Textarea
        label="Note"
        hint="Optional. For example, the contract it comes from."
        value={form.note}
        onChange={(event) => set('note', 'note')(event.target.value)}
        error={errors.note ?? server.of('note')}
      />
    </FormDialog>
  );
}
