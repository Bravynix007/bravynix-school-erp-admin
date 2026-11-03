import type { Metadata } from 'next';
import { Suspense } from 'react';
import { FullPageSpinner } from '@/components/shell/full-page-spinner';
import { MastersPage } from '@/features/masters/masters-page';

export const metadata: Metadata = { title: 'Masters' };

// `useSearchParams` needs a Suspense boundary in a static export.
export default function Page() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <MastersPage />
    </Suspense>
  );
}
