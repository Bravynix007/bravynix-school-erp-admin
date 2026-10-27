import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type StatusTone = 'success' | 'warning' | 'error' | 'info' | 'neutral';

const tones: Record<StatusTone, string> = {
  success: 'bg-success-bg text-success',
  warning: 'bg-warning-bg text-warning',
  error: 'bg-error-bg text-error',
  info: 'bg-info-bg text-info',
  neutral: 'bg-neutral-bg text-neutral',
};

/**
 * State is a word plus a colour plus a shape (DESIGN.md 3): never colour
 * alone. Pass an icon to replace the dot, e.g. a lock for a blocked section.
 */
export function StatusChip({
  tone,
  label,
  icon,
  className,
}: {
  tone: StatusTone;
  label: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-label font-medium',
        tones[tone],
        className,
      )}
    >
      {icon ?? <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />}
      {label}
    </span>
  );
}

/** The fixed mapping from DESIGN.md 5, so the same state looks the same everywhere. */
export const statusTone = {
  tenant: { Active: 'success', Inactive: 'neutral' },
  account: { Pending: 'info', Active: 'success', Blocked: 'error' },
  due: { Due: 'warning', Paid: 'success', Cancelled: 'neutral' },
  aiReport: { New: 'info', 'In review': 'warning', Resolved: 'success' },
  operation: { Queued: 'info', Running: 'info', Completed: 'success', Failed: 'error' },
} as const satisfies Record<string, Record<string, StatusTone>>;
