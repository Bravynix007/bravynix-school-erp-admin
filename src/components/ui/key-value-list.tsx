import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface KeyValueItem {
  label: string;
  value: ReactNode;
}

/** Label above value, two columns from the small breakpoint; values wrap, never truncate. */
export function KeyValueList({ items, className }: { items: KeyValueItem[]; className?: string }) {
  return (
    <dl className={cn('grid gap-x-8 gap-y-4 sm:grid-cols-2', className)}>
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-caption text-ink-secondary">{item.label}</dt>
          <dd className="mt-0.5 text-body break-words text-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
