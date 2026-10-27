import { useEffect, useRef } from 'react';

/**
 * When the open person leaves the loaded list (removed, or no longer matching the search), the sheet goes with
 * their row. This lets go of them in the URL, so the sheet does not come back on its own later, and moves focus
 * to the list, since the row the sheet would return focus to is gone (DESIGN.md 15). Returns the list's ref.
 */
export function useLostSelection({
  selected,
  found,
  settled,
  clear,
}: {
  /** Whom the URL names, or '' for nobody. */
  selected: string;
  found: boolean;
  /** The list has loaded and is not refetching. */
  settled: boolean;
  clear: () => void;
}) {
  const list = useRef<HTMLDivElement>(null);
  const shown = useRef(false);
  useEffect(() => {
    if (!selected) {
      shown.current = false;
      return;
    }
    if (found) {
      shown.current = true;
      return;
    }
    if (!settled || !shown.current) return;
    shown.current = false;
    clear();
    list.current?.focus();
  }, [selected, found, settled, clear]);
  return list;
}
