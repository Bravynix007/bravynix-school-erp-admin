import type { Metadata } from 'next';
import { Suspense } from 'react';
import { FullPageSpinner } from '@/components/shell/full-page-spinner';
import { InstitutionsList } from '@/features/institutions/institutions-list';

export const metadata: Metadata = { title: 'Institutions' };

/** The list reads its page, search and sort from the URL, which a static export needs a Suspense boundary for. */
export default function InstitutionsPage() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <InstitutionsList />
    </Suspense>
  );
}
