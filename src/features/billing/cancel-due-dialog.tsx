'use client';

import { useState } from 'react';
import { FormDialog, useServerErrors, type WriteState } from '@/components/shell/form-dialog';
import { Textarea } from '@/components/ui/textarea';
import type { CancelDueBody, Due } from './types';

const MIN = 5;
const MAX = 500;

/** PLT-30: cancel a due that is still Due, with a reason (5 to 500 characters). The invoice number is kept. Mounted only while open. */
export function CancelDueDialog({
  due,
  write,
  onSubmit,
  onEdit,
  onClose,
}: {
  due: Due;
  write: WriteState;
  onSubmit: (body: CancelDueBody) => void;
  onEdit: () => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string>();
  const server = useServerErrors(write.error);
  return (
    <FormDialog
      title={`Cancel ${due.invoiceNo}`}
      description="The Owners no longer owe it. The row and its invoice number are kept, and the number is never used again. This cannot be undone."
      submitLabel="Cancel this due"
      dismissLabel="Keep the due"
      tone="danger"
      write={write}
      onClose={onClose}
      onSubmit={() => {
        const text = reason.trim();
        if (text.length < MIN) setError(`Say why, in at least ${MIN} characters.`);
        else if (text.length > MAX) setError(`Use at most ${MAX} characters.`);
        else {
          setError(undefined);
          onSubmit({ version: due.version, reason: text });
        }
      }}
    >
      <Textarea
        label="Reason"
        autoFocus
        requiredMark
        hint="Kept in the audit log."
        value={reason}
        onChange={(event) => {
          server.edit('reason');
          onEdit();
          setReason(event.target.value);
        }}
        error={error ?? server.of('reason')}
      />
    </FormDialog>
  );
}
