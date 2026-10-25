import type { Actor } from '@/lib/api/envelope';
import { formatInstant } from '@/lib/format/date';
import { cn } from '@/lib/cn';
import type { StatusTone } from './status-chip';

export interface TimelineEntry {
  id: string;
  action: string;
  actor: Actor | null;
  at: string;
  tone?: StatusTone;
}

const dots: Record<StatusTone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
  info: 'bg-info',
  neutral: 'bg-neutral',
};

/** Vertical history: action, actor, time. Newest first as the API returns it (DESIGN.md 9). */
export function Timeline({ entries, label }: { entries: TimelineEntry[]; label: string }) {
  return (
    <ol aria-label={label} className="relative flex flex-col gap-5">
      {entries.map((entry, index) => (
        <li key={entry.id} className="relative flex gap-4">
          <span aria-hidden="true" className="relative flex w-2 shrink-0 justify-center pt-2">
            <span className={cn('relative z-10 size-2 rounded-full', dots[entry.tone ?? 'neutral'])} />
            {index < entries.length - 1 ? (
              <span className="absolute top-4 -bottom-7 w-px bg-line-strong" />
            ) : null}
          </span>
          <div className="min-w-0">
            <p className="text-body text-ink">{entry.action}</p>
            <p className="text-caption text-ink-tertiary">
              {entry.actor?.id ? entry.actor.displayName : 'System'} ·{' '}
              <span className="tabular">{formatInstant(entry.at)}</span>
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
