import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { IconAlertCircle } from '@tabler/icons-react';
import { cn } from '@/lib/cn';

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label: string;
  error?: string;
  hint?: string;
  /** Shows "Required" after the label, not a red star alone (DESIGN.md 12). */
  requiredMark?: boolean;
  prefix?: ReactNode;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, hint, requiredMark, prefix, id, className, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={inputId} className="text-label font-medium text-ink">
        {label}
        {requiredMark ? <span className="ml-1.5 text-caption text-ink-tertiary">Required</span> : null}
      </label>
      <div
        className={cn(
          'flex h-10 items-center gap-2 rounded-md border bg-surface px-3 transition-colors',
          'focus-within:border-focus focus-within:ring-2 focus-within:ring-focus/30',
          error ? 'border-error' : 'border-line hover:border-line-strong',
        )}
      >
        {prefix ? <span className="text-ink-secondary">{prefix}</span> : null}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="h-full w-full bg-transparent text-body text-ink outline-none placeholder:text-ink-tertiary"
          {...rest}
        />
      </div>
      {error ? (
        <p id={`${inputId}-error`} role="alert" className="flex items-center gap-1 text-caption text-error">
          <IconAlertCircle size={14} aria-hidden="true" />
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-caption text-ink-tertiary">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
