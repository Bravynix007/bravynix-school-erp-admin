'use client';

import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { ModalDialog } from './modal-dialog';

/**
 * A centred dialog: 480 px to confirm, 640 px for a form, 16 px radius. Below
 * the medium breakpoint it becomes a bottom sheet (DESIGN.md 9, 14).
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  size = 'confirm',
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  /** One sentence on the consequence. */
  description?: string;
  size?: 'confirm' | 'form';
  footer?: ReactNode;
  children?: ReactNode;
}) {
  const titleId = useId();
  const descriptionId = useId();
  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className={cn(
        'w-full rounded-xl bg-surface shadow-lg',
        size === 'confirm' ? 'md:max-w-[480px]' : 'md:max-w-[640px]',
        'max-md:fixed max-md:inset-x-0 max-md:top-auto max-md:bottom-0 max-md:max-w-none max-md:rounded-b-none',
        'md:m-auto',
      )}
    >
      <div className="flex max-h-[calc(100dvh-4rem)] flex-col">
        <div className="overflow-y-auto p-6 pb-4">
          <h2 id={titleId} className="text-h2 font-semibold">
            {title}
          </h2>
          {description ? (
            <p id={descriptionId} className="mt-2 text-body text-ink-secondary">
              {description}
            </p>
          ) : null}
          {children ? <div className="mt-4">{children}</div> : null}
        </div>
        {footer ? <div className="flex flex-wrap justify-end gap-2 p-6 pt-2">{footer}</div> : null}
      </div>
    </ModalDialog>
  );
}
