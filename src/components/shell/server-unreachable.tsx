'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useSession } from '@/lib/auth/session';
import { formatCountdown, useCountdown } from '@/lib/hooks/use-countdown';

/**
 * Shown when the session check got no usable answer: offline, a timeout, a
 * 5xx or a 429. Nothing is signed out, since the refresh cookie may still be
 * good, so "Try again" asks once more, after `Retry-After` when the API sent
 * one (API design 8.2).
 */
export function ServerUnreachable({ retryAfterSeconds }: { retryAfterSeconds: number | null }) {
  const { retry } = useSession();
  const [until] = useState(() => (retryAfterSeconds ? Date.now() + retryAfterSeconds * 1000 : null));
  const wait = useCountdown(until);
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div role="alert" className="w-full max-w-md rounded-xl border border-line bg-surface p-8 shadow-lg">
        <h1 className="text-h2 font-semibold">Can&apos;t reach the server</h1>
        <p className="mt-2 text-body text-ink-secondary">
          We couldn&apos;t check your sign-in. Check your connection and try again.
        </p>
        <Button className="mt-6 w-full" onClick={retry} disabled={wait > 0}>
          {wait > 0 ? `Try again in ${formatCountdown(wait)}` : 'Try again'}
        </Button>
      </div>
    </main>
  );
}
