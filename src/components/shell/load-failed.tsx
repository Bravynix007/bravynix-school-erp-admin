import type { Route } from 'next';
import { ErrorBanner } from '@/components/ui/error-banner';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api/api-error';
import { apiErrorMessage } from '@/lib/api/error-copy';
import { AccessDenied, RecordNotFound } from './status-panels';

/**
 * A read that failed, in the state DESIGN.md 16 gives it: 403 is a panel with a
 * way out, 404 says the record is gone, anything else is a banner with the
 * code, the request ID and Try again.
 */
export function LoadFailed({
  error,
  onRetry,
  list,
}: {
  error: unknown;
  onRetry: () => void;
  /** Where "Back to" goes on a 404. */
  list: { href: Route; label: string };
}) {
  if (error instanceof ApiError && error.status === 403) return <AccessDenied />;
  if (error instanceof ApiError && error.status === 404) {
    return <RecordNotFound listHref={list.href} listLabel={list.label} />;
  }
  return (
    <ErrorBanner
      message={apiErrorMessage(error)}
      code={error instanceof ApiError ? error.code : undefined}
      requestId={error instanceof ApiError ? (error.requestId ?? undefined) : undefined}
      action={
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      }
    />
  );
}
