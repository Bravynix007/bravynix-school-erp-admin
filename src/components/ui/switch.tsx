'use client';

import { cn } from '@/lib/cn';

/** An on/off setting that takes effect at once: a switch, not a checkbox. */
export function Switch({
  checked,
  onChange,
  label,
  hideLabel,
  labelClassName,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  /** Keep the label for assistive technology and a tooltip only. */
  hideLabel?: boolean;
  /** Classes for the visible label, e.g. `max-md:sr-only` to keep only the switch on a narrow screen. */
  labelClassName?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={hideLabel ? label : undefined}
      title={hideLabel ? label : undefined}
      onClick={() => onChange(!checked)}
      className="inline-flex min-h-9 items-center gap-2 rounded-md text-label text-ink"
    >
      <span
        aria-hidden="true"
        className={cn(
          'relative inline-block h-5 w-9 shrink-0 rounded-full border transition-colors',
          checked ? 'border-primary bg-primary' : 'border-field bg-surface',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 size-3.5 rounded-full transition-all',
            checked ? 'left-[1.1rem] bg-on-primary' : 'left-0.5 bg-ink-secondary',
          )}
        />
      </span>
      {hideLabel ? null : <span className={labelClassName}>{label}</span>}
    </button>
  );
}
