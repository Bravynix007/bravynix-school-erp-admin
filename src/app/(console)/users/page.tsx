import type { Metadata } from 'next';
import { Suspense } from 'react';
import { FullPageSpinner } from '@/components/shell/full-page-spinner';
import { UsersPage } from '@/features/users/users-page';

export const metadata: Metadata = { title: 'Users' };

// `useSearchParams` needs a Suspense boundary in a static export.
export default function Page() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <UsersPage />
    </Suspense>
  );
}
