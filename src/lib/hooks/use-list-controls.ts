'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { SortDirection } from '@/components/ui/data-table';
import { writeQuery } from './use-url-state';

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

/** `name` or `-name` as a sort. */
function parseSort(value: string | null, fallback: string): { key: string; direction: SortDirection } {
  const text = value && value !== '-' ? value : fallback;
  return text.startsWith('-') ? { key: text.slice(1), direction: 'desc' } : { key: text, direction: 'asc' };
}

/**
 * The state every page-mode list shares: a debounced search, the page, and the sort. Changing the search or
 * the sort returns to page 1, so a shorter result never leaves the table on a page that no longer exists.
 * The search, page and sort start from the URL and are written back to it, so a refresh or a shared link
 * opens the same list (DESIGN.md 13).
 */
export function useListControls(defaultSort: string): ListControls {
  const params = useSearchParams();
  const startPage = Number(params.get('page'));
  const [search, setSearchValue] = useState(params.get('q') ?? '');
  const [q, setQ] = useState(search);
  const [page, setPage] = useState(Number.isInteger(startPage) && startPage > 1 ? startPage : 1);
  const [sort, setSort] = useState(() => parseSort(params.get('sort'), defaultSort));

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search === q) return;
      setQ(search);
      setPage(1);
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [search, q]);

  const sortParam = sort.direction === 'desc' ? `-${sort.key}` : sort.key;
  useEffect(() => {
    writeQuery({
      q,
      page: page > 1 ? String(page) : null,
      sort: sortParam === defaultSort ? null : sortParam,
    });
  }, [q, page, sortParam, defaultSort]);

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
    sortParam,
    resetPage: () => setPage(1),
  };
}
