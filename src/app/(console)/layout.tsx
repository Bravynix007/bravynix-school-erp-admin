'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { FullPageSpinner } from '@/components/shell/full-page-spinner';
import { SessionEnded } from '@/components/shell/session-ended';
import { Sidebar } from '@/components/shell/sidebar';
import { TopBar } from '@/components/shell/top-bar';
import { useSession } from '@/lib/auth/session';

/**
 * Every signed-in page. In a static export the route guard runs in the
 * browser; the API is the security boundary and answers 401 regardless.
 */
export default function ConsoleLayout({ children }: { children: ReactNode }) {
  const { state } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (state.status === 'signed-out') router.replace('/login');
  }, [state.status, router]);

  if (state.status === 'ended') return <SessionEnded reason={state.reason} />;
  if (state.status !== 'signed-in') return <FullPageSpinner />;

  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main id="content" className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 md:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
