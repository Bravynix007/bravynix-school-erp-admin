import { Button } from '@/components/ui/button';
import { ErrorBanner } from '@/components/ui/error-banner';
import { ApiError } from '@/lib/api/api-error';
import { apiErrorMessage, isStale } from '@/lib/api/error-copy';

/**
 * A write that failed, shown inside the dialog or form that made it. A version
 * conflict or a changed state offers Reload (DESIGN.md 16); every error carries its code and request ID.
 */
export function WriteError({
  error,
  onReload,
  overrides,
}: {
  error: unknown;
  onReload?: () => void;
  overrides?: Record<string, string>;
}) {
  return (
    <ErrorBanner
      message={apiErrorMessage(error, overrides)}
      code={error instanceof ApiError ? error.code : undefined}
      requestId={error instanceof ApiError ? (error.requestId ?? undefined) : undefined}
      action={
        isStale(error) && onReload ? (
          <Button variant="secondary" size="sm" onClick={onReload}>
            Reload
          </Button>
        ) : undefined
      }
    />
  );
}
