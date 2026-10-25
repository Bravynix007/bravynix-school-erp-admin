'use client';

import { IconX } from '@tabler/icons-react';
import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { ModalDialog } from './modal-dialog';

/**
 * Detail beside the list: 560 px from the right (480 px on a tablet, a full
 * page on a phone). Header with title, status and close; a scrolling body; a
 * sticky footer for actions (DESIGN.md 8, 9). The caller keeps its URL in step
 * with `open` so a refresh keeps the sheet open.
 */
export function SideSheet({
  open,
  onClose,
  title,
  status,
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  status?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const titleId = useId();
  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      dismissOnBackdrop
      aria-labelledby={titleId}
      className={cn(
        'fixed top-0 right-0 bottom-0 left-auto h-dvh w-[560px] border border-transparent bg-surface shadow-[-24px_0_48px_rgba(22,34,44,0.16)]',
        'max-xl:w-[480px] max-md:inset-x-0 max-md:w-auto',
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="flex items-start gap-3 border-b border-line-subtle px-6 py-4 max-md:px-4">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
            <h2 id={titleId} className="text-h2 font-semibold break-words">
              {title}
            </h2>
            {status}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            title="Close"
            className="-mr-2 inline-flex size-9 shrink-0 items-center justify-center rounded-md text-ink-secondary hover:bg-sunken hover:text-ink"
          >
            <IconX size={20} aria-hidden="true" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 max-md:px-4">{children}</div>
        {footer ? (
          <footer className="flex flex-wrap justify-end gap-2 border-t border-line-subtle bg-surface px-6 py-4 max-md:px-4">
            {footer}
          </footer>
        ) : null}
      </div>
    </ModalDialog>
  );
}
