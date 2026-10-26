'use client';

import { useEffect, useState } from 'react';
import type { SortDirection } from '@/components/ui/data-table';

const SEARCH_DELAY_MS = 300;

export interface ListControls {
  /** What the search box shows. */
  search: string;
  setSearch: (value: string) => void;
  /** What the list asks the API for: the search once typing pauses. */
  q: string;
  page: number;
  setPage: (page: number) => void;
  sort: { key: string; direction: SortDirection };
  toggleSort: (key: string) => void;
  /** `name` or `-name` (API design 13.1). */
  sortParam: string;
  /** Returns to page 1; call it when a filter changes. */
  resetPage: () => void;
}

/**
 * The state every page-mode list shares: a debounced search, the page, and
 * the sort. Changing the search or the sort returns to page 1, so a shorter
 * result never leaves the table on a page that no longer exists.
 */
export function useListControls(defaultSort: string): ListControls {
  const [search, setSearchValue] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: string; direction: SortDirection }>({
    key: defaultSort,
    direction: 'asc',
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setQ((current) => {
        if (current === search) return current;
        setPage(1);
        return search;
      });
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [search]);

  return {
    search,
    setSearch: setSearchValue,
    q,
    page,
    setPage,
    sort,
    toggleSort: (key) => {
      setPage(1);
      setSort((current) =>
        current.key === key
          ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
          : { key, direction: 'asc' },
      );
    },
    sortParam: sort.direction === 'desc' ? `-${sort.key}` : sort.key,
    resetPage: () => setPage(1),
  };
}
