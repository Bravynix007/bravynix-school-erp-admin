'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { LoadFailed } from '@/components/shell/load-failed';
import { PageHeader } from '@/components/shell/page-header';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { FilterBar } from '@/components/ui/filter-bar';
import { InlineAlert } from '@/components/ui/inline-alert';
import { KpiTile } from '@/components/ui/kpi-tile';
import { Mono } from '@/components/ui/mono';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useDashboard } from '@/features/dashboard/use-dashboard';
import { institutionWorkspaceHref } from '@/features/institutions/institution-workspace';
import { societyWorkspaceHref } from '@/features/societies/societies-list';
import { formatMoney, formatMoneyCompact } from '@/lib/format/money';
import { formatSchoolDate, todayIst } from '@/lib/format/date';
import { useGuardedWrite } from '@/lib/hooks/use-one-at-a-time';
import { useListControls } from '@/lib/hooks/use-list-controls';
import { useUrlState } from '@/lib/hooks/use-url-state';
import { RAISE_ERROR_COPY } from './dues-copy';
import { DueSheet } from './due-sheet';
import { DueStatusChip } from './due-status';
import { RaiseDueDialog } from './raise-due-dialog';
import type { Due, DueLine } from './types';
import { useDueList, useRaiseDue } from './use-dues';

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: 'due', label: 'Due' },
  { value: 'paid', label: 'Paid' },
  { value: 'cancelled', label: 'Cancelled' },
];

/** What the ledger is limited to when it sits inside one Institution's workspace. */
export interface LedgerScope {
  institution: { id: string; name: string; societyName: string };
  /** False for a deactivated Institution or Society, which takes no new due. */
  canRaise: boolean;
}

/**
 * PLT-25: every due, newest first, with the totals above it (PLT-01), the due beside it (PLT-27) and the raise
 * form (PLT-24, PLT-26). With a `scope` it is one Institution's dues, inside its workspace. The open due is in the
 * URL, so a refresh keeps it open (DESIGN.md 13).
 */
