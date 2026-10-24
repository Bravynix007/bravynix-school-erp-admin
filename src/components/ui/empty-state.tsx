import type { ReactNode } from 'react';

/** Line illustration ≤120 px, h3 title, one caption line, primary action (DESIGN.md 9). */
export function EmptyState({
  title,
  description,
  illustration,
  action,
}: {
  title: string;
  description: string;
  illustration?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-line bg-surface px-6 py-16 text-center">
      {illustration ? <div className="mb-4 text-line-strong">{illustration}</div> : null}
      <h2 className="text-h3 font-semibold">{title}</h2>
      <p className="mt-1 max-w-[640px] text-caption text-ink-secondary">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
