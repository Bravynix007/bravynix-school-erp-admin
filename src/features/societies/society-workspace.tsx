'use client';

import type { Route } from 'next';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { AccountStatusChip } from '@/components/shell/account-status-chip';
import { LoadFailed } from '@/components/shell/load-failed';
import { PageHeader } from '@/components/shell/page-header';
import { RecordNotFound } from '@/components/shell/status-panels';
import { TenantStatusChip } from '@/components/shell/tenant-status-chip';
import { WriteError } from '@/components/shell/write-error';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataTable, type Column } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { InlineAlert } from '@/components/ui/inline-alert';
import { KeyValueList } from '@/components/ui/key-value-list';
import { LinkButton } from '@/components/ui/link-button';
import { Mono } from '@/components/ui/mono';
import { SeatMeter } from '@/components/ui/seat-meter';
import { Skeleton } from '@/components/ui/skeleton';
import { StampBlock } from '@/components/ui/stamp-block';
import { TabPanel, Tabs } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/toast';
import { formatSchoolDate } from '@/lib/format/date';
import { MAX_OWNERS } from './owner-rows';
import type { SocietyDetail } from './types';
import { useDeactivateSociety, useSociety } from './use-societies';

type Institution = SocietyDetail['institutions'][number];

const TAB_PREFIX = 'society';

export const societyEditHref = (id: string) => `/societies/edit?id=${id}` as Route;

/** PLT-04: one Society with its Owners and Institutions (STITCH_PROMPT 2.3). The ID is a query parameter, because the console is a static export. */
export function SocietyWorkspace() {
  const id = useSearchParams().get('id');
  const query = useSociety(id);

  if (id === null) return <RecordNotFound listHref="/societies" listLabel="Societies" />;
  if (query.isPending) return <WorkspaceSkeleton />;
  if (query.isError) {
    return (
      <LoadFailed
        error={query.error}
        onRetry={() => void query.refetch()}
        list={{ href: '/societies', label: 'Societies' }}
      />
    );
  }
  return <Workspace society={query.data} reload={() => void query.refetch()} />;
}

function WorkspaceSkeleton() {
  return (
    <div role="status" aria-label="Loading the Society" className="flex flex-col gap-4">
      <Skeleton className="h-8 w-72" />
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

function Workspace({ society, reload }: { society: SocietyDetail; reload: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState('overview');
  const [deactivating, setDeactivating] = useState(false);
  const deactivate = useDeactivateSociety(society.id);

  const deactivated = society.status === 0;

  const institutionColumns: Column<Institution>[] = [
    {
      key: 'name',
      header: 'Institution',
      primary: true,
      cell: (row) => (
        <>
          <span className="block font-medium">{row.name}</span>
          <Mono className="text-caption text-ink-secondary">{row.code}</Mono>
        </>
      ),
    },
    { key: 'status', header: 'Status', cell: (row) => <TenantStatusChip record={row} /> },
  ];

  return (
    <>
      <PageHeader
        title={society.name}
        breadcrumb={
          <Breadcrumbs items={[{ label: 'Societies', href: '/societies' }, { label: society.name }]} />
        }
        status={<TenantStatusChip record={society} />}
        meta={
          <>
            <Mono>{society.code}</Mono>
            {society.foundedDate ? ` · Founded ${formatSchoolDate(society.foundedDate)}` : ''}
          </>
        }
        actions={
          deactivated ? undefined : (
            <>
              <LinkButton href={societyEditHref(society.id)} variant="secondary">
                Edit
              </LinkButton>
              <Button variant="secondary" onClick={() => setDeactivating(true)}>
                Deactivate
              </Button>
            </>
          )
        }
      />

      <div className="flex flex-col gap-4">
        {deactivated ? (
          <InlineAlert tone="info">
            This Society is deactivated. Its people can no longer sign in to it, and nothing was deleted.
          </InlineAlert>
        ) : null}
        <Tabs
          idPrefix={TAB_PREFIX}
          label="Society sections"
          value={tab}
          onChange={setTab}
          items={[
            { value: 'overview', label: 'Overview' },
            {
              value: 'owners',
              label: 'Owners',
              count: `${society.owners.length}/${MAX_OWNERS}`,
              countLabel: `${society.owners.length} of ${MAX_OWNERS}`,
            },
            { value: 'institutions', label: 'Institutions', count: String(society.institutions.length) },
          ]}
        />

        <TabPanel idPrefix={TAB_PREFIX} value="overview" active={tab === 'overview'}>
          <div className="flex flex-col gap-6 pt-4">
            <KeyValueList
              items={[
                { label: 'Email', value: society.email ?? '—' },
                {
                  label: 'Phone',
                  value: society.phone ? `+${society.phone.countryCode} ${society.phone.number}` : '—',
                },
                { label: 'Website', value: society.website ?? '—' },
                {
                  label: 'Address',
                  value:
                    [society.address.line1, society.address.line2, society.address.pincode]
                      .filter(Boolean)
                      .join(', ') || '—',
                },
                { label: 'Description', value: society.description ?? '—' },
              ]}
            />
            <StampBlock
              createdBy={society.createdBy}
              createdAt={society.createdAt}
              updatedBy={society.updatedBy}
              updatedAt={society.updatedAt}
            />
          </div>
        </TabPanel>

        <TabPanel idPrefix={TAB_PREFIX} value="owners" active={tab === 'owners'}>
          <div className="flex flex-col gap-4 pt-4">
            <SeatMeter
              max={MAX_OWNERS}
              noun="Owners"
              seats={society.owners.map((owner) => ({ id: owner.id, name: owner.displayName }))}
            />
            {society.owners.length === 0 ? (
              <EmptyState
                title="No Owners"
                description="Add an Owner from Users so someone can sign in to this Society."
              />
            ) : (
              <ul className="divide-y divide-line-subtle rounded-lg border border-line bg-surface">
                {society.owners.map((owner) => (
                  <li key={owner.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-medium">{owner.displayName}</p>
                      <p className="text-caption text-ink-secondary">{owner.email}</p>
                    </div>
                    <AccountStatusChip status={owner.accountStatus} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TabPanel>

        <TabPanel idPrefix={TAB_PREFIX} value="institutions" active={tab === 'institutions'}>
          <div className="pt-4">
            <DataTable
              caption="Institutions of this Society"
              columns={institutionColumns}
              rows={society.institutions}
              getRowId={(row) => row.id}
              empty={
                <EmptyState
                  title="No Institutions yet"
                  description="The Owners of this Society add its Institutions."
                />
              }
            />
          </div>
        </TabPanel>
      </div>

      <ConfirmDialog
        open={deactivating}
        title={`Deactivate ${society.name}?`}
        consequence="Its Owners, Institution Admins and staff are signed out and can no longer sign in to it. Nothing is deleted, but it cannot be reactivated from the console yet."
        confirmLabel="Deactivate Society"
        tone="danger"
        loading={deactivate.isPending}
        onCancel={() => {
          deactivate.reset();
          setDeactivating(false);
        }}
        onConfirm={() =>
          deactivate.mutate(undefined, {
            onSuccess: () => {
              setDeactivating(false);
              toast.success(`${society.name} deactivated`);
              router.replace('/societies');
            },
          })
        }
      >
        {deactivate.isError ? (
          <WriteError
            error={deactivate.error}
            onReload={() => {
              deactivate.reset();
              reload();
            }}
          />
        ) : null}
      </ConfirmDialog>
    </>
  );
}
