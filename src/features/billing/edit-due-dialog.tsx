'use client';

import { useState } from 'react';
import { FormDialog, useServerErrors, type WriteState } from '@/components/shell/form-dialog';
import { InlineAlert } from '@/components/ui/inline-alert';
import { dueFormErrors, dueFormOf, editBody, isUnchanged, studentCountOf, type DueForm } from './due-form';
import { DUE_FIELD, DueFields, DuePreview } from './due-fields';
import type { Due, EditDueBody } from './types';

/**
 * PLT-28: change a due that is still Due. Only what changed is sent, with the version that was read. The rate stays
 * the one frozen on the due unless the period start moves, and then the API takes the rate in force on the new day.
 * Mounted only while open.
 */
export function EditDueDialog({
  due,
  write,
  onSubmit,
  onEdit,
  onClose,
}: {
  due: Due;
  write: WriteState;
  onSubmit: (body: EditDueBody) => void;
  onEdit: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<DueForm>(() => dueFormOf(due));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [unchanged, setUnchanged] = useState(false);
  const server = useServerErrors(write.error);
  // The frozen rate is known only while the period starts where it did.
  const rate = form.periodStart === due.periodStartDate ? due.ratePerStudentAmount : null;

  const change = (key: keyof DueForm, value: string) => {
    server.edit(DUE_FIELD[key]);
    onEdit();
    setUnchanged(false);
    setForm((current) => ({ ...current, [key]: value }));
  };

  return (
    <FormDialog
      title={`Edit ${due.invoiceNo}`}
      description="The Owners are not emailed about an edit. The invoice number and the Institution cannot change."
      submitLabel="Save changes"
      write={write}
      onClose={onClose}
      onSubmit={() => {
        const found = dueFormErrors(form, { autoCount: due.studentCountAuto, rate });
        setErrors(found);
        if (Object.keys(found).length > 0) return;
        const body = editBody(due, form);
        if (isUnchanged(body)) setUnchanged(true);
        else onSubmit(body);
      }}
    >
      <DueFields
        form={form}
        autoCount={due.studentCountAuto}
        onChange={change}
        errorOf={(field) => errors[field] ?? server.of(field)}
      />
      {rate !== null && studentCountOf(form.studentCount) !== undefined ? (
        <DuePreview form={form} rate={rate} />
      ) : (
        <InlineAlert tone="info">
          The period starts on a different day, so the rate in force on that day is used. The total is worked
          out when you save.
        </InlineAlert>
      )}
      {unchanged ? <InlineAlert tone="info">Nothing has changed yet.</InlineAlert> : null}
    </FormDialog>
  );
}
