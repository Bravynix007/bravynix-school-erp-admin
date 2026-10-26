import type { Metadata } from 'next';
import { Suspense } from 'react';
import { FullPageSpinner } from '@/components/shell/full-page-spinner';
import { EditSociety } from '@/features/societies/edit-society';

export const metadata: Metadata = { title: 'Edit Society' };

export default function EditSocietyPage() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <EditSociety />
    </Suspense>
  );
}
