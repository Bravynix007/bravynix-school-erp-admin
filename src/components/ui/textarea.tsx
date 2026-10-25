import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Field, fieldBox, joinIds } from './field';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
  requiredMark?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  {
    label,
    error,
    hint,
    requiredMark,
    id,
    className,
    rows = 4,
    'aria-describedby': extraDescription,
    ...rest
  },
  ref,
) {
  return (
    <Field label={label} error={error} hint={hint} requiredMark={requiredMark} id={id} className={className}>
      {(control) => (
        <div className={cn('flex', fieldBox(error))}>
          <textarea
            ref={ref}
            id={control.id}
            rows={rows}
            aria-invalid={control.invalid}
            aria-required={control.required}
            aria-describedby={joinIds(control.describedBy, extraDescription)}
            className="min-h-20 w-full resize-y rounded-md bg-transparent px-3 py-2 text-body text-ink outline-none placeholder:text-ink-tertiary"
            {...rest}
          />
        </div>
      )}
    </Field>
  );
});
