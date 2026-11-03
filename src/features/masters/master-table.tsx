'use client';

import type { ReactNode } from 'react';
import { IconArrowDown, IconArrowUp, IconEye, IconEyeOff, IconPencil } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Mono } from '@/components/ui/mono';
import { StatusChip } from '@/components/ui/status-chip';
import type { MasterSpec } from './master-specs';
import type { MasterEntry } from './types';

export interface RowActions {
  onMove: (entry: MasterEntry, by: -1 | 1) => void;
  onEdit: (entry: MasterEntry) => void;
  /** Hiding asks first; showing again does not. */
  onToggle: (entry: MasterEntry) => void;
}

/**
 * The entries of one list (or of one class category), in order. Up and down buttons stand in for dragging, so the
 * order can be changed by keyboard. A hidden entry stays in its place, marked, and can be shown again.
 */
export function MasterTable({
  spec,
  caption,
  entries,
  refreshing,
  actions,
  empty,
}: {
  spec: MasterSpec;
  caption: string;
  entries: MasterEntry[];
  refreshing: boolean;
  actions: RowActions;
  empty: ReactNode;
}) {
  const columns: Column<MasterEntry>[] = [
    {
      key: 'name',
      header: spec.isClass ? 'Class' : 'Name',
      primary: true,
      cell: (entry) => (
        <span className={entry.status === 0 ? 'text-ink-secondary line-through' : undefined}>
          {entry.name}
        </span>
      ),
    },
    { key: 'code', header: 'Code', cell: (entry) => <Mono>{entry.code}</Mono> },
    ...(spec.isClass
      ? [
          {
            key: 'numericValue',
            header: 'Number',
            align: 'end' as const,
            cell: (entry: MasterEntry) => entry.numericValue ?? '—',
          },
        ]
      : []),
    {
      key: 'status',
      header: 'Status',
      cell: (entry) => (
        <StatusChip
          tone={entry.status === 1 ? 'success' : 'neutral'}
          label={entry.status === 1 ? 'Shown' : 'Hidden'}
        />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (entry) => {
        const index = entries.indexOf(entry);
        return (
          <span className="flex flex-wrap items-center gap-1">
            <Button
              variant="secondary"
              size="sm"
              aria-label={`Move ${entry.name} up`}
              title={index === 0 ? 'Already first' : undefined}
              disabled={index === 0}
              icon={<IconArrowUp size={16} aria-hidden="true" />}
              onClick={() => actions.onMove(entry, -1)}
            />
            <Button
              variant="secondary"
              size="sm"
              aria-label={`Move ${entry.name} down`}
              title={index === entries.length - 1 ? 'Already last' : undefined}
              disabled={index === entries.length - 1}
              icon={<IconArrowDown size={16} aria-hidden="true" />}
              onClick={() => actions.onMove(entry, 1)}
            />
            <Button
              variant="secondary"
              size="sm"
              aria-label={`Edit ${entry.name}`}
              icon={<IconPencil size={16} aria-hidden="true" />}
              onClick={() => actions.onEdit(entry)}
            />
            <Button
              variant="secondary"
              size="sm"
              icon={
                entry.status === 1 ? (
                  <IconEyeOff size={16} aria-hidden="true" />
                ) : (
                  <IconEye size={16} aria-hidden="true" />
                )
              }
              aria-label={`${entry.status === 1 ? 'Hide' : 'Show'} ${entry.name}`}
              onClick={() => actions.onToggle(entry)}
            >
              {entry.status === 1 ? 'Hide' : 'Show'}
            </Button>
          </span>
        );
      },
    },
  ];
  return (
    <DataTable
      caption={caption}
      columns={columns}
      rows={entries}
      getRowId={(entry) => entry.id}
      refreshing={refreshing}
      empty={empty}
    />
  );
}
