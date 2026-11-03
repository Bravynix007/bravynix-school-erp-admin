'use client';

import { IconLock } from '@tabler/icons-react';
import type { Route } from 'next';
import Link from 'next/link';
import { InlineAlert } from '@/components/ui/inline-alert';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusChip } from '@/components/ui/status-chip';
import { formatCount } from '@/lib/format/count';
import { formatInstant } from '@/lib/format/date';
import { sectionChipLabel } from './section-copy';
import type { AccessBlock } from './types';
import { useRecentBlocks } from './use-blocks';

const QUEUE_SIZE = 5;

/** Where a block is read and lifted: its Society's Access tab for the Owners, its Institution's page for the rest. */
function blockHref(block: AccessBlock): Route {
  return (
    block.institutionId === null
      ? `/societies/workspace?id=${encodeURIComponent(block.societyId)}&tab=access`
      : `/institutions/workspace?id=${encodeURIComponent(block.institutionId)}`
  ) as Route;
}

/**
 * The blocks in force, newest first (PLT-44): which Society's Owners or which Institution's staff or students are
 * stopped, and why. Opening a row goes to the page where the block is lifted. There is no page that lists every
 * block, so the header says how many there are; the rest are on the Societies and Institutions pages.
 */
export function BlockedAccessQueue() {
  const list = useRecentBlocks(QUEUE_SIZE);
  const total = list.data?.meta.totalItems;

  return (
    <section aria-label="Blocked access" className="rounded-lg border border-line bg-surface">
      <header className="flex items-center justify-between gap-3 border-b border-line-subtle px-5 py-4">
        <h2 className="text-h3 font-semibold">
          Blocked access
          {total === undefined ? null : (
            <span className="ml-2 text-caption font-normal text-ink-secondary">
              {formatCount(total)} in force
            </span>
          )}
        </h2>
        {total !== undefined && total > QUEUE_SIZE ? (
          <span className="text-caption text-ink-secondary">Newest {QUEUE_SIZE} shown</span>
        ) : null}
      </header>
      {list.isPending ? (
        <div role="status" aria-label="Loading the blocked access" className="flex flex-col gap-3 p-5">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : list.isError ? (
        <div className="p-5">
          <InlineAlert tone="warning">
            The blocked access could not be loaded.{' '}
            <button type="button" className="underline" onClick={() => void list.refetch()}>
              Try again
            </button>
          </InlineAlert>
        </div>
      ) : list.data.items.length === 0 ? (
        <p className="px-5 py-8 text-center text-caption text-ink-secondary">
          Nothing is blocked. Every Society’s people can work.
        </p>
      ) : (
        <ul className="divide-y divide-line-subtle">
          {list.data.items.map((block) => (
            <li key={block.id}>
              <Link
                href={blockHref(block)}
                className="flex flex-wrap items-start justify-between gap-x-6 gap-y-1 px-5 py-3 hover:bg-row-hover"
              >
                <span className="min-w-0">
                  <span className="block font-medium break-words">
                    {block.institutionName ?? block.societyName}
                  </span>
                  {block.institutionName === null ? null : (
                    <span className="block text-caption text-ink-secondary">{block.societyName}</span>
                  )}
                  <span className="block text-caption break-words text-ink-secondary">{block.reason}</span>
                </span>
                <span className="flex flex-col items-end gap-1">
                  <StatusChip
                    tone="error"
                    label={sectionChipLabel(block.section)}
                    icon={<IconLock size={12} aria-hidden="true" />}
                  />
                  <span className="text-caption text-ink-secondary tabular">
                    {formatInstant(block.blockedAt)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
