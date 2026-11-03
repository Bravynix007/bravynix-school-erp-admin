'use client';

import { IconPlus } from '@tabler/icons-react';
import { useState } from 'react';
import { LoadFailed } from '@/components/shell/load-failed';
import { WriteError } from '@/components/shell/write-error';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Mono } from '@/components/ui/mono';
import { Skeleton, TableSkeleton } from '@/components/ui/skeleton';
import { StatusChip } from '@/components/ui/status-chip';
import { useToast } from '@/components/ui/toast';
import { useGuardedWrite } from '@/lib/hooks/use-one-at-a-time';
import { MasterDialog } from './master-dialog';
import { groupByCategory, inOrder, moveBody, type Group } from './master-order';
import { MASTER_SPECS, MASTER_WRITE_COPY } from './master-specs';
import { MasterTable, type RowActions } from './master-table';
import type { MasterEntry, MasterType } from './types';
import { useAddMasterEntry, useChangeMasterEntry, useMasterList } from './use-masters';

type Open = { kind: 'add' } | { kind: 'edit' | 'hide'; entry: MasterEntry } | null;

const countOf = (entries: readonly MasterEntry[], one: string, many: string) => {
  const hidden = entries.filter((entry) => entry.status === 0).length;
  return `${entries.length} ${entries.length === 1 ? one : many}${hidden > 0 ? ` (${hidden} hidden)` : ''}`;
};

/**
 * One master (MST-01, PLT-31, PLT-32; API design 10.4g): its entries with the hidden ones marked, add, edit, hide,
 * show and move. Predefined classes are listed under their class category. Nothing here deletes an entry.
 */
