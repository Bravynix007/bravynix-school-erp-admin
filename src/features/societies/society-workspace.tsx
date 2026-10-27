'use client';

import type { Route } from 'next';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRef, useState } from 'react';
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
import { BlockedSectionChips } from '@/features/blocks/blocked-section-chips';
import { AddPersonDialog } from '@/features/users/person-dialogs';
import { formatSchoolDate } from '@/lib/format/date';
import { useGuardedWrite, useOneAtATime } from '@/lib/hooks/use-one-at-a-time';
import { useUrlState } from '@/lib/hooks/use-url-state';
import { MAX_OWNERS } from './owner-rows';
import { SocietyAccess } from './society-access';
import type { SocietyDetail } from './types';
import { useAddOwner, useDeactivateSociety, useRemoveOwner, useSociety } from './use-societies';

type Institution = SocietyDetail['institutions'][number];
type Owner = SocietyDetail['owners'][number];

const TAB_PREFIX = 'society';
const TABS = ['overview', 'owners', 'institutions', 'access'];

export const societyEditHref = (id: string) => `/societies/edit?id=${id}` as Route;

/** PLT-04: one Society with its Owners and Institutions (STITCH_PROMPT 2.3). The ID is a query parameter, because the console is a static export. */
export function SocietyWorkspace() {
  // An empty `?id=` is no ID: it would fetch the list as if it were one Society.
  const id = useSearchParams().get('id') || null;
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
  const [tab, setTab] = useUrlState('tab', 'overview', (value) => TABS.includes(value));
  const [deactivating, setDeactivating] = useState(false);
  const deactivate = useDeactivateSociety(society.id);
  const addOwner = useAddOwner(society.id);
  const removeOwner = useRemoveOwner(society.id);
  const [addingOwner, setAddingOwner] = useState(false);
  const [removing, setRemoving] = useState<Owner | null>(null);
  const oneAtATime = useOneAtATime();
  const attempt = useGuardedWrite();
  // Where focus lands when a removed Owner's own button is gone (DESIGN.md 15).
  const ownersRef = useRef<HTMLDivElement>(null);

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
  ];

  return (
    <>
      <PageHeader
        title={society.name}
        breadcrumb={
          <Breadcrumbs items={[{ label: 'Societies', href: '/societies' }, { label: society.name }]} />
        }
        status={
          <>
            <TenantStatusChip record={society} />
            <BlockedSectionChips sections={society.blockedSections} />
          </>
        }
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
            { value: 'access', label: 'Access' },
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
          <div
            ref={ownersRef}
            role="group"
            aria-label="Owners"
            tabIndex={-1}
            className="flex flex-col gap-4 pt-4"
          >
            <SeatMeter
              max={MAX_OWNERS}
              noun="Owners"
              seats={society.owners.map((owner) => ({ id: owner.id, name: owner.displayName }))}
              onAdd={deactivated ? undefined : () => setAddingOwner(true)}
              addLabel="Add an Owner"
            />
            {society.owners.length === 0 ? (
              <EmptyState
                title="No Owners"
                description={
                  deactivated
                    ? 'This Society has no Owners.'
                    : 'Add an Owner so someone can sign in to this Society.'
                }
              />
            ) : (
              <ul className="divide-y divide-line-subtle rounded-lg border border-line bg-surface">
                {society.owners.map((owner) => (
                  <li key={owner.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-medium">{owner.displayName}</p>
                      <p className="text-caption text-ink-secondary">{owner.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <AccountStatusChip status={owner.accountStatus} />
                      {deactivated ? null : (
                        <Button
                          variant="secondary"
                          size="sm"
                          aria-label={`Remove ${owner.displayName}`}
                          onClick={() => setRemoving(owner)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
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

        <TabPanel idPrefix={TAB_PREFIX} value="access" active={tab === 'access'}>
          <SocietyAccess society={society} />
        </TabPanel>
      </div>

      {addingOwner ? (
        <AddPersonDialog
          title="Add Owner"
          description={`They get an emailed code to sign in to ${society.name}. A Society has at most ${MAX_OWNERS} Owners.`}
          submitLabel="Add Owner"
          write={{
            pending: addOwner.isPending,
            error: addOwner.error,
            overrides: {
              SEAT_LIMIT_REACHED: `This Society already has ${MAX_OWNERS} Owners. Remove one first.`,
              DUPLICATE: 'This person is already an Owner of this Society.',
              ACCOUNT_BLOCKED: 'This person’s account is blocked. Unblock it first.',
              INVALID_STATE: 'This Society is deactivated, or the person’s account is inactive.',
            },
          }}
          onClose={() => {
            addOwner.reset();
            setAddingOwner(false);
          }}
          onSubmit={(body) =>
            attempt(
              (settled) => addOwner.mutate(body, settled),
              () => {
                setAddingOwner(false);
                toast.success('Owner added');
              },
            )
          }
        />
      ) : null}

      <ConfirmDialog
        open={removing !== null}
        title={`Remove ${removing?.displayName ?? 'this Owner'} as Owner?`}
        consequence="Their sessions as Owner of this Society end. Their account is not deleted, and they keep any other role."
        confirmLabel="Remove Owner"
        tone="danger"
        loading={removeOwner.isPending}
        onCancel={() => {
          removeOwner.reset();
          setRemoving(null);
        }}
        onConfirm={() => {
          if (removing === null) return;
          attempt(
            (settled) => removeOwner.mutate(removing.id, settled),
            () => {
              toast.success(`${removing.displayName} removed`);
              setRemoving(null);
              window.setTimeout(() => ownersRef.current?.focus(), 0);
            },
          );
        }}
      >
        {removeOwner.isError ? <WriteError error={removeOwner.error} /> : null}
      </ConfirmDialog>

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
          oneAtATime((release) =>
            deactivate.mutate(undefined, {
              onSuccess: () => {
                setDeactivating(false);
                toast.success(`${society.name} deactivated`);
                router.replace('/societies');
              },
              onError: release,
            }),
          )
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
