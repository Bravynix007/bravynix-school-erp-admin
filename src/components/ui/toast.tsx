'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { IconX } from '@tabler/icons-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export interface ToastAction {
  label: string;
  /** A link to the result ("View") or a callback ("Undo"). */
  href?: Route;
  onClick?: () => void;
}

export interface ToastOptions {
  action?: ToastAction;
}

interface ToastItem {
  id: number;
  kind: 'success' | 'error';
  message: string;
  action?: ToastAction;
}

interface ToastApi {
  success: (message: string, options?: ToastOptions) => void;
  error: (message: string, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

function isPersistent(item: ToastItem): boolean {
  return item.kind === 'error' || (!!item.action?.onClick && !item.action.href);
}

/**
 * "View" toasts leave after 5 s (DESIGN.md 9). Errors and toasts whose action exists only there (Undo) stay until
 * dismissed: a keyboard or switch user may not reach them in time (WCAG 2.2.1).
 */
export const TOAST_MS = 5000;
const MAX_VISIBLE = 3;
/** Errors never expire, so beyond this many the older ones fold into a "Show N more" button instead of filling a small or zoomed screen. */
const ERRORS_SHOWN = 2;

/**
 * While a dialog or sheet is open the page behind it is inert, so a toast raised then is neither read out nor
 * clickable. Show errors inside the dialog with an ErrorBanner, and push a success toast after closing it.
 */
export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast needs a ToastProvider above it');
  return api;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const [showAllErrors, setShowAllErrors] = useState(false);
  const next = useRef(1);
  const viewport = useRef<HTMLDivElement>(null);

  // The stack sits over the page's bottom edge. Tell the browser, so a focused control is scrolled clear of it
  // instead of under it (WCAG 2.4.11).
  useEffect(() => {
    const element = viewport.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const root = document.documentElement;
    const observer = new ResizeObserver(() => {
      const height = element.getBoundingClientRect().height;
      // The empty regions and their gap measure a few pixels: that is no stack.
      root.style.scrollPaddingBottom = height > 16 ? `${Math.ceil(height) + 32}px` : '';
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      root.style.scrollPaddingBottom = '';
    };
  }, []);

  const dismiss = useCallback((id: number) => setItems((all) => all.filter((t) => t.id !== id)), []);
  const push = useCallback((kind: ToastItem['kind'], message: string, options?: ToastOptions) => {
    if (process.env.NODE_ENV !== 'production' && document.querySelector('dialog[open]')) {
      console.warn(
        `Toast "${message}" was raised while a dialog is open; it will be inert. Use an ErrorBanner inside the dialog, or close it first.`,
      );
    }
    const item: ToastItem = { id: next.current++, kind, message, action: options?.action };
    setItems((all) => {
      const next = [...all, item];
      // Over the cap, the oldest toast that can be lost goes: never an error, never an Undo.
      while (next.length > MAX_VISIBLE) {
        const index = next.findIndex((t) => !isPersistent(t));
        if (index === -1) break;
        next.splice(index, 1);
      }
      return next;
    });
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (message, options) => push('success', message, options),
      error: (message, options) => push('error', message, options),
    }),
    [push],
  );

  const errors = items.filter((t) => t.kind === 'error');
  // Once the errors are back to what fits, the next pile starts folded again.
  if (showAllErrors && errors.length <= ERRORS_SHOWN) setShowAllErrors(false);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Both regions stay mounted so a screen reader has them registered before the first toast arrives. */}
      <div
        ref={viewport}
        className="pointer-events-none fixed bottom-4 left-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
      >
        <div role="status" aria-live="polite" className="flex flex-col gap-2">
          {items
            .filter((t) => t.kind === 'success')
            .map((t) => (
              <ToastCard key={t.id} item={t} onDismiss={dismiss} />
            ))}
        </div>
        <div role="alert" className="flex flex-col gap-2">
          {errors.slice(showAllErrors ? 0 : -ERRORS_SHOWN).map((t) => (
            <ToastCard key={t.id} item={t} onDismiss={dismiss} />
          ))}
        </div>
        {errors.length > ERRORS_SHOWN ? (
          <button
            type="button"
            aria-expanded={showAllErrors}
            onClick={() => setShowAllErrors((all) => !all)}
            className="on-frame pointer-events-auto self-start rounded-md bg-frame px-3 py-1.5 text-label font-medium text-on-primary shadow-md"
          >
            {showAllErrors
              ? 'Show fewer errors'
              : `Show ${errors.length - ERRORS_SHOWN} more ${errors.length - ERRORS_SHOWN === 1 ? 'error' : 'errors'}`}
          </button>
        ) : null}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  const root = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  // Where focus was before it entered the toast, so it can go back there when the toast leaves.
  const returnTo = useRef<HTMLElement | null>(null);
  const persistent = isPersistent(item);
  const paused = hovered || focused;

  function leave() {
    // A toast that holds focus must not take it to the page's start when it goes (WCAG 2.4.3).
    if (root.current?.contains(document.activeElement)) {
      const back = returnTo.current?.isConnected ? returnTo.current : document.getElementById('content');
      back?.focus();
    }
    onDismiss(item.id);
  }

  // The clock stops while the pointer or keyboard focus is on the toast (WCAG 2.2.1) and restarts after both leave.
  useEffect(() => {
    if (persistent || paused) return;
    const timer = setTimeout(leave, TOAST_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id, persistent, paused]);

  const action = item.action;
  const actionClass = 'rounded-sm font-medium underline underline-offset-2';
  return (
    <div
      ref={root}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={(event) => {
        if (!focused) returnTo.current = event.relatedTarget as HTMLElement | null;
        setFocused(true);
      }}
      onBlur={(event) => {
        if (!root.current?.contains(event.relatedTarget as Node | null)) setFocused(false);
      }}
      className="on-frame pointer-events-auto flex items-start gap-3 rounded-md bg-frame px-4 py-3 text-body text-on-primary shadow-md"
    >
      <p className="min-w-0 flex-1 break-words">{item.message}</p>
      {action?.href ? (
        <Link href={action.href} className={actionClass} onClick={action.onClick}>
          {action.label}
        </Link>
      ) : action ? (
        <button
          type="button"
          className={actionClass}
          onClick={() => {
            action.onClick?.();
            leave();
          }}
        >
          {action.label}
        </button>
      ) : null}
      <button
        type="button"
        aria-label="Dismiss"
        onClick={leave}
        className="-mr-1 inline-flex size-6 shrink-0 items-center justify-center rounded-sm text-on-frame hover:text-on-primary"
      >
        <IconX size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
