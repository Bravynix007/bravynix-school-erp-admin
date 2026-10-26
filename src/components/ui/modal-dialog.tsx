'use client';

import {
  useEffect,
  useLayoutEffect,
  useRef,
  type DialogHTMLAttributes,
  type ReactNode,
  type SyntheticEvent,
} from 'react';
import { IconWifiOff } from '@tabler/icons-react';
import { cn } from '@/lib/cn';
import { useOnline } from './offline-band';

/**
 * The page's offline band sits behind the modal, inert and unannounced, so each open dialog carries its own line.
 * The live region is mounted with the dialog and filled when the network goes, so it is announced.
 */
function OfflineNote() {
  const online = useOnline();
  return (
    <div role="status">
      {online ? null : (
        <div className="flex items-center gap-2 bg-warning-bg px-6 py-2 text-label text-ink max-md:px-4">
          <IconWifiOff size={16} aria-hidden="true" className="shrink-0 text-warning" />
          You&apos;re offline. Changes can&apos;t be saved.
        </div>
      )}
    </div>
  );
}

export interface ModalDialogProps extends Omit<DialogHTMLAttributes<HTMLDialogElement>, 'open' | 'onClose'> {
  open: boolean;
  onClose: () => void;
  /** Clicking the dimmed area closes it. Off for dialogs that ask a question. */
  dismissOnBackdrop?: boolean;
  children: ReactNode;
}

/**
 * The native modal `<dialog>`: the browser traps focus, makes the page behind
 * inert, closes on Esc and returns focus to the control that opened it
 * (DESIGN.md 15). This wrapper only keeps it in step with `open` and locks
 * the page scroll while it is up.
 */
export function ModalDialog({
  open,
  onClose,
  dismissOnBackdrop = false,
  className,
  children,
  ...rest
}: ModalDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const openRef = useRef(open);
  const pointerDownOnBackdrop = useRef(false);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  // Where focus goes back to. A dialog its owner mounts only while open is removed with `open` still set, and the
  // browser returns focus only from `close()`, so this closes it first (DESIGN.md 15).
  const trigger = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (!open) return;
    trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = ref.current;
    return () => {
      openRef.current = false;
      if (dialog?.open) dialog.close();
      if (trigger.current?.isConnected) trigger.current.focus();
    };
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Esc asks to close; the owner decides (a busy dialog can refuse), so the browser's own close is cancelled.
  function onCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault();
    onClose();
  }

  // The browser closed it on its own (a repeated Esc under close-watcher rules): tell the owner, and if the
  // owner keeps it open, show it again so the page and the state stay in step.
  function onNativeClose() {
    if (!openRef.current) return;
    onClose();
    setTimeout(() => {
      const dialog = ref.current;
      if (openRef.current && dialog && !dialog.open) dialog.showModal();
    }, 0);
  }

  function onPointerDown(event: SyntheticEvent<HTMLDialogElement>) {
    pointerDownOnBackdrop.current = event.target === event.currentTarget;
  }

  function onBackdrop(event: SyntheticEvent<HTMLDialogElement, MouseEvent>) {
    // A click on the dialog element itself (not on its content) is a click on the backdrop. Both the press and
    // the release must be there: a text drag that starts in the sheet and ends outside it is not a dismissal.
    const started = pointerDownOnBackdrop.current;
    pointerDownOnBackdrop.current = false;
    if (dismissOnBackdrop && started && event.target === event.currentTarget) onClose();
  }

  return (
    <dialog
      ref={ref}
      onCancel={onCancel}
      onClose={onNativeClose}
      onPointerDown={onPointerDown}
      onClick={onBackdrop}
      className={cn(
        'backdrop:bg-overlay m-0 max-h-none max-w-none p-0 text-ink open:flex open:flex-col',
        className,
      )}
      {...rest}
    >
      {open ? (
        <>
          <OfflineNote />
          {children}
        </>
      ) : null}
    </dialog>
  );
}
