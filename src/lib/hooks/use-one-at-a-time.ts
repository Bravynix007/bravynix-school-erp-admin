import { useCallback, useRef } from 'react';

/**
 * Lets one write start at a time. The second click of a double click lands
 * before the re-render that disables the button, so `isPending` alone would
 * send the write twice. `run` gets `release`, to call when the write failed
 * and may be tried again; after a success the screen moves on and stays held.
 */
export function useOneAtATime(): (run: (release: () => void) => void) => void {
  const busy = useRef(false);
  return useCallback((run) => {
    if (busy.current) return;
    busy.current = true;
    run(() => {
      busy.current = false;
    });
  }, []);
}
