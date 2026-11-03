'use client';

import { IconLock } from '@tabler/icons-react';
import type { Route } from 'next';
import Link from 'next/link';
import { QUEUE_SIZE, QueueCard } from '@/components/ui/queue-card';
import { StatusChip } from '@/components/ui/status-chip';
import { formatInstant } from '@/lib/format/date';
import { sectionChipLabel } from './section-copy';
import type { AccessBlock } from './types';
import { useRecentBlocks } from './use-blocks';

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

  return (
    <QueueCard
      title="Blocked access"
      countLabel="in force"
      aside={(total) =>
        total !== undefined && total > QUEUE_SIZE ? (
          <span className="text-caption text-ink-secondary">Newest {QUEUE_SIZE} shown</span>
        ) : null
      }
      query={list}
      loadingLabel="Loading the blocked access"
      loadingRows={2}
      failed="The blocked access could not be loaded."
      empty="Nothing is blocked. Every Society’s people can work."
      renderRow={(block) => (
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
            <span className="text-caption text-ink-secondary tabular">{formatInstant(block.blockedAt)}</span>
          </span>
        </Link>
      )}
    />
  );
}
