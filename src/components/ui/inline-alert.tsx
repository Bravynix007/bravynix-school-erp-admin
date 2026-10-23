import type { ReactNode } from 'react';
import { IconAlertTriangle, IconCircleCheck, IconInfoCircle, IconX } from '@tabler/icons-react';
import { cn } from '@/lib/cn';
import type { StatusTone } from './status-chip';

const styles: Record<Exclude<StatusTone, 'neutral'>, { box: string; icon: ReactNode }> = {
  success: { box: 'bg-success-bg text-success', icon: <IconCircleCheck size={18} aria-hidden="true" /> },
  warning: { box: 'bg-warning-bg text-warning', icon: <IconAlertTriangle size={18} aria-hidden="true" /> },
  error: { box: 'bg-error-bg text-error', icon: <IconX size={18} aria-hidden="true" /> },
  info: { box: 'bg-info-bg text-info', icon: <IconInfoCircle size={18} aria-hidden="true" /> },
};

/** A full-width band: icon, one sentence, optional action (DESIGN.md 9). */
export function InlineAlert({
  tone,
  children,
  action,
}: {
  tone: Exclude<StatusTone, 'neutral'>;
  children: ReactNode;
  action?: ReactNode;
}) {
  const style = styles[tone];
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('flex items-center gap-3 rounded-md px-4 py-3 text-body', style.box)}
    >
      {style.icon}
      <div className="flex-1 text-ink">{children}</div>
      {action}
    </div>
  );
}
