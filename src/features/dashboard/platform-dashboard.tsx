'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { LoadFailed } from '@/components/shell/load-failed';
import { PageHeader } from '@/components/shell/page-header';
import { KpiTile } from '@/components/ui/kpi-tile';
import { LinkButton } from '@/components/ui/link-button';
import { BlockedAccessQueue } from '@/features/blocks/blocked-access-queue';
import { Mono } from '@/components/ui/mono';
import { QUEUE_SIZE, QueueCard } from '@/components/ui/queue-card';
import { Skeleton } from '@/components/ui/skeleton';
import { DueStatusChip } from '@/features/billing/due-status';
import { useDueList } from '@/features/billing/use-dues';
import { formatMoney, formatMoneyCompact } from '@/lib/format/money';
import { formatSchoolDate, todayIst } from '@/lib/format/date';
import type { PlatformDashboard } from './types';
import { useDashboard } from './use-dashboard';
import { formatCount } from '@/lib/format/count';

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
          <BlockedAccessQueue />
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

  return (
    <QueueCard
      title="Open dues"
      countLabel="open"
      aside={() => (
        <Link href="/dues" className="text-label font-medium text-primary hover:underline">
          All dues
        </Link>
      )}
      query={list}
      loadingLabel="Loading the open dues"
      loadingRows={3}
      failed="The open dues could not be loaded."
      empty="No dues are waiting for payment."
      renderRow={(due) => (
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
      )}
    />
  );
}
