import type { ReactNode } from 'react';

/** Breadcrumb → h1 + status → meta → actions on the right (DESIGN.md 8). */
export function PageHeader({
  title,
  breadcrumb,
  meta,
  status,
  actions,
}: {
  title: string;
  breadcrumb?: ReactNode;
  meta?: ReactNode;
  status?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        {breadcrumb ? <div className="mb-1 text-caption text-ink-tertiary">{breadcrumb}</div> : null}
        <div className="flex items-center gap-3">
          <h1 className="text-h1 font-semibold tracking-[-0.005em]">{title}</h1>
          {status}
        </div>
        {meta ? <div className="mt-1 text-caption text-ink-secondary">{meta}</div> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
