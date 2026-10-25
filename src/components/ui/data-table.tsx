'use client';

import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from 'react';
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
  empty?: ReactNode;
  dense?: boolean;
  /** Pagination or Load more. */
  footer?: ReactNode;
}

/** A click on plain row text waits this long for a second click, so double-clicking a word selects it instead of opening the row. */
const ROW_CLICK_DELAY_MS = 250;

const INTERACTIVE =
  'a,button,input,select,textarea,label,summary,[contenteditable],[role="menuitem"],[role="button"],[role="checkbox"],[role="switch"],[role="link"],[role="tab"]';

/**
 * White, 12 px radius, Paper 200 header, 48 px rows (40 dense), no vertical
 * lines (DESIGN.md 9). From the small breakpoint down, rows stack as labelled
 * cards. The table never scrolls sideways, so 200% zoom keeps working.
 *
 * The primary cell sits inside the row's button, so its content must be text
 * and inline markup only: no links, buttons or fields in it.
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
  empty,
  dense,
  footer,
}: DataTableProps<Row>) {
  const pendingOpen = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(pendingOpen.current), []);

  if (loading) return <TableSkeleton columns={Math.max(columns.length, 2)} />;
  if (rows.length === 0 && empty) return <>{empty}</>;

  const primaryKey = columns.find((c) => c.primary)?.key ?? columns[0]?.key;

  function clickRow(event: MouseEvent<HTMLTableRowElement>, row: Row) {
    if (!onRowOpen) return;
    if ((event.target as HTMLElement).closest(INTERACTIVE)) return;
    clearTimeout(pendingOpen.current);
    // A second click of a double-click: the person is selecting a word (to copy a code), not opening the row.
    if (event.detail > 1) return;
    // So is dragging across text.
    if (window.getSelection()?.toString()) return;
    pendingOpen.current = setTimeout(() => {
      if (!window.getSelection()?.toString()) onRowOpen(row);
    }, ROW_CLICK_DELAY_MS);
  }

  const sortable = columns.filter((c) => c.sortable);

  return (
    <div className="overflow-clip rounded-lg border border-line bg-surface">
      <div role="status" className="sr-only">
        {refreshing ? 'Refreshing the list' : ''}
      </div>
      {onSort && sortable.length > 0 ? <SortControl columns={sortable} sort={sort} onSort={onSort} /> : null}
      {/* Explicit roles survive the display changes below md, which can drop native table semantics in WebKit. */}
      <table
        role="table"
        aria-busy={refreshing || undefined}
        className={cn('w-full border-collapse text-left', refreshing && 'opacity-60 transition-opacity')}
      >
        <caption className="sr-only">{caption}</caption>
        <thead role="rowgroup" className="max-md:sr-only">
          <tr role="row">
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
                  role="columnheader"
                  scope="col"
                  aria-sort={ariaSort}
                  className={cn(
                    'sticky top-0 z-10 bg-sunken px-4 py-3 text-label font-medium text-ink-secondary',
                    column.align === 'end' ? 'text-right' : 'text-left',
                  )}
                >
                  {column.sortable ? (
                    <>
                      {/* Below md this header is visually hidden, so the button goes too (no invisible focus stop); SortControl takes over. */}
                      <span className="md:hidden">{column.header}</span>
                      <button
                        type="button"
                        onClick={() => onSort?.(column.key)}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-sm font-medium hover:text-ink max-md:hidden',
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
                    </>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody role="rowgroup">
          {rows.map((row) => {
            const id = getRowId(row);
            const selected = id === selectedId;
            return (
              <tr
                key={id}
                role="row"
                aria-current={selected ? 'true' : undefined}
                onClick={onRowOpen ? (event) => clickRow(event, row) : undefined}
                className={cn(
                  'border-t border-line first:border-t-0 max-md:flex max-md:flex-col max-md:gap-1 max-md:px-4 max-md:py-3',
                  selected
                    ? 'bg-primary-tint [&_.text-ink-tertiary]:text-ink-secondary'
                    : 'hover:bg-row-hover',
                  onRowOpen && 'cursor-pointer',
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    role="cell"
                    className={cn(
                      'px-4 text-body text-ink',
                      dense ? 'py-2' : 'py-3',
                      column.align === 'end' ? 'text-right tabular' : 'text-left',
                      'max-md:flex max-md:min-w-0 max-md:justify-between max-md:gap-4 max-md:p-0 max-md:text-left',
                    )}
                  >
                    <span aria-hidden="true" className="hidden text-caption text-ink-secondary max-md:inline">
                      {column.header}
                    </span>
                    <span className="min-w-0 max-md:text-right max-md:[overflow-wrap:anywhere]">
                      {onRowOpen && column.key === primaryKey ? (
                        <button
                          type="button"
                          onClick={() => onRowOpen(row)}
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

/** Below md the header row is hidden, so sorting moves to a visible "Sort by" select and a direction button. */
function SortControl<Row>({
  columns,
  sort,
  onSort,
}: {
  columns: Column<Row>[];
  sort: DataTableProps<Row>['sort'];
  onSort: (key: string) => void;
}) {
  const id = useId();
  const next = sort?.direction === 'asc' ? 'descending' : 'ascending';
  return (
    <div className="flex items-center gap-2 border-b border-line bg-sunken px-4 py-2 md:hidden">
      <label htmlFor={id} className="text-label font-medium text-ink-secondary">
        Sort by
      </label>
      <select
        id={id}
        value={sort?.key ?? ''}
        onChange={(event) => {
          if (event.target.value) onSort(event.target.value);
        }}
        className="h-11 min-w-0 flex-1 rounded-md border border-field bg-surface px-3 text-label text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        {sort ? null : (
          <option value="" disabled>
            Default order
          </option>
        )}
        {columns.map((c) => (
          <option key={c.key} value={c.key}>
            {c.header}
          </option>
        ))}
      </select>
      {sort ? (
        <button
          type="button"
          onClick={() => onSort(sort.key)}
          aria-label={`Sorted ${sort.direction === 'asc' ? 'ascending' : 'descending'}. Switch to ${next}`}
          title={`Switch to ${next}`}
          className="inline-flex size-11 items-center justify-center rounded-md border border-field bg-surface text-ink"
        >
          {sort.direction === 'asc' ? (
            <IconArrowUp size={16} aria-hidden="true" />
          ) : (
            <IconArrowDown size={16} aria-hidden="true" />
          )}
        </button>
      ) : null}
    </div>
  );
}
