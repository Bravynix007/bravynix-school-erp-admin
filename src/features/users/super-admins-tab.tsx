'use client';

import { IconPlus } from '@tabler/icons-react';
import { useState } from 'react';
import { AccountStatusChip } from '@/components/shell/account-status-chip';
import { LoadFailed } from '@/components/shell/load-failed';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { SeatMeter } from '@/components/ui/seat-meter';
import { useToast } from '@/components/ui/toast';
import { formatInstant } from '@/lib/format/date';
import { useGuardedWrite } from '@/lib/hooks/use-one-at-a-time';
import { AddPersonDialog } from './person-dialogs';
import { PersonSheet } from './person-sheet';
import { MAX_SUPER_ADMINS, type SuperAdmin } from './types';
import { useLostSelection } from './use-lost-selection';
import { useAddSuperAdmin, useSuperAdmins } from './use-users';

const columns: Column<SuperAdmin>[] = [
  {
    key: 'name',
    header: 'Super Admin',
    primary: true,
    cell: (row) => (
      <>
        <span className="block font-medium">{row.displayName}</span>
        <span className="text-caption text-ink-secondary">{row.email}</span>
      </>
    ),
  },
  { key: 'status', header: 'Status', cell: (row) => <AccountStatusChip status={row.accountStatus} /> },
  {
    key: 'authenticator',
    header: 'Authenticator',
    cell: (row) => (row.authenticatorSetUp ? 'Set up' : 'Not yet'),
  },
  {
    key: 'granted',
    header: 'Added',
    cell: (row) => (
      <span className="text-caption text-ink-secondary tabular">{formatInstant(row.grantedAt)}</span>
    ),
  },
];

/** PLT-12 to PLT-14: the Super Admins by seat, at most three (API design 10.4d). */
export function SuperAdminsTab({
  selectedId,
  onSelect,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const list = useSuperAdmins();
  const add = useAddSuperAdmin();
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const attempt = useGuardedWrite();
  const rows = list.data ?? [];
  const selected = rows.find((row) => row.id === selectedId);
  const region = useLostSelection({
    selected: selectedId,
    found: selected !== undefined,
    settled: list.isSuccess && !list.isFetching,
    clear: () => onSelect(''),
  });

  if (list.isError) {
    return (
      <LoadFailed
        error={list.error}
        onRetry={() => void list.refetch()}
        list={{ href: '/dashboard', label: 'the dashboard' }}
      />
    );
  }
  const full = rows.length >= MAX_SUPER_ADMINS;

  return (
    <div
      ref={region}
      role="group"
      aria-label="Super Admins"
      tabIndex={-1}
      className="flex flex-col gap-4 pt-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SeatMeter
          max={MAX_SUPER_ADMINS}
          noun="Super Admins"
          seats={rows.map((row) => ({ id: row.id, name: row.displayName }))}
        />
        <Button
          icon={<IconPlus size={18} aria-hidden="true" />}
          onClick={() => setAdding(true)}
          disabled={list.isPending || full}
        >
          Add Super Admin
        </Button>
      </div>
      <DataTable
        caption="Super Admins"
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        loading={list.isPending}
        refreshing={list.isRefetching}
        selectedId={selectedId || undefined}
        onRowOpen={(row) => onSelect(row.id)}
        empty={<EmptyState title="No Super Admins" description="Add one so someone can run the console." />}
      />

      {adding ? (
        <AddPersonDialog
          title="Add Super Admin"
          description="They get an emailed code to sign in, and set up an authenticator app the first time."
          submitLabel="Add Super Admin"
          write={{
            pending: add.isPending,
            error: add.error,
            overrides: {
              SEAT_LIMIT_REACHED: 'There are already three Super Admins. Remove one first.',
              DUPLICATE: 'This person is already a Super Admin.',
              ACCOUNT_BLOCKED: 'This person’s account is blocked. Unblock it first.',
              INVALID_STATE: 'This person’s account is inactive.',
            },
          }}
          onClose={() => {
            add.reset();
            setAdding(false);
          }}
          onSubmit={(body) =>
            attempt<SuperAdmin>(
              (settled) => add.mutate(body, settled),
              (person) => {
                setAdding(false);
                toast.success(`${person.displayName} added as Super Admin`);
              },
            )
          }
        />
      ) : null}
      {selected ? (
        <PersonSheet
          person={selected}
          onClose={() => onSelect('')}
          onRemoved={() => {
            onSelect('');
            window.setTimeout(() => region.current?.focus(), 0);
          }}
          reload={() => void list.refetch()}
        />
      ) : null}
    </div>
  );
}