export function MastersTab({ type }: { type: MasterType }) {
  const spec = MASTER_SPECS[type];
  const list = useMasterList(type);
  const categoryList = useMasterList('class-categories', spec.isClass);
  const add = useAddMasterEntry(type);
  const change = useChangeMasterEntry(type);
  const toast = useToast();
  const attempt = useGuardedWrite();
  const [open, setOpen] = useState<Open>(null);

  const query = spec.isClass ? categoryList : list;
  if (list.isError || categoryList.isError) {
    const failed = list.isError ? list : categoryList;
    return (
      <LoadFailed
        error={failed.error}
        onRetry={() => void failed.refetch()}
        list={{ href: '/dashboard', label: 'the dashboard' }}
      />
    );
  }
  if (list.isPending || (spec.isClass && categoryList.isPending)) {
    return (
      <div
        role="status"
        aria-label={`Loading the ${spec.label.toLowerCase()}`}
        className="flex flex-col gap-4"
      >
        {spec.isClass ? <Skeleton className="h-10 w-72" /> : null}
        <TableSkeleton columns={4} />
      </div>
    );
  }

  const entries = inOrder(list.data);
  const categories = inOrder(categoryList.data ?? []);
  const groups: Group[] = spec.isClass ? groupByCategory(categories, entries) : [{ key: null, entries }];
  const refreshing = list.isRefetching || query.isRefetching;
  const noCategory = spec.isClass && categories.length === 0;

  function write(entry: MasterEntry, body: Parameters<typeof change.mutate>[0]['body'], done: string) {
    attempt(
      (settled) => change.mutate({ id: entry.id, body }, settled),
      () => {
        setOpen(null);
        toast.success(done);
      },
    );
  }
  const actions: RowActions = {
    onMove(entry, by) {
      const group = groups.find((item) => item.entries.some((candidate) => candidate.id === entry.id));
      const body = group ? moveBody(group.entries, entry, by) : null;
      if (body) write(entry, body, `${entry.name} moved ${by === -1 ? 'up' : 'down'}`);
    },
    onEdit(entry) {
      change.reset();
      setOpen({ kind: 'edit', entry });
    },
    onToggle(entry) {
      change.reset();
      if (entry.status === 0)
        write(entry, { version: entry.version, status: 1 }, `${entry.name} is shown again`);
      else setOpen({ kind: 'hide', entry });
    },
  };

  const addButton = (
    <Button
      icon={<IconPlus size={18} aria-hidden="true" />}
      disabled={noCategory}
      title={noCategory ? 'Add a class category first' : undefined}
      onClick={() => {
        add.reset();
        setOpen({ kind: 'add' });
      }}
    >
      {spec.addLabel}
    </Button>
  );
  const dialogWrite = (pending: boolean, error: unknown, reload: () => void) => ({
    pending,
    error,
    onReload: reload,
    overrides: MASTER_WRITE_COPY,
  });
  const reload = () => {
    add.reset();
    change.reset();
    void list.refetch();
    if (spec.isClass) void categoryList.refetch();
  };

  return (
    <div role="group" aria-label={spec.label} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-caption text-ink-secondary">
          {countOf(entries, spec.noun, spec.label.toLowerCase())}
        </p>
        {entries.length > 0 || noCategory ? addButton : null}
      </div>

      {change.isError && open === null ? (
        <WriteError error={change.error} onReload={reload} overrides={MASTER_WRITE_COPY} />
      ) : null}

      {entries.length === 0 && !noCategory ? (
        <EmptyState
          title={`No ${spec.label.toLowerCase()} yet`}
          description={`Add the first ${spec.noun}. Institutions choose from this list.`}
          action={addButton}
        />
      ) : noCategory ? (
        <EmptyState
          title="No class categories yet"
          description="Predefined classes belong to a class category. Add a class category first."
        />
      ) : (
        groups.map((group) => {
          const category = categories.find((item) => item.id === group.key);
          return (
            <section
              key={group.key ?? 'all'}
              aria-label={category ? `${category.name} classes` : spec.label}
              className="flex flex-col gap-2"
            >
              {category ? (
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-h3 font-semibold">{category.name}</h2>
                  <Mono className="text-ink-secondary">{category.code}</Mono>
                  {category.status === 0 ? <StatusChip tone="neutral" label="Category hidden" /> : null}
                  <span className="text-caption text-ink-secondary">
                    {countOf(group.entries, 'class', 'classes')}
                  </span>
                </div>
              ) : null}
              <MasterTable
                spec={spec}
                caption={category ? `${category.name} classes` : spec.label}
                entries={group.entries}
                refreshing={refreshing}
                actions={actions}
                empty={
                  <p className="rounded-lg border border-line bg-surface px-4 py-6 text-caption text-ink-secondary">
                    No classes in this category yet.
                  </p>
                }
              />
            </section>
          );
        })
      )}

      {open?.kind === 'add' ? (
        <MasterDialog
          spec={spec}
          categories={categories}
          defaultCategoryId={categories.find((item) => item.status === 1)?.id ?? ''}
          write={dialogWrite(add.isPending, add.error, reload)}
          onEdit={() => {
            if (add.isError) add.reset();
          }}
          onClose={() => {
            add.reset();
            setOpen(null);
          }}
          onSubmit={(body) =>
            attempt(
              (settled) => add.mutate(body, settled),
              (entry: MasterEntry) => {
                setOpen(null);
                toast.success(`${entry.name} added`);
              },
            )
          }
        />
      ) : null}
      {open?.kind === 'edit' ? (
        <MasterDialog
          spec={spec}
          categories={categories}
          entry={open.entry}
          write={dialogWrite(change.isPending, change.error, reload)}
          onEdit={() => {
            if (change.isError) change.reset();
          }}
          onClose={() => {
            change.reset();
            setOpen(null);
          }}
          onSubmit={(body) => write(open.entry, body, `${open.entry.name} saved`)}
        />
      ) : null}
      <ConfirmDialog
        open={open?.kind === 'hide'}
        title={open?.kind === 'hide' ? `Hide ${open.entry.name}?` : 'Hide this entry?'}
        consequence="Institutions that already use it keep it. It is no longer offered for anything new, and you can show it again."
        confirmLabel="Hide"
        loading={change.isPending}
        onCancel={() => {
          change.reset();
          setOpen(null);
        }}
        onConfirm={() => {
          if (open?.kind === 'hide')
            write(open.entry, { version: open.entry.version, status: 0 }, `${open.entry.name} hidden`);
        }}
      >
        {change.isError && open?.kind === 'hide' ? (
          <WriteError error={change.error} onReload={reload} overrides={MASTER_WRITE_COPY} />
        ) : null}
      </ConfirmDialog>
    </div>
  );
}
