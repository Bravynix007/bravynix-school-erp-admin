'use client';

import type { MouseEvent, ReactNode } from 'react';
import { IconArrowDown, IconArrowUp, IconArrowsSort } from '@tabler/icons-react';
import { cn } from '@/lib/cn';
import { TableSkeleton } from './skeleton';

export type SortDirection = 'asc' | 'desc';

export interface Column<Row> {
  key: string;
  header: string;
  cell: (row: Row) => ReactNode;
  /** Numbers and money align to the end (DESIGN.md 6). */
  align?: 'start' | 'end';
  /** Makes the header a button that reports the key to `onSort`. */
  sortable?: boolean;
  /** The first column: it holds the row's button when `onRowOpen` is set. */
  primary?: boolean;
}

export interface DataTableProps<Row> {
  /** Names the table for assistive technology, e.g. "Institutions". */
  caption: string;
  columns: Column<Row>[];
  rows: Row[];
  getRowId: (row: Row) => string;
  /** The first load: skeleton bars in the final layout. */
  loading?: boolean;
  /** A refetch: old rows stay, dimmed (DESIGN.md 17). */
  refreshing?: boolean;
  sort?: { key: string; direction: SortDirection };
  onSort?: (key: string) => void;
  selectedId?: string;
  /** Opens the row, e.g. its side sheet. Clicking anywhere on the row does it. */
  onRowOpen?: (row: Row) => void;
  /** Accessible name of the row's button, e.g. "Open Green Valley School". */
  rowLabel?: (row: Row) => string;
  empty?: ReactNode;
  dense?: boolean;
  /** Pagination or Load more. */
  footer?: ReactNode;
}

const INTERACTIVE = 'a,button,input,select,textarea,[role="menuitem"],[role="button"]';

/**
 * White, 12 px radius, Paper 200 header, 48 px rows (40 dense), no vertical
 * lines (DESIGN.md 9). From the small breakpoint down, rows stack as labelled
 * cards. The table never scrolls sideways, so 200% zoom keeps working.
 */
export function DataTable<Row>({
  caption,
  columns,
  rows,
  getRowId,
  loading,
  refreshing,
  sort,
  onSort,
  selectedId,
  onRowOpen,
  rowLabel,
  empty,
  dense,
  footer,
}: DataTableProps<Row>) {
  if (loading) return <TableSkeleton columns={Math.max(columns.length, 2)} />;
  if (rows.length === 0 && empty) return <>{empty}</>;

  const primaryKey = columns.find((c) => c.primary)?.key ?? columns[0]?.key;

  function clickRow(event: MouseEvent<HTMLTableRowElement>, row: Row) {
    if (!onRowOpen) return;
    if ((event.target as HTMLElement).closest(INTERACTIVE)) return;
    onRowOpen(row);
  }

  return (
    <div className="overflow-clip rounded-lg border border-line bg-surface">
      <div role="status" className="sr-only">
        {refreshing ? 'Refreshing the list' : ''}
      </div>
      <table
        aria-busy={refreshing || undefined}
        className={cn('w-full border-collapse text-left', refreshing && 'opacity-60 transition-opacity')}
      >
        <caption className="sr-only">{caption}</caption>
        <thead className="max-md:sr-only">
          <tr>
            {columns.map((column) => {
              const active = sort?.key === column.key;
              const ariaSort = column.sortable
                ? active
                  ? sort.direction === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : 'none'
                : undefined;
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={ariaSort}
                  className={cn(
                    'sticky top-0 z-10 bg-sunken px-4 py-3 text-label font-medium text-ink-secondary',
                    column.align === 'end' ? 'text-right' : 'text-left',
                  )}
                >
                  {column.sortable ? (
                    <button
                      type="button"
                      onClick={() => onSort?.(column.key)}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-sm font-medium hover:text-ink',
                        column.align === 'end' && 'flex-row-reverse',
                        active && 'text-ink',
                      )}
                    >
                      {column.header}
                      {active ? (
                        sort.direction === 'asc' ? (
                          <IconArrowUp size={14} aria-hidden="true" />
                        ) : (
                          <IconArrowDown size={14} aria-hidden="true" />
                        )
                      ) : (
                        <IconArrowsSort size={14} aria-hidden="true" className="text-ink-tertiary" />
                      )}
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const id = getRowId(row);
            const selected = id === selectedId;
            return (
              <tr
                key={id}
                aria-current={selected ? 'true' : undefined}
                onClick={onRowOpen ? (event) => clickRow(event, row) : undefined}
                className={cn(
                  'border-t border-line first:border-t-0 max-md:flex max-md:flex-col max-md:gap-1 max-md:px-4 max-md:py-3',
                  selected ? 'bg-primary-tint' : 'hover:bg-row-hover',
                  onRowOpen && 'cursor-pointer',
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      'px-4 text-body text-ink',
                      dense ? 'py-2' : 'py-3',
                      column.align === 'end' ? 'text-right tabular' : 'text-left',
                      'max-md:flex max-md:justify-between max-md:gap-4 max-md:p-0 max-md:text-left',
                    )}
                  >
                    <span className="hidden text-caption text-ink-secondary max-md:inline">
                      {column.header}
                    </span>
                    <span className="min-w-0 max-md:text-right">
                      {onRowOpen && column.key === primaryKey ? (
                        <button
                          type="button"
                          onClick={() => onRowOpen(row)}
                          aria-label={rowLabel?.(row)}
                          className="rounded-sm text-left font-medium text-ink hover:underline"
                        >
                          {column.cell(row)}
                        </button>
                      ) : (
                        column.cell(row)
                      )}
                    </span>
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      {footer ? <div className="border-t border-line">{footer}</div> : null}
    </div>
  );
}
