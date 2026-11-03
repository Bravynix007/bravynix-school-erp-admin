'use client';

import type { ReactNode } from 'react';
import { InlineAlert } from '@/components/ui/inline-alert';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCount } from '@/lib/format/count';

/** How many rows a dashboard queue lists. */
export const QUEUE_SIZE = 5;

/** What a query hands a queue: the rows once they are in, or that it is loading or failed. */
export interface QueueState<Row> {
  isPending: boolean;
  isError: boolean;
  refetch: () => unknown;
  data?: { items: Row[]; meta: { totalItems: number } };
}

/**
 * A card on the dashboard that lists the first few rows of something that needs attention: a header with the count,
 * then the rows, a short line while they load, a retry when they cannot be read, and a line when there are none.
 * The rows are drawn by the caller, so each queue keeps its own columns and links.
 */
export function QueueCard<Row extends { id: string }>({
  title,
  countLabel,
  aside,
  query,
  loadingLabel,
  loadingRows,
  failed,
  empty,
  renderRow,
}: {
  title: string;
  /** What the count says about the rows: "open", "in force". */
  countLabel: string;
  /** At the end of the header: a link to the whole list, or a note when there is none. */
  aside: (total: number | undefined) => ReactNode;
  query: QueueState<Row>;
  loadingLabel: string;
  loadingRows: number;
  failed: string;
  empty: string;
  renderRow: (row: Row) => ReactNode;
}) {
  const total = query.data?.meta.totalItems;

  return (
    <section aria-label={title} className="rounded-lg border border-line bg-surface">
      <header className="flex items-center justify-between gap-3 border-b border-line-subtle px-5 py-4">
        <h2 className="text-h3 font-semibold">
          {title}
          {total === undefined ? null : (
            <span className="ml-2 text-caption font-normal text-ink-secondary">
              {formatCount(total)} {countLabel}
            </span>
          )}
        </h2>
        {aside(total)}
      </header>
      {query.isPending ? (
        <div role="status" aria-label={loadingLabel} className="flex flex-col gap-3 p-5">
          {Array.from({ length: loadingRows }, (_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      ) : query.isError || !query.data ? (
        <div className="p-5">
          <InlineAlert tone="warning">
            {failed}{' '}
            <button type="button" className="underline" onClick={() => void query.refetch()}>
              Try again
            </button>
          </InlineAlert>
        </div>
      ) : query.data.items.length === 0 ? (
        <p className="px-5 py-8 text-center text-caption text-ink-secondary">{empty}</p>
      ) : (
        <ul className="divide-y divide-line-subtle">
          {query.data.items.map((row) => (
            <li key={row.id}>{renderRow(row)}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
