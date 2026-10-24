'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { FullPageSpinner } from '@/components/shell/full-page-spinner';
import { ServerUnreachable } from '@/components/shell/server-unreachable';
import { useSession } from '@/lib/auth/session';

/** `/` sends the operator to the dashboard or to sign-in. */
export default function IndexPage() {
  const { state } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (state.status === 'signed-in') router.replace('/dashboard');
    if (state.status === 'signed-out' || state.status === 'ended') router.replace('/login');
  }, [state.status, router]);
  return state.status === 'unreachable' ? (
    <ServerUnreachable retryAfterSeconds={state.retryAfterSeconds} />
  ) : (
    <FullPageSpinner />
  );
}
