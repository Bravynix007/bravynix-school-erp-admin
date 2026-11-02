'use client';

import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { fieldErrorsOf } from '@/lib/api/field-errors';
import { WriteError } from './write-error';

export interface WriteState {
  pending: boolean;
  error: unknown;
  /** Shown beside Reload after a version conflict. */
  onReload?: () => void;
  /** Copy for codes that mean something particular to this action. */
  overrides?: Record<string, string>;
}

/** A dialog that is one form: Enter submits, and the buttons sit in the footer (DESIGN.md 12). */
export function FormDialog({
  title,
  description,
  submitLabel,
  dismissLabel = 'Cancel',
  tone = 'primary',
  write,
  onSubmit,
  onClose,
  children,
}: {
  title: string;
  description?: string;
  submitLabel: string;
  /** The button that closes without writing; "Cancel" unless that word means something else on this dialog. */
  dismissLabel?: string;
  tone?: 'primary' | 'danger';
  write: WriteState;
  onSubmit: () => void;
  onClose: () => void;
  children: ReactNode;
}) {
  const formId = useId();
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!write.pending) onSubmit();
  }
  return (
    <Dialog
      open
      onClose={() => {
        if (!write.pending) onClose();
      }}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={write.pending}>
            {dismissLabel}
          </Button>
          <Button
            type="submit"
            form={formId}
            variant={tone === 'danger' ? 'danger' : 'primary'}
            loading={write.pending}
          >
            {submitLabel}
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={submit} className="flex flex-col gap-4">
        {children}
        {write.error ? (
          <WriteError error={write.error} onReload={write.onReload} overrides={write.overrides} />
        ) : null}
      </form>
    </Dialog>
  );
}

/**
 * The API's field errors for the last write, each dropped as soon as its field is edited: the message was about
 * the old value, and stays off until the next refusal.
 */
export function useServerErrors(error: unknown) {
  const [edited, setEdited] = useState<{ error: unknown; fields: ReadonlySet<string> }>({
    error,
    fields: new Set(),
  });
  const fields = edited.error === error ? edited.fields : new Set<string>();
  const server = fieldErrorsOf(error);
  return {
    of: (field: string): string | undefined => (fields.has(field) ? undefined : server[field]),
    edit: (field: string) => setEdited({ error, fields: new Set(fields).add(field) }),
  };
}