export function DuesLedger({ scope }: { scope?: LedgerScope }) {
  const toast = useToast();
  const controls = useListControls('-createdAt');
  const [status, setStatus] = useUrlState('status', '', (value) =>
    STATUS_OPTIONS.some((option) => option.value === value),
  );
  const [dueId, setDueId] = useUrlState('due', '');
  const [raising, setRaising] = useState(false);
  const raise = useRaiseDue();
  const attempt = useGuardedWrite();
  const region = useRef<HTMLDivElement>(null);
  const today = todayIst();

  const query = {
    page: controls.page,
    limit: PAGE_SIZE,
    sort: controls.sortParam,
    q: controls.q,
    status,
    institutionId: scope?.institution.id,
  };
  const list = useDueList(query);

  const columns: Column<DueLine>[] = [
    {
      key: 'invoiceNo',
      header: 'Invoice',
      sortable: true,
      primary: true,
      cell: (row) => <Mono>{row.invoiceNo}</Mono>,
    },
    ...(scope
      ? []
      : [
          {
            key: 'institution',
            header: 'Institution',
            cell: (row: DueLine) => (
              <>
                <Link
                  href={institutionWorkspaceHref(row.institution.id)}
                  className="flex min-h-6 items-center font-medium text-primary hover:underline"
                >
                  {row.institution.name}
                </Link>
                <Link
                  href={societyWorkspaceHref(row.societyId)}
                  className="flex min-h-6 items-center text-caption text-ink-secondary hover:underline"
                >
                  {row.societyName}
                </Link>
              </>
            ),
          },
        ]),
    {
      key: 'periodStartDate',
      header: 'Period',
      sortable: true,
      cell: (row) => (
        <span className="tabular">
          {formatSchoolDate(row.periodStartDate)} to {formatSchoolDate(row.periodEndDate)}
        </span>
      ),
    },
    {
      key: 'dueDate',
      header: 'Pay by',
      sortable: true,
      cell: (row) => <span className="tabular">{row.dueDate ? formatSchoolDate(row.dueDate) : '—'}</span>,
    },
    {
      key: 'totalAmount',
      header: 'Total',
      sortable: true,
      align: 'end',
      cell: (row) => <span className="tabular">{formatMoney(row.totalAmount)}</span>,
    },
    { key: 'status', header: 'Status', cell: (row) => <DueStatusChip due={row} today={today} /> },
  ];

  const total = list.data?.meta.totalItems;
  const noun = total === 1 ? 'due' : 'dues';
  const filtered = controls.q !== '' || status !== '';
  const raiseButton =
    scope && !scope.canRaise ? null : <Button onClick={() => setRaising(true)}>Raise a due</Button>;

  return (
    <>
      {scope ? (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
          <p className="text-caption text-ink-secondary">
            {total === undefined ? '' : `${total} ${noun} for ${scope.institution.name}`}
          </p>
          {raiseButton}
        </div>
      ) : (
        <>
          <PageHeader
            title="Dues and pricing"
            meta={
              <>
                {total === undefined ? '' : `${total} ${noun}. `}
                Rates are set in the Pricing tab of each{' '}
                <Link href="/institutions" className="text-primary underline">
                  Institution
                </Link>
                .
              </>
            }
            actions={raiseButton}
          />
          <Totals />
        </>
      )}
      <div
        ref={region}
        role="group"
        aria-label="Dues"
        tabIndex={-1}
        className={scope ? 'flex flex-col gap-4 pt-4' : 'mt-6 flex flex-col gap-4'}
      >
        <FilterBar
          searchLabel="Search dues"
          searchPlaceholder="Search by invoice number"
          search={controls.search}
          onSearchChange={controls.setSearch}
          filters={[
            {
              key: 'status',
              label: 'Status',
              options: STATUS_OPTIONS,
              value: status,
              onChange: (value) => {
                setStatus(value);
                controls.resetPage();
              },
            },
          ]}
          countLabel={total === undefined ? '' : `${total} ${noun}`}
        />
        {list.isError ? (
          <LoadFailed
            error={list.error}
            onRetry={() => void list.refetch()}
            list={{ href: '/dashboard', label: 'the dashboard' }}
          />
        ) : (
          <DataTable
            caption="Dues"
            columns={columns}
            rows={list.data?.items ?? []}
            getRowId={(row) => row.id}
            loading={list.isPending}
            refreshing={list.isPlaceholderData}
            sort={controls.sort}
            onSort={controls.toggleSort}
            selectedId={dueId || undefined}
            onRowOpen={(row) => setDueId(row.id)}
            empty={
              filtered ? (
                <EmptyState
                  title="No dues match"
                  description="Clear the search and filters to see all of them."
                />
              ) : (
                <EmptyState
                  title="No dues yet"
                  description={
                    scope
                      ? 'Raise a due for this Institution when its period is over.'
                      : 'Raise a due for an Institution to start the ledger.'
                  }
                  action={raiseButton ?? undefined}
                />
              )
            }
            footer={
              list.data ? (
                <Pagination
                  page={controls.page}
                  pageSize={PAGE_SIZE}
                  total={list.data.meta.totalItems}
                  onPageChange={controls.setPage}
                  noun="dues"
                />
              ) : undefined
            }
          />
        )}
      </div>

      {dueId ? <DueSheet id={dueId} onClose={() => setDueId('')} /> : null}
      {raising ? (
        <RaiseDueDialog
          institution={
            scope
              ? {
                  id: scope.institution.id,
                  name: scope.institution.name,
                  societyName: scope.institution.societyName,
                }
              : undefined
          }
          write={{ pending: raise.isPending, error: raise.error, overrides: RAISE_ERROR_COPY }}
          onEdit={() => {
            if (raise.isError) raise.reset();
          }}
          onClose={() => {
            raise.reset();
            setRaising(false);
          }}
          onSubmit={(body, idempotencyKey) =>
            attempt<Due>(
              (settled) => raise.mutate({ body, idempotencyKey }, settled),
              (due) => {
                setRaising(false);
                setDueId(due.id);
                toast.success(`Raised ${due.invoiceNo}`);
              },
            )
          }
        />
      ) : null}
    </>
  );
}

/** What is owed and what came in this month, from PLT-01, and how many dues are open. */
function Totals() {
  const dashboard = useDashboard();
  const open = useDueList({ page: 1, limit: 1, sort: '-createdAt', q: '', status: 'due' });
  if (dashboard.isPending) {
    return (
      <div role="status" aria-label="Loading the totals" className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }
  if (dashboard.isError) {
    return (
      <InlineAlert tone="warning">
        The totals could not be loaded. The dues below are not affected.
      </InlineAlert>
    );
  }
  const { duesOutstandingAmount, duesCollectedThisMonthAmount } = dashboard.data;
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <KpiTile
        label="Outstanding"
        value={formatMoneyCompact(duesOutstandingAmount)}
        exact={formatMoney(duesOutstandingAmount)}
        caption="Dues not yet paid"
      />
      <KpiTile
        label="Collected this month"
        value={formatMoneyCompact(duesCollectedThisMonthAmount)}
        exact={formatMoney(duesCollectedThisMonthAmount)}
        caption="Dues marked paid this month"
      />
      <KpiTile
        label="Open dues"
        value={open.data ? String(open.data.meta.totalItems) : '—'}
        caption="Waiting for payment"
      />
    </div>
  );
}
