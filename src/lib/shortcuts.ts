import { useSyncExternalStore } from 'react';

const KEY = 'console.singleKeyShortcuts';
const listeners = new Set<() => void>();

/**
 * Single-key shortcuts such as "/" must be switchable off (WCAG 2.1.4). The
 * choice is per person and per browser; the default is on. A browser that
 * blocks storage simply keeps them on.
 */
export function readShortcutsEnabled(): boolean {
  try {
    return window.localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setShortcutsEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(KEY, enabled ? 'on' : 'off');
  } catch {
    /* storage blocked: the change lasts until the page reloads */
  }
  for (const listener of listeners) listener();
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  // Another tab changed it.
  window.addEventListener('storage', onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('storage', onChange);
  };
}

export function useShortcutsEnabled(): boolean {
  return useSyncExternalStore(subscribe, readShortcutsEnabled, () => true);
}
