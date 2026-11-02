import type { Metadata } from 'next';
import { Suspense } from 'react';
import { FullPageSpinner } from '@/components/shell/full-page-spinner';
import { InstitutionWorkspace } from '@/features/institutions/institution-workspace';

export const metadata: Metadata = { title: 'Institution' };

// `useSearchParams` needs a Suspense boundary in a static export.
export default function InstitutionWorkspacePage() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <InstitutionWorkspace />
    </Suspense>
  );
}
