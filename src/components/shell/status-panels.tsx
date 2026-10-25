import type { Route } from 'next';
import Link from 'next/link';
import { EmptyState } from '@/components/ui/empty-state';

const linkClass = 'text-label font-medium text-primary underline-offset-2 hover:underline';

/** 403: a full-panel message with a way out (DESIGN.md 16). */
export function AccessDenied() {
  return (
    <EmptyState
      title="You don't have access to this"
      description="Ask another Super Admin if you think you should."
      action={
        <Link href="/dashboard" className={linkClass}>
          Go to the dashboard
        </Link>
      }
    />
  );
}

/** 404 for a record that was removed or deactivated (DESIGN.md 16). */
export function RecordNotFound({ listHref, listLabel }: { listHref: Route; listLabel: string }) {
  return (
    <EmptyState
      title="This record no longer exists or was deactivated"
      description="It may have been removed since the link was shared."
      action={
        <Link href={listHref} className={linkClass}>
          Back to {listLabel}
        </Link>
      }
    />
  );
}
