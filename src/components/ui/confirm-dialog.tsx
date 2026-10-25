'use client';

import type { ReactNode } from 'react';
import { Button } from './button';
import { Dialog } from './dialog';

/**
 * "Are you sure": title, one consequence sentence, then Cancel and the action
 * on the right. Danger is allowed only here (DESIGN.md 12). Focus starts on
 * Cancel for a danger action so Enter cannot do harm by accident.
 */
export function ConfirmDialog({
  open,
  title,
  consequence,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'primary',
  loading,
  onConfirm,
  onCancel,
  children,
}: {
  open: boolean;
  title: string;
  consequence: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'primary' | 'danger';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** An error banner or a field, shown under the sentence. */
  children?: ReactNode;
}) {
  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!loading) onCancel();
      }}
      title={title}
      description={consequence}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={loading} autoFocus={tone === 'danger'}>
            {cancelLabel}
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Dialog>
  );
}
