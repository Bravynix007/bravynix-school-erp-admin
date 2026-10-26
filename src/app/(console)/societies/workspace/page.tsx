import type { Metadata } from 'next';
import { Suspense } from 'react';
import { FullPageSpinner } from '@/components/shell/full-page-spinner';
import { SocietyWorkspace } from '@/features/societies/society-workspace';

export const metadata: Metadata = { title: 'Society' };

// `useSearchParams` needs a Suspense boundary in a static export.
export default function SocietyWorkspacePage() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <SocietyWorkspace />
    </Suspense>
  );
}
