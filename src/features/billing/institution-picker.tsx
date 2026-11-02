'use client';

import { useEffect, useState } from 'react';
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
  useEffect(() => {
    const timer = setTimeout(() => setQ(typed.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [typed]);
  const searching = value === null && q.length >= 2;
  const results = useInstitutionList({
    page: 1,
    limit: RESULTS,
    sort: 'name',
    q: searching ? q : '',
    status: 'active',
    blocked: '',
  });

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
              variant="secondary"
              size="sm"
              aria-label={`Change Institution, now ${value.name}`}
              onClick={() => onChange(null)}
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
        ) : results.data.items.length === 0 ? (
          <p className="text-caption text-ink-secondary">No active Institution matches “{q}”.</p>
        ) : (
          <ul
            aria-label="Institutions found"
            className="divide-y divide-line-subtle rounded-lg border border-line bg-surface"
          >
            {results.data.items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onChange({ id: item.id, name: item.name, societyName: item.societyName })}
                  className="flex w-full flex-col px-4 py-2.5 text-left hover:bg-row-hover"
                >
                  <span className="font-medium">
                    {item.name} <Mono className="text-caption text-ink-secondary">{item.code}</Mono>
                  </span>
                  <span className="text-caption text-ink-secondary">{item.societyName}</span>
                </button>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
