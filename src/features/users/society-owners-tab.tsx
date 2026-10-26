'use client';

import { AccountStatusChip } from '@/components/shell/account-status-chip';
import { LoadFailed } from '@/components/shell/load-failed';
import { DataTable, type Column } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { FilterBar } from '@/components/ui/filter-bar';
import { Mono } from '@/components/ui/mono';
import { Pagination } from '@/components/ui/pagination';
import { formatInstant } from '@/lib/format/date';
import { useListControls } from '@/lib/hooks/use-list-controls';
import { useState } from 'react';
import { PersonSheet } from './person-sheet';
import type { SocietyOwner } from './types';
import { useOwnerList } from './use-users';

const PAGE_SIZE = 20;

const columns: Column<SocietyOwner>[] = [
  {
    key: 'name',
    header: 'Owner',
    sortable: true,
    primary: true,
    cell: (row) => (
      <>
        <span className="block font-medium">{row.displayName}</span>
        <span className="text-caption text-ink-secondary">{row.email}</span>
      </>
    ),
  },
  {
    key: 'society',
    header: 'Society',
    cell: (row) => (
      <>
        <span className="block">{row.society.name}</span>
        <Mono className="text-caption text-ink-secondary">{row.society.code}</Mono>
      </>
    ),
  },
  { key: 'status', header: 'Status', cell: (row) => <AccountStatusChip status={row.accountStatus} /> },
  {
    key: 'createdAt',
    header: 'Added',
    sortable: true,
    cell: (row) => (
      <span className="text-caption text-ink-secondary tabular">{formatInstant(row.grantedAt)}</span>
    ),
  },
];

/** PLT-11: every Society Owner, searchable by name or email. Seats are added and removed from the Society. */
export function SocietyOwnersTab() {
  const controls = useListControls('name');
  const list = useOwnerList({
    page: controls.page,
    limit: PAGE_SIZE,
    sort: controls.sortParam,
    q: controls.q,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = list.data?.items.find((row) => row.id === selectedId);
  const total = list.data?.meta.totalItems;
  const filtered = controls.q !== '';

  return (
    <div className="flex flex-col gap-4 pt-4">
      <FilterBar
        searchLabel="Search Owners"
        searchPlaceholder="Search by name or email"
        search={controls.search}
        onSearchChange={controls.setSearch}
        filters={[]}
        countLabel={total === undefined ? '' : `${total} ${total === 1 ? 'Owner' : 'Owners'}`}
      />
      {list.isError ? (
        <LoadFailed
          error={list.error}
          onRetry={() => void list.refetch()}
          list={{ href: '/dashboard', label: 'the dashboard' }}
        />
      ) : (
        <DataTable
          caption="Society Owners"
          columns={columns}
          rows={list.data?.items ?? []}
          getRowId={(row) => row.id}
          loading={list.isPending}
          refreshing={list.isPlaceholderData}
          sort={controls.sort}
          onSort={controls.toggleSort}
          selectedId={selectedId ?? undefined}
          onRowOpen={(row) => setSelectedId(row.id)}
          empty={
            filtered ? (
              <EmptyState title="No Owners match" description="Clear the search to see all of them." />
            ) : (
              <EmptyState
                title="No Owners yet"
                description="Owners are added when a Society is onboarded, and from its Owners tab."
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
                noun="Owners"
              />
            ) : undefined
          }
        />
      )}
      {selected ? (
        <PersonSheet
          person={selected}
          onClose={() => setSelectedId(null)}
          reload={() => void list.refetch()}
        />
      ) : null}
    </div>
  );
}
