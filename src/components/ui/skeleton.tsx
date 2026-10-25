import { cn } from '@/lib/cn';

/** A Paper 200 bar that shimmers for 1.2 s; still when the person asks for less motion (DESIGN.md 9, 16). */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('skeleton h-4 rounded-sm bg-sunken', className)} />;
}

/** Bars shaped like the final table, announced once as loading. */
export function TableSkeleton({ columns, rows = 8 }: { columns: number; rows?: number }) {
  return (
    <div role="status" aria-busy="true" className="rounded-lg border border-line bg-surface">
      <span className="sr-only">Loading</span>
      <div className="flex gap-6 border-b border-line bg-sunken px-4 py-3">
        {Array.from({ length: columns }, (_, c) => (
          <Skeleton key={c} className="h-3 flex-1 bg-line" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex gap-6 border-b border-line px-4 py-4 last:border-b-0">
          {Array.from({ length: columns }, (_, c) => (
            <Skeleton key={c} className={cn('flex-1', c === 0 && 'max-w-56')} />
          ))}
        </div>
      ))}
    </div>
  );
}
