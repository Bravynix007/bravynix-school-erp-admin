'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import type { SessionEndReason } from '@/lib/auth/session';

const copy: Record<SessionEndReason, string> = {
  expired: 'Your session ended after 12 hours.',
  signed_out_elsewhere: 'You were signed out from another device.',
  blocked: 'This account is blocked.',
  unknown: 'Your session has ended.',
};

/** Full-screen card with the reason and "Sign in again" (DESIGN.md 16). */
export function SessionEnded({ reason }: { reason: SessionEndReason }) {
  const router = useRouter();
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border border-line bg-surface p-8 shadow-lg">
        <h1 className="text-h2 font-semibold">Session ended</h1>
        <p className="mt-2 text-body text-ink-secondary">{copy[reason]}</p>
        <Button className="mt-6 w-full" onClick={() => router.replace('/login')}>
          Sign in again
        </Button>
      </div>
    </main>
  );
}
