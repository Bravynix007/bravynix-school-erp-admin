'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';

/**
 * Mirrors state into the address bar, so a refresh or a shared link opens the same tab, page or search
 * (DESIGN.md 13). A value that is empty is left out of the URL. It replaces the history entry, so Back
 * still leaves the screen; the console is a static export, so the query is all the server never sees.
 */
export function writeQuery(patch: Record<string, string | null>): void {
  const params = new URLSearchParams(window.location.search);
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === '') params.delete(key);
    else params.set(key, value);
  }
  const query = params.toString();
  window.history.replaceState(
    window.history.state,
    '',
    `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`,
  );
}

/**
 * One query parameter as state. It is read once, when the screen opens; after that the state is the source
 * and the URL follows it. `isValid` guards against a hand-edited value, which falls back to `fallback`.
 */
export function useUrlState(
  key: string,
  fallback: string,
  isValid: (value: string) => boolean = () => true,
): [string, (value: string) => void] {
  const initial = useSearchParams().get(key);
  const [value, setValue] = useState(initial !== null && isValid(initial) ? initial : fallback);
  const set = useCallback(
    (next: string) => {
      setValue(next);
      writeQuery({ [key]: next === fallback ? null : next });
    },
    [key, fallback],
  );
  return [value, set];
}
