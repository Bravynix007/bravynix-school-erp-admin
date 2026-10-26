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

/** The callbacks a mutation takes: what `mutate(variables, settled)` needs. */
export interface Settled<T> {
  onSuccess: (data: T) => void;
  onError: () => void;
}

/**
 * For a write whose screen stays open after it succeeds (a dialog that closes, a sheet that remains): one at a
 * time, released when it ends either way. `send` starts the mutation with the callbacks it is given.
 */
export function useGuardedWrite(): <T>(send: (settled: Settled<T>) => void, done: (data: T) => void) => void {
  const oneAtATime = useOneAtATime();
  return useCallback(
    (send, done) =>
      oneAtATime((release) =>
        send({
          onSuccess: (data) => {
            release();
            done(data);
          },
          onError: release,
        }),
      ),
    [oneAtATime],
  );
}
