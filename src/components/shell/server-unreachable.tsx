'use client';

import { Button } from '@/components/ui/button';
import { useSession } from '@/lib/auth/session';

/**
 * Shown when the session check could not reach the API. Nothing is signed
 * out: the refresh cookie may still be good, so "Try again" asks once more
 * (API design 8.2).
 */
export function ServerUnreachable() {
  const { retry } = useSession();
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div role="alert" className="w-full max-w-md rounded-xl border border-line bg-surface p-8 shadow-lg">
        <h1 className="text-h2 font-semibold">Can&apos;t reach the server</h1>
        <p className="mt-2 text-body text-ink-secondary">
          Check your connection and try again. You are still signed in.
        </p>
        <Button className="mt-6 w-full" onClick={retry}>
          Try again
        </Button>
      </div>
    </main>
  );
}
