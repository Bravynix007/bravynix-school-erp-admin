import type { Metadata } from 'next';
import { Suspense } from 'react';
import { FullPageSpinner } from '@/components/shell/full-page-spinner';
import { SocietiesList } from '@/features/societies/societies-list';

export const metadata: Metadata = { title: 'Societies' };

/** The list reads its page, search and sort from the URL, which a static export needs a Suspense boundary for. */
export default function SocietiesPage() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <SocietiesList />
    </Suspense>
  );
}
