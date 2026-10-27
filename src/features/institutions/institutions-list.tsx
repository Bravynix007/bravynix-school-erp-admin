'use client';

import Link from 'next/link';
import { LoadFailed } from '@/components/shell/load-failed';
import { PageHeader } from '@/components/shell/page-header';
import { TenantStatusChip } from '@/components/shell/tenant-status-chip';
import { DataTable, type Column } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { FilterBar } from '@/components/ui/filter-bar';
import { Mono } from '@/components/ui/mono';
import { Pagination } from '@/components/ui/pagination';
import { BlockedSectionChips } from '@/features/blocks/blocked-section-chips';
import { SectionBlockButton } from '@/features/blocks/section-block-button';
import { INSTITUTION_SECTIONS } from '@/features/blocks/section-copy';
import { societyWorkspaceHref } from '@/features/societies/societies-list';
import { formatStamp } from '@/lib/format/date';
import { useListControls } from '@/lib/hooks/use-list-controls';
import { useUrlState } from '@/lib/hooks/use-url-state';
import type { InstitutionSummary } from './types';
import { useInstitutionList } from './use-institutions';

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const BLOCKED_OPTIONS = [
  { value: 'blocked', label: 'Has a blocked section' },
  { value: 'open', label: 'Nothing blocked' },
];

/**
 * PLT-19: the Institutions of every Society, with their blocked sections and the buttons to block or unblock
 * them. Super Admin reads Institutions here; the Owners of a Society add, edit and deactivate them (API design 10.4c).
 */
export function InstitutionsList() {
  const controls = useListControls('name');
  const [status, setStatus] = useUrlState('status', '', (value) =>
    STATUS_OPTIONS.some((option) => option.value === value),
  );
  const [blocked, setBlocked] = useUrlState('blocked', '', (value) =>
    BLOCKED_OPTIONS.some((option) => option.value === value),
  );
  const list = useInstitutionList({
    page: controls.page,
    limit: PAGE_SIZE,
    sort: controls.sortParam,
    q: controls.q,
    status,
    blocked,
  });

  const columns: Column<InstitutionSummary>[] = [
    {
      key: 'name',
      header: 'Institution',
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
      key: 'society',
      header: 'Society',
      cell: (row) => (
        <Link href={societyWorkspaceHref(row.societyId)} className="text-primary hover:underline">
          {row.societyName}
        </Link>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => (
        <span className="flex flex-wrap gap-1.5">
          <TenantStatusChip record={row} />
          <BlockedSectionChips sections={row.blockedSections} />
        </span>
      ),
    },
    {
      key: 'updated',
      header: 'Updated',
      cell: (row) => (
        <span className="text-caption text-ink-secondary tabular">
          {formatStamp(row.updatedBy, row.updatedAt)}
        </span>
      ),
    },
    {
      key: 'access',
      header: 'Access',
      cell: (row) => (
        <span className="flex flex-wrap gap-2">
          {INSTITUTION_SECTIONS.map((section) => (
            <SectionBlockButton
              key={section}
              target={{ section, societyId: row.societyId, institutionId: row.id }}
              name={row.name}
              blocked={row.blockedSections.includes(section)}
              canBlock={row.status === 1}
            />
          ))}
        </span>
      ),
    },
  ];

  const total = list.data?.meta.totalItems;
  const noun = total === 1 ? 'Institution' : 'Institutions';
  const filtered = controls.q !== '' || status !== '' || blocked !== '';

  return (
    <>
      <PageHeader title="Institutions" meta={total === undefined ? undefined : `${total} ${noun}`} />
      <div className="flex flex-col gap-4">
        <FilterBar
          searchLabel="Search Institutions"
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
            {
              key: 'blocked',
              label: 'Access',
              options: BLOCKED_OPTIONS,
              value: blocked,
              onChange: (value) => {
                setBlocked(value);
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
            caption="Institutions"
            columns={columns}
            rows={list.data?.items ?? []}
            getRowId={(row) => row.id}
            loading={list.isPending}
            refreshing={list.isPlaceholderData}
            sort={controls.sort}
            onSort={controls.toggleSort}
            empty={
              filtered ? (
                <EmptyState
                  title="No Institutions match"
                  description="Clear the search and filters to see all of them."
                />
              ) : (
                <EmptyState
                  title="No Institutions yet"
                  description="The Owners of a Society add its Institutions."
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
                  noun="Institutions"
                />
              ) : undefined
            }
          />
        )}
      </div>
    </>
  );
}
