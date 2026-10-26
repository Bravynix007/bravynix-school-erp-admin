'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { IconPlus } from '@tabler/icons-react';
import { LoadFailed } from '@/components/shell/load-failed';
import { PageHeader } from '@/components/shell/page-header';
import { TenantStatusChip } from '@/components/shell/tenant-status-chip';
import { DataTable, type Column } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { FilterBar } from '@/components/ui/filter-bar';
import { LinkButton } from '@/components/ui/link-button';
import { Mono } from '@/components/ui/mono';
import { Pagination } from '@/components/ui/pagination';
import { formatStamp } from '@/lib/format/date';
import { useListControls } from '@/lib/hooks/use-list-controls';
import type { SocietySummary } from './types';
import { useSocietyList } from './use-societies';

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export const societyWorkspaceHref = (id: string) => `/societies/workspace?id=${id}` as Route;

/** PLT-02: every Society, searchable by name or code (STITCH_PROMPT 2.1). */
export function SocietiesList() {
  const router = useRouter();
  const controls = useListControls('name');
  const [status, setStatus] = useState('');
  const list = useSocietyList({
    page: controls.page,
    limit: PAGE_SIZE,
    sort: controls.sortParam,
    q: controls.q,
    status,
  });

  const columns: Column<SocietySummary>[] = [
    {
      key: 'name',
      header: 'Society',
      sortable: true,
      primary: true,
      cell: (row) => (
        <>
          <span className="block font-medium">{row.name}</span>
          <Mono className="text-caption text-ink-secondary">{row.code}</Mono>
        </>
      ),
    },
    {
      key: 'institutions',
      header: 'Institutions',
      align: 'end',
      cell: (row) => <span className="tabular">{row.institutionCount}</span>,
    },
    { key: 'status', header: 'Status', cell: (row) => <TenantStatusChip record={row} /> },
    {
      key: 'updated',
      header: 'Updated',
      cell: (row) => (
        <span className="text-caption text-ink-secondary tabular">
          {formatStamp(row.updatedBy, row.updatedAt)}
        </span>
      ),
    },
  ];

  const total = list.data?.meta.totalItems;
  const filtered = controls.q !== '' || status !== '';

  return (
    <>
      <PageHeader
        title="Societies"
        meta={total === undefined ? undefined : `${total} ${total === 1 ? 'Society' : 'Societies'}`}
        actions={
          <LinkButton href="/societies/new" icon={<IconPlus size={18} aria-hidden="true" />}>
            Onboard Society
          </LinkButton>
        }
      />
      <div className="flex flex-col gap-4">
        <FilterBar
          searchLabel="Search Societies"
          searchPlaceholder="Search by name or code"
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
          countLabel={total === undefined ? '' : `${total} ${total === 1 ? 'Society' : 'Societies'}`}
        />
        {list.isError ? (
          <LoadFailed
            error={list.error}
            onRetry={() => void list.refetch()}
            list={{ href: '/dashboard', label: 'the dashboard' }}
          />
        ) : (
          <DataTable
            caption="Societies"
            columns={columns}
            rows={list.data?.items ?? []}
            getRowId={(row) => row.id}
            loading={list.isPending}
            refreshing={list.isPlaceholderData}
            sort={controls.sort}
            onSort={controls.toggleSort}
            onRowOpen={(row) => router.push(societyWorkspaceHref(row.id))}
            empty={
              filtered ? (
                <EmptyState
                  title="No Societies match"
                  description="Clear the search and filters to see all of them."
                />
              ) : (
                <EmptyState
                  title="No Societies yet"
                  description="Onboard the first Society to begin."
                  action={<LinkButton href="/societies/new">Onboard Society</LinkButton>}
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
                  noun="Societies"
                />
              ) : undefined
            }
          />
        )}
      </div>
    </>
  );
}
