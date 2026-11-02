import type { Metadata } from 'next';
import { Suspense } from 'react';
import { FullPageSpinner } from '@/components/shell/full-page-spinner';
import { DuesLedger } from '@/features/billing/dues-ledger';

export const metadata: Metadata = { title: 'Dues and pricing' };

/** The ledger reads its page, search, sort and open due from the URL, which a static export needs a Suspense boundary for. */
export default function DuesPage() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <DuesLedger />
    </Suspense>
  );
}
