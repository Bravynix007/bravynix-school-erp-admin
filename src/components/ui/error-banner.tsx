import type { ReactNode } from 'react';
import { IconAlertTriangle, IconX } from '@tabler/icons-react';
import { cn } from '@/lib/cn';
import { Mono } from './mono';

/** The stable API error code in mono, so support can quote it (API design 8). */
export function CodeTag({ code }: { code: string }) {
  return (
    <Mono className="inline-block rounded-sm bg-surface/70 px-1.5 text-caption text-ink-secondary">
      {code}
    </Mono>
  );
}

/**
 * A server error or a conflict in plain words, with the code tag and request
 * ID for support and one action ("Reload", "Retry"). Errors are announced at
 * once; a conflict is a warning (DESIGN.md 12, 16).
 */
export function ErrorBanner({
  tone = 'error',
  message,
  code,
  requestId,
  action,
}: {
  tone?: 'error' | 'warning';
  message: string;
  code?: string;
  requestId?: string;
  action?: ReactNode;
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md px-4 py-3 text-body',
        tone === 'error' ? 'bg-error-bg text-error' : 'bg-warning-bg text-warning',
      )}
    >
      {tone === 'error' ? (
        <IconX size={18} aria-hidden="true" className="shrink-0" />
      ) : (
        <IconAlertTriangle size={18} aria-hidden="true" className="shrink-0" />
      )}
      <div className="min-w-0 flex-1 text-ink">
        <p>{message}</p>
        {code || requestId ? (
          <p className="mt-1 flex flex-wrap items-center gap-2 text-caption text-ink-secondary">
            {code ? <CodeTag code={code} /> : null}
            {requestId ? (
              <span>
                Request ID <Mono>{requestId}</Mono>
              </span>
            ) : null}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
