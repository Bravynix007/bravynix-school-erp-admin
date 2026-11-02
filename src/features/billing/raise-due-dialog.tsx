'use client';

import { useEffect, useRef, useState } from 'react';
import { FormDialog, useServerErrors, type WriteState } from '@/components/shell/form-dialog';
import { InlineAlert } from '@/components/ui/inline-alert';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError } from '@/lib/api/api-error';
import { dueFormErrors, emptyDueForm, isRealDay, raiseBody, studentCountOf, type DueForm } from './due-form';
import { DUE_FIELD, DueFields, DuePreview, NoRateAlert } from './due-fields';
import { InstitutionPicker, type PickedInstitution } from './institution-picker';
import type { RaiseDueBody } from './types';
import { useDueQuote } from './use-dues';

/**
 * PLT-26: raise a due for one Institution and a period. The quote (PLT-24) gives the rate in force on the first day
 * and the automatic student count. One Idempotency-Key belongs to one form: a retry of the same details sends it
 * again, so a lost answer cannot raise a second invoice, and changed details get a new one. Mounted only while open.
 */
export function RaiseDueDialog({
  institution: given,
  write,
  onSubmit,
  onEdit,
  onClose,
}: {
  /** The Institution the form was opened from; it cannot be changed. */
  institution?: PickedInstitution;
  write: WriteState;
  onSubmit: (body: RaiseDueBody, idempotencyKey: string) => void;
  /** A field was edited: the refusal was about the old details, so its banner goes too. */
  onEdit: () => void;
  onClose: () => void;
}) {
  const [institution, setInstitution] = useState<PickedInstitution | null>(given ?? null);
  const [form, setForm] = useState<DueForm>(emptyDueForm);
  const [typedCount, setTypedCount] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const server = useServerErrors(write.error);
  /**
   * The key of the last raise, and whether the API gave a definite refusal for it. A refusal (409, 422) is stored with
   * its key for 24 hours, so sending the same key again would replay it: the next try takes a new key. While the
   * outcome is unknown (no answer, a 5xx, a request still in progress) the first raise may have landed, so the key is
   * kept even when the details change: the API replays it, or answers IDEMPOTENCY_KEY_REUSED, instead of raising a
   * second invoice.
   */
  const sent = useRef<{ key: string; refused: boolean } | null>(null);
  useEffect(() => {
    if (sent.current && write.error && isDefiniteRefusal(write.error)) sent.current.refused = true;
  }, [write.error]);

  const periodKnown =
    isRealDay(form.periodStart) && isRealDay(form.periodEnd) && form.periodEnd >= form.periodStart;
  const quote = useDueQuote(institution?.id ?? null, form.periodStart, form.periodEnd, periodKnown);
  const quoted = periodKnown ? quote.data : undefined;
  const autoCount = quoted?.studentCountAuto ?? 0;
  const rate = quoted?.ratePerStudentAmount ?? null;
  const noRate = quoted !== undefined && rate === null;
  // The count is prefilled from the system only when the system has one, and never over what was typed.
  const shown: DueForm = {
    ...form,
    studentCount: typedCount || autoCount === 0 ? form.studentCount : String(autoCount),
  };

  const change = (key: keyof DueForm, value: string) => {
    server.edit(DUE_FIELD[key]);
    onEdit();
    if (key === 'studentCount') setTypedCount(true);
    setForm((current) => ({ ...current, [key]: value }));
  };

  return (
    <FormDialog
      title="Raise a due"
      description="The Society’s Owners are emailed when it is raised. It uses the rate in force on the first day of the period."
      submitLabel="Raise due"
      write={write}
      onClose={onClose}
      onSubmit={() => {
        const found = dueFormErrors(shown, { autoCount, rate });
        if (institution === null) found.institutionId = 'Choose the Institution.';
        else if (noRate) found.periodStartDate = 'No rate is in force on this day.';
        setErrors(found);
        if (institution === null || Object.keys(found).length > 0) return;
        const body = raiseBody(institution.id, shown);
        if (sent.current === null || sent.current.refused) {
          sent.current = { key: crypto.randomUUID(), refused: false };
        }
        onSubmit(body, sent.current.key);
      }}
    >
      <InstitutionPicker
        value={institution}
        onChange={setInstitution}
        locked={given !== undefined}
        error={errors.institutionId}
      />
      <DueFields
        form={shown}
        autoCount={autoCount}
        onChange={change}
        errorOf={(field) => errors[field] ?? server.of(field)}
      />
      {institution !== null && periodKnown && quote.isPending ? <Skeleton className="h-24 w-full" /> : null}
      {institution !== null && periodKnown && quote.isError ? (
        <InlineAlert tone="warning">
          The rate and the student count could not be loaded. Change a date to try again.
        </InlineAlert>
      ) : null}
      {institution !== null && noRate ? (
        <NoRateAlert institutionId={institution.id} periodStart={form.periodStart} />
      ) : null}
      {rate !== null && studentCountOf(shown.studentCount) !== undefined ? (
        <DuePreview form={shown} rate={rate} />
      ) : null}
    </FormDialog>
  );
}

/** A refusal the API sent: a 4xx with a code of its own, other than one that says the first request may have landed. */
const MAY_HAVE_LANDED = new Set([
  'IDEMPOTENCY_IN_PROGRESS',
  'RESOURCE_BUSY',
  'IDEMPOTENCY_KEY_REUSED',
  'UNEXPECTED_RESPONSE',
]);

function isDefiniteRefusal(error: unknown): boolean {
  return (
    error instanceof ApiError && error.status >= 400 && error.status < 500 && !MAY_HAVE_LANDED.has(error.code)
  );
}
