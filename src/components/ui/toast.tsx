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

/** Success toasts leave after 5 s (DESIGN.md 9). Errors stay until dismissed, so they cannot be missed. */
export const TOAST_MS = 5000;
const MAX_VISIBLE = 3;

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast needs a ToastProvider above it');
  return api;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const next = useRef(1);

  const dismiss = useCallback((id: number) => setItems((all) => all.filter((t) => t.id !== id)), []);
  const push = useCallback((kind: ToastItem['kind'], message: string, options?: ToastOptions) => {
    const item: ToastItem = { id: next.current++, kind, message, action: options?.action };
    setItems((all) => [...all, item].slice(-MAX_VISIBLE));
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (message, options) => push('success', message, options),
      error: (message, options) => push('error', message, options),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Both regions stay mounted so a screen reader has them registered before the first toast arrives. */}
      <div className="pointer-events-none fixed bottom-4 left-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
        <div role="status" aria-live="polite" className="flex flex-col gap-2">
          {items
            .filter((t) => t.kind === 'success')
            .map((t) => (
              <ToastCard key={t.id} item={t} onDismiss={dismiss} />
            ))}
        </div>
        <div role="alert" className="flex flex-col gap-2">
          {items
            .filter((t) => t.kind === 'error')
            .map((t) => (
              <ToastCard key={t.id} item={t} onDismiss={dismiss} />
            ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  const [paused, setPaused] = useState(false);

  // The clock stops while the pointer or keyboard focus is on the toast (WCAG 2.2.1), and restarts after.
  useEffect(() => {
    if (item.kind === 'error' || paused) return;
    const timer = setTimeout(() => onDismiss(item.id), TOAST_MS);
    return () => clearTimeout(timer);
  }, [item.id, item.kind, paused, onDismiss]);

  const action = item.action;
  const actionClass = 'rounded-sm font-medium underline underline-offset-2';
  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="pointer-events-auto flex items-start gap-3 rounded-md bg-frame px-4 py-3 text-body text-on-primary shadow-md"
    >
      <p className="min-w-0 flex-1 break-words">{item.message}</p>
      {action?.href ? (
        <Link href={action.href} className={actionClass} onClick={action.onClick}>
          {action.label}
        </Link>
      ) : action ? (
        <button type="button" className={actionClass} onClick={action.onClick}>
          {action.label}
        </button>
      ) : null}
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => onDismiss(item.id)}
        className="-mr-1 inline-flex size-6 shrink-0 items-center justify-center rounded-sm text-on-frame hover:text-on-primary"
      >
        <IconX size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
