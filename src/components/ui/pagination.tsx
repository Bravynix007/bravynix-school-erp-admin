import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { useEffect, useRef } from 'react';
import { Button } from './button';

/** Page mode, 20 per page (DESIGN.md 9). Shows the range, never only arrows. */
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  noun,
}: {
  /** 1-based. */
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  noun: string;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <nav aria-label={`${noun} pages`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <p className="text-caption text-ink-secondary tabular" aria-live="polite">
        Showing {from}–{to} of {total} {noun}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          icon={<IconChevronLeft size={16} aria-hidden="true" />}
          aria-disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <span className="text-caption text-ink-secondary tabular">
          Page {page} of {pageCount}
        </span>
        <Button
          variant="secondary"
          size="sm"
          aria-disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <IconChevronRight size={16} aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}

/**
 * Cursor mode: the API gives no total, so only what is on screen is counted.
 * When the last page arrives the button turns into "That is all of them"; if
 * the button had focus, focus moves to that line so it is not lost (WCAG 2.4.3).
 */
export function LoadMore({
  shown,
  noun,
  hasMore,
  loading,
  onLoadMore,
}: {
  shown: number;
  noun: string;
  hasMore: boolean;
  loading?: boolean;
  onLoadMore: () => void;
}) {
  const buttonFocused = useRef(false);
  const endRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!hasMore && buttonFocused.current) {
      buttonFocused.current = false;
      endRef.current?.focus();
    }
  }, [hasMore]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <p className="text-caption text-ink-secondary tabular" aria-live="polite">
        Showing {shown} {noun}
      </p>
      {hasMore ? (
        <Button
          variant="secondary"
          size="sm"
          loading={loading}
          onClick={onLoadMore}
          onFocus={() => {
            buttonFocused.current = true;
          }}
          onBlur={() => {
            // Unmounting does not blur in React, so a blur here is the person moving on.
            buttonFocused.current = false;
          }}
        >
          Load more
        </Button>
      ) : (
        <p ref={endRef} tabIndex={-1} className="rounded-sm text-caption text-ink-tertiary">
          That is all of them
        </p>
      )}
    </div>
  );
}
