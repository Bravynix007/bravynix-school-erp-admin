'use client';

import { useRef } from 'react';
import { IconSearch, IconX } from '@tabler/icons-react';
import { cn } from '@/lib/cn';
import { useSearchShortcut } from '@/lib/hooks/use-search-shortcut';
import { useShortcutsEnabled } from '@/lib/shortcuts';
import { Button } from './button';
import type { SelectOption } from './select';
import { TextField } from './text-field';

export interface FilterDef {
  key: string;
  /** "Status"; also the first, empty row of the list. */
  label: string;
  options: SelectOption[];
  /** "" means no filter. */
  value: string;
  onChange: (value: string) => void;
}

/**
 * Above a table: search (320 px, press "/" to jump to it), filter chips,
 * applied filters as removable chips, Clear, and the result count at right
 * (DESIGN.md 9). The count is a polite live region so a filtered list is announced.
 */
export function FilterBar({
  searchLabel,
  searchPlaceholder,
  search,
  onSearchChange,
  filters,
  countLabel,
}: {
  searchLabel: string;
  searchPlaceholder?: string;
  search: string;
  onSearchChange: (value: string) => void;
  filters: FilterDef[];
  /** "142 Institutions". */
  countLabel: string;
}) {
  const searchRef = useRef<HTMLInputElement>(null);

  useSearchShortcut(searchRef);
  const shortcuts = useShortcutsEnabled();

  const applied = filters
    .filter((f) => f.value !== '')
    .map((f) => ({ filter: f, text: f.options.find((o) => o.value === f.value)?.label ?? f.value }));
  const anyApplied = applied.length > 0 || search !== '';

  function clear() {
    onSearchChange('');
    for (const f of filters) f.onChange('');
    // The Clear button disappears with the filters, so focus moves to the search box (WCAG 2.4.3).
    searchRef.current?.focus();
  }

  return (
    <div className="mb-3 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <TextField
          ref={searchRef}
          label={searchLabel}
          hideLabel
          type="search"
          placeholder={searchPlaceholder ?? (shortcuts ? `${searchLabel} (press /)` : searchLabel)}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          prefix={<IconSearch size={16} aria-hidden="true" />}
          className="w-full md:w-80"
        />
        {filters.map((f) => (
          <label
            key={f.key}
            className={cn(
              'relative inline-flex h-10 items-center rounded-md border bg-surface text-label font-medium text-ink',
              'focus-within:border-focus focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus',
              f.value ? 'border-primary' : 'border-field hover:border-ink-secondary',
            )}
          >
            <select
              aria-label={f.label}
              value={f.value}
              onChange={(event) => f.onChange(event.target.value)}
              className="h-full cursor-pointer appearance-none rounded-md bg-transparent pr-3 pl-3 outline-none"
            >
              <option value="">{f.label}</option>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        ))}
        {anyApplied ? (
          <Button variant="tertiary" size="sm" onClick={clear}>
            Clear
          </Button>
        ) : null}
        <p role="status" className="ml-auto text-caption text-ink-secondary tabular">
          {countLabel}
        </p>
      </div>
      {applied.length > 0 ? (
        <ul aria-label="Applied filters" className="flex flex-wrap gap-2">
          {applied.map(({ filter, text }) => (
            <li key={filter.key}>
              <button
                type="button"
                onClick={() => {
                  filter.onChange('');
                  // This chip goes away; keep focus in the bar instead of dropping it to the page.
                  searchRef.current?.focus();
                }}
                aria-label={`Remove filter ${filter.label}: ${text}`}
                className="inline-flex h-7 items-center gap-1.5 rounded-full bg-primary-tint px-3 text-caption font-medium text-primary hover:brightness-95"
              >
                {filter.label}: {text}
                <IconX size={12} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
