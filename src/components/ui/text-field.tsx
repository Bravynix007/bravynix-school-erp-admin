import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Field, fieldBox } from './field';

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label: string;
  error?: string;
  hint?: string;
  /** Shows "Required" after the label, not a red star alone (DESIGN.md 12). */
  requiredMark?: boolean;
  hideLabel?: boolean;
  prefix?: ReactNode;
  /** Extra classes for the input element itself, e.g. `text-right tabular`. */
  inputClassName?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, hint, requiredMark, hideLabel, prefix, id, className, inputClassName, ...rest },
  ref,
) {
  return (
    <Field
      label={label}
      error={error}
      hint={hint}
      requiredMark={requiredMark}
      hideLabel={hideLabel}
      id={id}
      className={className}
    >
      {(control) => (
        <div className={cn('flex h-10 items-center gap-2 px-3', fieldBox(error))}>
          {prefix ? <span className="text-ink-secondary">{prefix}</span> : null}
          <input
            ref={ref}
            id={control.id}
            aria-invalid={control.invalid}
            aria-describedby={control.describedBy}
            className={cn(
              'h-full w-full bg-transparent text-body text-ink outline-none placeholder:text-ink-tertiary',
              inputClassName,
            )}
            {...rest}
          />
        </div>
      )}
    </Field>
  );
});
