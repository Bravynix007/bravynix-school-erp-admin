import { useEffect, type RefObject } from 'react';
import { readShortcutsEnabled } from '@/lib/shortcuts';

type SearchRef = RefObject<HTMLInputElement | null>;

const searches: SearchRef[] = [];
let installed = false;

function onKeyDown(event: KeyboardEvent): void {
  if (event.defaultPrevented || event.altKey) return;
  const modified = event.ctrlKey || event.metaKey;
  const slash = event.key === '/' && !modified;
  const palette = modified && !event.shiftKey && event.key.toLowerCase() === 'k';
  if (!slash && !palette) return;
  // A shortcut with Ctrl or ⌘ is not a single-key shortcut (WCAG 2.1.4); "/" can be switched off.
  if (slash && !readShortcutsEnabled()) return;
  // Behind a modal the page is inert; do not pull focus out of it.
  if (document.querySelector('dialog[open], [aria-modal="true"]')) return;
  if (
    slash &&
    (event.target as HTMLElement | null)?.closest('input,textarea,select,[contenteditable="true"]')
  )
    return;
  const target = searches.map((ref) => ref.current).find((el) => el?.isConnected);
  if (!target) return;
  event.preventDefault();
  target.focus();
  target.select();
}

/**
 * "/" (or Ctrl/⌘ + K) focuses the page's search box. One listener serves the
 * page; with several search boxes the first one mounted answers.
 */
export function useSearchShortcut(ref: SearchRef): void {
  useEffect(() => {
    searches.push(ref);
    if (!installed) {
      document.addEventListener('keydown', onKeyDown);
      installed = true;
    }
    return () => {
      searches.splice(searches.indexOf(ref), 1);
      if (searches.length === 0) {
        document.removeEventListener('keydown', onKeyDown);
        installed = false;
      }
    };
  }, [ref]);
}
