import { useId } from 'react';
import { cn } from '@/lib/cn';
import { Spinner } from './spinner';
import { StatusChip, type StatusTone } from './status-chip';

export function ProgressBar({
  value,
  max = 100,
  label,
  valueText,
}: {
  value: number;
  max?: number;
  label: string;
  /** Spoken instead of "40 percent", e.g. "2 of 5 stages done". */
  valueText?: string;
}) {
  const percent = max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(max, Math.max(0, value))}
      aria-valuetext={valueText}
      className="h-2 w-full overflow-hidden rounded-full bg-sunken"
    >
      <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
    </div>
  );
}

export type StageState = 'done' | 'active' | 'pending' | 'failed';

export interface Stage {
  key: string;
  label: string;
  state: StageState;
  detail?: string;
}

const chip: Record<StageState, { tone: StatusTone; label: string }> = {
  done: { tone: 'success', label: 'Done' },
  active: { tone: 'info', label: 'Running' },
  pending: { tone: 'neutral', label: 'Waiting' },
  failed: { tone: 'error', label: 'Failed' },
};

/**
 * A long operation seen as stages (set-up, bulk import, a billing run): each
 * stage says its state in words, and the bar summarises how many are done.
 */
export function PipelineCard({ title, stages }: { title: string; stages: Stage[] }) {
  const done = stages.filter((s) => s.state === 'done').length;
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="rounded-lg border border-line bg-surface p-5">
      <div className="flex items-baseline justify-between gap-4">
        <h3 id={titleId} className="text-h3 font-semibold">
          {title}
        </h3>
        <p className="text-caption text-ink-secondary tabular">
          {done} of {stages.length} done
        </p>
      </div>
      <div className="mt-3">
        <ProgressBar
          value={done}
          max={stages.length}
          label={`${title}: ${done} of ${stages.length} stages done`}
        />
      </div>
      <ol className="mt-4 flex flex-col divide-y divide-line-subtle">
        {stages.map((stage) => (
          <li key={stage.key} className="flex items-start justify-between gap-4 py-2.5">
            <div className="min-w-0">
              <p className={cn('text-body', stage.state === 'pending' ? 'text-ink-secondary' : 'text-ink')}>
                {stage.label}
              </p>
              {stage.detail ? <p className="text-caption text-ink-tertiary">{stage.detail}</p> : null}
            </div>
            <StatusChip
              tone={chip[stage.state].tone}
              label={chip[stage.state].label}
              icon={stage.state === 'active' ? <Spinner size={12} /> : undefined}
            />
          </li>
        ))}
      </ol>
    </section>
  );
}
