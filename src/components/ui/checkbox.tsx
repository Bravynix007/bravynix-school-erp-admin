import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { joinIds } from './field';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode;
  hint?: string;
}

/** The 20 px box sits in a row at least 40 px tall so the whole row is the target (DESIGN.md 16). */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, hint, id, className, 'aria-describedby': extraDescription, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={cn('flex min-h-10 items-start gap-3 py-2', className)}>
      <input
        ref={ref}
        id={inputId}
        type="checkbox"
        aria-describedby={joinIds(hint ? `${inputId}-hint` : undefined, extraDescription)}
        className="mt-0.5 size-5 shrink-0 cursor-pointer accent-primary disabled:cursor-not-allowed"
        {...rest}
      />
      <div className="min-w-0">
        <label htmlFor={inputId} className="cursor-pointer text-body text-ink">
          {label}
        </label>
        {hint ? (
          <p id={`${inputId}-hint`} className="text-caption text-ink-tertiary">
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
});
