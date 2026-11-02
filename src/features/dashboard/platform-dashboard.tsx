'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { LoadFailed } from '@/components/shell/load-failed';
import { PageHeader } from '@/components/shell/page-header';
import { InlineAlert } from '@/components/ui/inline-alert';
import { KpiTile } from '@/components/ui/kpi-tile';
import { LinkButton } from '@/components/ui/link-button';
import { Mono } from '@/components/ui/mono';
import { Skeleton } from '@/components/ui/skeleton';
import { DueStatusChip } from '@/features/billing/due-status';
import { useDueList } from '@/features/billing/use-dues';
import { formatMoney, formatMoneyCompact } from '@/lib/format/money';
import { formatSchoolDate, todayIst } from '@/lib/format/date';
import type { PlatformDashboard } from './types';
import { useDashboard } from './use-dashboard';
import { formatCount } from '@/lib/format/count';

const QUEUE_SIZE = 5;

/**
 * Screen 08: what the platform looks like today (PLT-01) and the dues that need chasing. Figures that do not exist
 * yet say "Not available yet" and are never shown as zero; there are no charts, because the API returns no series
 * (DESIGN.md 17).
 */
export function PlatformDashboardView() {
  const dashboard = useDashboard();
  return (
    <>
      <PageHeader
        title="Dashboard"
        meta="The platform today"
        actions={<LinkButton href="/societies/new">Onboard Society</LinkButton>}
      />
      {dashboard.isError ? (
        <LoadFailed
          error={dashboard.error}
          onRetry={() => void dashboard.refetch()}
          list={{ href: '/dashboard', label: 'the dashboard' }}
        />
      ) : (
        <div className="flex flex-col gap-8">
          {dashboard.isPending ? <TilesSkeleton /> : <Tiles figures={dashboard.data} />}
          <OpenDues />
        </div>
      )}
    </>
  );
}

function TilesSkeleton() {
  return (
    <div role="status" aria-label="Loading the figures" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-32 w-full" />
      ))}
    </div>
  );
}

function Tiles({ figures }: { figures: PlatformDashboard }) {
  return (
    <section aria-label="Platform figures" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <KpiTile label="Societies" value={formatCount(figures.societies)} caption="Active" href="/societies" />
      <KpiTile
        label="Institutions"
        value={formatCount(figures.institutions)}
        caption="Active, in active Societies"
        href="/institutions"
      />
      {figures.activeStudents === null ? (
        <KpiTile label="Active students" unavailable caption="Counted once students are added" />
      ) : (
        <KpiTile label="Active students" value={formatCount(figures.activeStudents)} />
      )}
      <KpiTile
        label="Dues outstanding"
        value={formatMoneyCompact(figures.duesOutstandingAmount)}
        exact={formatMoney(figures.duesOutstandingAmount)}
        caption="Raised and not yet paid"
        href="/dues"
      />
      <KpiTile
        label="Collected this month"
        value={formatMoneyCompact(figures.duesCollectedThisMonthAmount)}
        exact={formatMoney(figures.duesCollectedThisMonthAmount)}
        caption={
          <>
            <span aria-hidden="true">{formatMoneyCompact(figures.duesCollectedLastMonthAmount)}</span>
            <span className="sr-only">{formatMoney(figures.duesCollectedLastMonthAmount)}</span> last month
          </>
        }
      />
      {figures.openAiReports === null ? (
        <KpiTile label="Open AI reports" unavailable caption="Available with the AI reports" />
      ) : (
        <KpiTile label="Open AI reports" value={formatCount(figures.openAiReports)} href="/ai-reports" />
      )}
    </section>
  );
}

/** The open dues that fall due first, which is where a Super Admin chases payment (PLT-25). */
function OpenDues() {
  const list = useDueList({ page: 1, limit: QUEUE_SIZE, sort: 'dueDate', q: '', status: 'due' });
  const today = todayIst();
  const total = list.data?.meta.totalItems;

  return (
    <section aria-label="Open dues" className="rounded-lg border border-line bg-surface">
      <header className="flex items-center justify-between gap-3 border-b border-line-subtle px-5 py-4">
        <h2 className="text-h3 font-semibold">
          Open dues
          {total === undefined ? null : (
            <span className="ml-2 text-caption font-normal text-ink-secondary">
              {formatCount(total)} open
            </span>
          )}
        </h2>
        <Link href="/dues" className="text-label font-medium text-primary hover:underline">
          All dues
        </Link>
      </header>
      {list.isPending ? (
        <div role="status" aria-label="Loading the open dues" className="flex flex-col gap-3 p-5">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : list.isError ? (
        <div className="p-5">
          <InlineAlert tone="warning">
            The open dues could not be loaded.{' '}
            <button type="button" className="underline" onClick={() => void list.refetch()}>
              Try again
            </button>
          </InlineAlert>
        </div>
      ) : list.data.items.length === 0 ? (
        <p className="px-5 py-8 text-center text-caption text-ink-secondary">
          No dues are waiting for payment.
        </p>
      ) : (
        <ul className="divide-y divide-line-subtle">
          {list.data.items.map((due) => (
            <li key={due.id}>
              <Link
                href={`/dues?due=${encodeURIComponent(due.id)}` as Route}
                className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-5 py-3 hover:bg-row-hover"
              >
                <span className="min-w-0">
                  <Mono className="block text-caption text-ink-secondary">{due.invoiceNo}</Mono>
                  <span className="block font-medium break-words">{due.institution.name}</span>
                  <span className="text-caption text-ink-secondary tabular">
                    Pay by {due.dueDate ? formatSchoolDate(due.dueDate) : '—'}
                  </span>
                </span>
                <span className="flex flex-col items-end gap-1">
                  <span className="font-medium tabular">{formatMoney(due.totalAmount)}</span>
                  <DueStatusChip due={due} today={today} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
