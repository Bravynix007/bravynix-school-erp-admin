'use client';

import { useState } from 'react';
import { LoadFailed } from '@/components/shell/load-failed';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { InlineAlert } from '@/components/ui/inline-alert';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusChip, type StatusTone } from '@/components/ui/status-chip';
import { Timeline, type TimelineEntry } from '@/components/ui/timeline';
import { useToast } from '@/components/ui/toast';
import { formatMoney } from '@/lib/format/money';
import { formatSchoolDate } from '@/lib/format/date';
import { useGuardedWrite } from '@/lib/hooks/use-one-at-a-time';
import { rateSpans, type RateSpan, type RateState } from './rate-history';
import { SetRateDialog } from './set-rate-dialog';
import { useRateHistory, useSetRate } from './use-pricing';

const STATE_TONE: Record<RateState, StatusTone> = {
  'In force': 'success',
  Scheduled: 'info',
  Closed: 'neutral',
};

const SET_RATE_OVERRIDES = {
  DUPLICATE: 'A rate already starts on this date. Choose another day.',
  INVALID_STATE: 'This Institution or its Society is deactivated, so it takes no new rate.',
  NOT_FOUND: 'This Institution no longer exists.',
};

function period(span: RateSpan): string {
  const from = formatSchoolDate(span.rate.effectiveFromDate);
  if (span.state === 'Scheduled') return `Starts ${from}`;
  return span.endsOn === null ? `From ${from}` : `${from} to ${formatSchoolDate(span.endsOn)}`;
}

/**
 * The Pricing tab of an Institution (PLT-22, PLT-23; PRD 9.2): the rate in force and the history of every rate. There
 * is one rate per student and no billing cycle. `canChange` is false for a deactivated Institution, which takes none.
 */
export function PricingTab({
  institutionId,
  institutionName,
  canChange,
}: {
  institutionId: string;
  institutionName: string;
  canChange: boolean;
}) {
  const history = useRateHistory(institutionId);
  const setRate = useSetRate(institutionId);
  const toast = useToast();
  const attempt = useGuardedWrite();
  const [setting, setSetting] = useState(false);

  if (history.isPending) {
    return (
      <div role="status" aria-label="Loading the rates" className="flex flex-col gap-4 pt-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }
  if (history.isError) {
    return (
      <div className="pt-4">
        <LoadFailed
          error={history.error}
          onRetry={() => void history.refetch()}
          list={{ href: '/institutions', label: 'Institutions' }}
        />
      </div>
    );
  }

  const spans = rateSpans(history.data);
  const current = spans.find((span) => span.state === 'In force');
  const upcoming = spans.filter((span) => span.state === 'Scheduled');
  const setButton = canChange ? (
    <Button variant={current ? 'secondary' : 'primary'} onClick={() => setSetting(true)}>
      Set new rate
    </Button>
  ) : null;

  const entries: TimelineEntry[] = spans.map((span) => ({
    id: span.rate.id,
    action: (
      <span className="flex flex-wrap items-center gap-2">
        <span className="font-medium tabular">{formatMoney(span.rate.ratePerStudentAmount)}</span>
        <span className="text-ink-secondary">per student</span>
        <StatusChip tone={STATE_TONE[span.state]} label={span.state} />
      </span>
    ),
    detail: (
      <>
        <span className="tabular">{period(span)}</span>
        {span.rate.note ? <span className="block text-ink">{span.rate.note}</span> : null}
      </>
    ),
    actor: span.rate.createdBy,
    at: span.rate.createdAt,
    tone: STATE_TONE[span.state],
  }));

  return (
    <div className="flex flex-col gap-6 pt-4">
      {spans.length === 0 ? (
        <EmptyState
          title="No rate set"
          description={
            canChange
              ? 'Set the rate per student before a due can be raised for this Institution.'
              : 'This Institution, or its Society, is deactivated and has no rate.'
          }
          action={setButton}
        />
      ) : (
        <>
          <section
            aria-label="Rate in force"
            className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-line bg-surface p-6"
          >
            <div>
              <p className="text-caption text-ink-secondary">Rate in force</p>
              {current ? (
                <>
                  <p className="mt-1 text-h1 font-semibold tabular">
                    {formatMoney(current.rate.ratePerStudentAmount)}{' '}
                    <span className="text-body font-normal text-ink-secondary">per student</span>
                  </p>
                  <p className="mt-1 text-caption text-ink-secondary">
                    In force since{' '}
                    <span className="tabular">{formatSchoolDate(current.rate.effectiveFromDate)}</span>
                  </p>
                </>
              ) : (
                <p className="mt-1 text-h3 font-semibold">None yet</p>
              )}
            </div>
            {setButton}
          </section>
          {current === undefined ? (
            <InlineAlert tone="warning">
              No rate is in force. A due cannot be raised for this Institution until the first rate starts on{' '}
              {formatSchoolDate(upcoming.at(-1)!.rate.effectiveFromDate)}.
            </InlineAlert>
          ) : null}
          <InlineAlert tone="info">
            Dues keep the rate in force on their period start date. A new rate applies only to dues for
            periods starting on or after its date; dues already raised are not changed.
          </InlineAlert>
          <section aria-label="Rate history" className="flex flex-col gap-3">
            <h2 className="text-h3 font-semibold">Rate history</h2>
            <Timeline label="Rate history" entries={entries} />
            <p className="text-caption text-ink-tertiary">
              {spans.length} {spans.length === 1 ? 'rate' : 'rates'} on file. Rates are only added, never
              changed.
            </p>
          </section>
        </>
      )}

      {setting ? (
        <SetRateDialog
          institutionName={institutionName}
          write={{ pending: setRate.isPending, error: setRate.error, overrides: SET_RATE_OVERRIDES }}
          onEdit={() => {
            if (setRate.isError) setRate.reset();
          }}
          onClose={() => {
            setRate.reset();
            setSetting(false);
          }}
          onSubmit={(body) =>
            attempt(
              (settled) => setRate.mutate(body, settled),
              () => {
                setSetting(false);
                toast.success('Rate set');
              },
            )
          }
        />
      ) : null}
    </div>
  );
}
