/** First stop for keyboard users: jumps past the sidebar to `main#content` (DESIGN.md 16). */
export function SkipLink() {
  return (
    <a
      href="#content"
      className="sr-only rounded-md bg-surface px-4 py-2 text-label font-medium text-ink shadow-md focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
    >
      Skip to content
    </a>
  );
}
