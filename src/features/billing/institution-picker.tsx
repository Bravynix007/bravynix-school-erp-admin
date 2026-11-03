'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mono } from '@/components/ui/mono';
import { Skeleton } from '@/components/ui/skeleton';
import { TextField } from '@/components/ui/text-field';
import { useInstitutionList } from '@/features/institutions/use-institutions';
import { SEARCH_DELAY_MS } from '@/lib/hooks/use-list-controls';

/** The Institution a due is raised for. */
export interface PickedInstitution {
  id: string;
  name: string;
  societyName: string;
}

const RESULTS = 8;

/**
 * Finds an active Institution by name or code (PLT-19), because there can be hundreds: type two characters and pick
 * one. A chosen Institution shows with Change; `locked` shows it without Change, when the form was opened from it.
 */
export function InstitutionPicker({
  value,
  onChange,
  locked = false,
  error,
}: {
  value: PickedInstitution | null;
  onChange: (value: PickedInstitution | null) => void;
  locked?: boolean;
  error?: string;
}) {
  const [typed, setTyped] = useState('');
  const [q, setQ] = useState('');
  // The control the user was on is replaced by the next one, so focus follows: Change after a pick, the search
  // field after Change.
  const change = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const moved = useRef(false);
  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    (value === null ? search : change).current?.focus();
  }, [value]);
  const choose = (next: PickedInstitution | null) => {
    moved.current = true;
    onChange(next);
  };
  useEffect(() => {
    const timer = setTimeout(() => setQ(typed.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [typed]);
  const searching = value === null && q.length >= 2;
  const results = useInstitutionList(
    { page: 1, limit: RESULTS, sort: 'name', q, status: 'active', blocked: '' },
    searching,
  );
  // An Institution of a deactivated Society takes no due (the API refuses it), so it is not offered.
  const offered = results.data?.items.filter((item) => item.societyStatus === 1) ?? [];

  if (value !== null) {
    return (
      <div className="flex flex-col gap-1.5">
        <p className="text-label font-medium text-ink">Institution</p>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-sunken px-4 py-3">
          <div className="min-w-0">
            <p className="font-medium break-words">{value.name}</p>
            <p className="text-caption text-ink-secondary">{value.societyName}</p>
          </div>
          {locked ? null : (
            <Button
              ref={change}
              variant="secondary"
              size="sm"
              aria-label={`Change Institution, now ${value.name}`}
              onClick={() => choose(null)}
            >
              Change
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <TextField
        ref={search}
        label="Institution"
        requiredMark
        autoComplete="off"
        placeholder="Search by name or code"
        hint="Type at least two characters."
        value={typed}
        onChange={(event) => setTyped(event.target.value)}
        error={error}
      />
      {searching ? (
        results.isPending || results.isPlaceholderData ? (
          <Skeleton className="h-16 w-full" />
        ) : results.isError ? (
          <p role="alert" className="text-caption text-error">
            The Institutions could not be loaded. Change the search to try again.
          </p>
        ) : offered.length === 0 ? (
          <p className="text-caption text-ink-secondary">
            {results.data.meta.totalItems > results.data.items.length
              ? `The first matches for “${q}” are Institutions of deactivated Societies. Type more of the name or code.`
              : `No active Institution matches “${q}”.`}
          </p>
        ) : (
          <ul
            aria-label="Institutions found"
            className="divide-y divide-line-subtle rounded-lg border border-line bg-surface"
          >
            {offered.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => choose({ id: item.id, name: item.name, societyName: item.societyName })}
                  className="flex w-full flex-col px-4 py-2.5 text-left hover:bg-row-hover"
                >
                  <span className="font-medium">
                    {item.name} <Mono className="text-caption text-ink-secondary">{item.code}</Mono>
                  </span>
                  <span className="text-caption text-ink-secondary">{item.societyName}</span>
                </button>
              </li>
            ))}
            {results.data.meta.totalItems > results.data.items.length ? (
              <li className="px-4 py-2.5 text-caption text-ink-secondary">
                More Institutions match. Type more of the name or code to find one not listed.
              </li>
            ) : null}
          </ul>
        )
      ) : null}
    </div>
  );
}
