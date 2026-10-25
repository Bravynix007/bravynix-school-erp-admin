'use client';

import { IconWifiOff } from '@tabler/icons-react';
import { useSyncExternalStore } from 'react';

function subscribe(onChange: () => void): () => void {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

/** Whether the browser says it has a network. The server render assumes it does. */
export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}

/** Top inline band while offline (DESIGN.md 16). Nothing is drawn when online. */
export function OfflineBand() {
  const online = useOnline();
  if (online) return null;
  return (
    <div role="status" className="flex items-center gap-3 bg-warning-bg px-4 py-2 text-body text-ink">
      <IconWifiOff size={18} aria-hidden="true" className="shrink-0 text-warning" />
      You&apos;re offline. Changes can&apos;t be saved.
    </div>
  );
}
