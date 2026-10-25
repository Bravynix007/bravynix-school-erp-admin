import { forwardRef, type SelectHTMLAttributes } from 'react';
import { IconChevronDown } from '@tabler/icons-react';
import { cn } from '@/lib/cn';
import { Field, fieldBox } from './field';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
  /** First, unselectable row such as "Choose a plan". */
  placeholder?: string;
  error?: string;
  hint?: string;
  requiredMark?: boolean;
}

/** A native select: the platform list is keyboard and screen reader complete (DESIGN.md 12). */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, options, placeholder, error, hint, requiredMark, id, className, ...rest },
  ref,
) {
  return (
    <Field label={label} error={error} hint={hint} requiredMark={requiredMark} id={id} className={className}>
      {(control) => (
        <div className={cn('relative flex h-10 items-center', fieldBox(error))}>
          <select
            ref={ref}
            id={control.id}
            aria-invalid={control.invalid}
            aria-describedby={control.describedBy}
            className="h-full w-full cursor-pointer appearance-none rounded-md bg-transparent pr-9 pl-3 text-body text-ink outline-none disabled:cursor-not-allowed disabled:text-disabled"
            {...rest}
          >
            {placeholder ? (
              <option value="" disabled={rest.required}>
                {placeholder}
              </option>
            ) : null}
            {options.map((o) => (
              <option key={o.value} value={o.value} disabled={o.disabled}>
                {o.label}
              </option>
            ))}
          </select>
          <IconChevronDown
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute right-3 text-ink-secondary"
          />
        </div>
      )}
    </Field>
  );
});
