'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { WriteError } from './write-error';

const MAX_REASON = 500;

/**
 * "Pause access for X?": the consequence, a required reason (1 to 500
 * characters, API design 10.4b) and the one primary action (STITCH_PROMPT 2).
 * The reason is cleared each time it opens, so a refused pause never carries
 * its text into the next one.
 */
export function PauseDialog({
  open,
  title,
  consequence,
  pending,
  error,
  onSubmit,
  onClose,
  onReload,
}: {
  open: boolean;
  title: string;
  consequence: string;
  pending: boolean;
  error: unknown;
  onSubmit: (reason: string) => void;
  onClose: () => void;
  onReload: () => void;
}) {
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const trimmed = reason.trim();
  const problem = !touched
    ? undefined
    : trimmed === ''
      ? 'Give the reason for the pause.'
      : trimmed.length > MAX_REASON
        ? `Use at most ${MAX_REASON} characters.`
        : undefined;

  function close() {
    setReason('');
    setTouched(false);
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!pending) close();
      }}
      title={title}
      description={consequence}
      size="form"
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={pending}>
            Cancel
          </Button>
          <Button
            loading={pending}
            onClick={() => {
              setTouched(true);
              if (trimmed !== '' && trimmed.length <= MAX_REASON) onSubmit(trimmed);
            }}
          >
            Pause access
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <WriteError error={error} onReload={onReload} /> : null}
        <Textarea
          label="Reason"
          requiredMark
          value={reason}
          error={problem}
          hint="Shown in the audit log with who paused it."
          onChange={(event) => setReason(event.target.value)}
          onBlur={() => setTouched(true)}
        />
      </div>
    </Dialog>
  );
}
