import { useId, type ReactNode } from 'react';
import { IconAlertCircle } from '@tabler/icons-react';
import { cn } from '@/lib/cn';

/** Outline of every input box: the field border token reaches 3:1 on white (WCAG 1.4.11). */
export function fieldBox(error?: string): string {
  return cn(
    'rounded-md border bg-surface transition-colors',
    'focus-within:border-focus focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus',
    error ? 'border-error' : 'border-field hover:border-ink-secondary',
  );
}

export interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  /** Shows "Required" after the label, not a red star alone (DESIGN.md 12). */
  requiredMark?: boolean;
  /** Keeps the label for assistive technology only, e.g. a search box beside a table. */
  hideLabel?: boolean;
  id?: string;
  className?: string;
  /** Receives the id to put on the control and the aria-describedby value. */
  children: (control: {
    id: string;
    describedBy: string | undefined;
    invalid: true | undefined;
    required: true | undefined;
  }) => ReactNode;
}

/** Label above, control, then the error (assertive) or the hint (DESIGN.md 12). */
export function Field({ label, error, hint, requiredMark, hideLabel, id, className, children }: FieldProps) {
  const autoId = useId();
  const controlId = id ?? autoId;
  const describedBy = error ? `${controlId}-error` : hint ? `${controlId}-hint` : undefined;
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={controlId} className={cn('text-label font-medium text-ink', hideLabel && 'sr-only')}>
        {label}
        {requiredMark ? <span className="ml-1.5 text-caption text-ink-tertiary">Required</span> : null}
      </label>
      {children({
        id: controlId,
        describedBy,
        invalid: error ? true : undefined,
        required: requiredMark ? true : undefined,
      })}
      {error ? (
        <p id={`${controlId}-error`} role="alert" className="flex items-center gap-1 text-caption text-error">
          <IconAlertCircle size={14} aria-hidden="true" />
          {error}
        </p>
      ) : hint ? (
        <p id={`${controlId}-hint`} className="text-caption text-ink-tertiary">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** The control's own `aria-describedby`, if the caller passed one, joined after the hint or error link. */
export function joinIds(...ids: (string | undefined)[]): string | undefined {
  const joined = ids.filter(Boolean).join(' ');
  return joined || undefined;
}
