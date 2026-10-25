import { IconCheck } from '@tabler/icons-react';
import { cn } from '@/lib/cn';

export interface Step {
  key: string;
  label: string;
}

/**
 * Wizard steps: numbered, completed ones show a check and can be clicked to
 * go back (DESIGN.md 9). Labels wrap instead of truncating; below the small
 * breakpoint the steps stack in one column.
 */
export function Stepper({
  steps,
  current,
  onStepClick,
  label,
}: {
  steps: Step[];
  /** Index of the step being filled in. */
  current: number;
  onStepClick?: (index: number) => void;
  label: string;
}) {
  return (
    <ol aria-label={label} className="flex flex-col gap-3 sm:flex-row sm:gap-6">
      {steps.map((step, index) => {
        const done = index < current;
        const active = index === current;
        const marker = (
          <span
            aria-hidden="true"
            className={cn(
              'inline-flex size-7 shrink-0 items-center justify-center rounded-full border text-label font-medium tabular',
              done && 'border-primary bg-primary text-on-primary',
              active && 'border-primary bg-primary-tint text-primary',
              !done && !active && 'border-field text-ink-secondary',
            )}
          >
            {done ? <IconCheck size={16} /> : index + 1}
          </span>
        );
        const text = (
          <span className={cn('text-label', active ? 'font-semibold text-ink' : 'text-ink-secondary')}>
            {step.label}
          </span>
        );
        return (
          <li
            key={step.key}
            aria-current={active ? 'step' : undefined}
            className="flex min-w-0 flex-1 items-start"
          >
            {done && onStepClick ? (
              <button
                type="button"
                onClick={() => onStepClick(index)}
                className="flex items-start gap-2.5 rounded-md text-left hover:underline"
              >
                {marker}
                <span className="pt-1">
                  <span className="sr-only">Step {index + 1}, done: </span>
                  {text}
                </span>
              </button>
            ) : (
              <span className="flex items-start gap-2.5">
                {marker}
                <span className="pt-1">
                  <span className="sr-only">
                    Step {index + 1}
                    {done ? ', done' : active ? ', current' : ''}:{' '}
                  </span>
                  {text}
                </span>
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
