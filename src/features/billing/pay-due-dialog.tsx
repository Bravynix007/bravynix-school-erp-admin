'use client';

import { useState } from 'react';
import { FormDialog, useServerErrors, type WriteState } from '@/components/shell/form-dialog';
import { Select } from '@/components/ui/select';
import { TextField } from '@/components/ui/text-field';
import { formatMoney } from '@/lib/format/money';
import { formatSchoolDate, todayIst } from '@/lib/format/date';
import { isRealDay } from './due-form';
import { PAYMENT_MODE_NAMES, type Due, type PayDueBody } from './types';

const REFERENCE_LIMIT = 100;

const MODES = Object.entries(PAYMENT_MODE_NAMES).map(([value, label]) => ({ value, label }));

/**
 * PLT-29: record that a due was paid, when and how. Paid is final, so the dialog says so. The date cannot be
 * after today in India. Mounted only while open.
 */
export function PayDueDialog({
  due,
  write,
  onSubmit,
  onEdit,
  onClose,
}: {
  due: Due;
  write: WriteState;
  onSubmit: (body: PayDueBody) => void;
  onEdit: () => void;
  onClose: () => void;
}) {
  const today = todayIst();
  const [paidDate, setPaidDate] = useState(today);
  const [mode, setMode] = useState('');
  const [reference, setReference] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const server = useServerErrors(write.error);
  const edited = (field: string, set: (value: string) => void) => (value: string) => {
    server.edit(field);
    onEdit();
    set(value);
  };

  return (
    <FormDialog
      title={`Mark ${due.invoiceNo} as paid`}
      description={`${formatMoney(due.totalAmount)} from ${due.societyName}. A paid due cannot be changed or cancelled afterwards.`}
      submitLabel="Mark as paid"
      write={write}
      onClose={onClose}
      onSubmit={() => {
        const found: Record<string, string> = {};
        if (paidDate === '') found.paidDate = 'Choose the day it was paid.';
        else if (!isRealDay(paidDate)) found.paidDate = 'Enter a valid date.';
        else if (paidDate > today) found.paidDate = `It cannot be after today, ${formatSchoolDate(today)}.`;
        if (mode === '') found.paymentMode = 'Choose how it was paid.';
        if (reference.trim().length > REFERENCE_LIMIT) {
          found.paymentReference = `Use at most ${REFERENCE_LIMIT} characters.`;
        }
        setErrors(found);
        if (Object.keys(found).length > 0) return;
        const text = reference.trim();
        onSubmit({
          version: due.version,
          paidDate,
          paymentMode: Number(mode),
          ...(text ? { paymentReference: text } : {}),
        });
      }}
    >
      <TextField
        label="Paid on"
        type="date"
        max={today}
        requiredMark
        value={paidDate}
        onChange={(event) => edited('paidDate', setPaidDate)(event.target.value)}
        error={errors.paidDate ?? server.of('paidDate')}
      />
      <Select
        label="Paid by"
        requiredMark
        placeholder="Choose"
        options={MODES}
        value={mode}
        onChange={(event) => edited('paymentMode', setMode)(event.target.value)}
        error={errors.paymentMode ?? server.of('paymentMode')}
      />
      <TextField
        label="Reference"
        hint="Optional. A UTR, a cheque number or a receipt number."
        value={reference}
        onChange={(event) => edited('paymentReference', setReference)(event.target.value)}
        error={errors.paymentReference ?? server.of('paymentReference')}
      />
    </FormDialog>
  );
}
