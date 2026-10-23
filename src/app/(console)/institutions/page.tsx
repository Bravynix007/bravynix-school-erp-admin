import type { Metadata } from 'next';
import { ComingSoon } from '@/components/shell/coming-soon';

export const metadata: Metadata = { title: 'Institutions' };

export default function InstitutionsPage() {
  return <ComingSoon title="Institutions" phase="phase 1 (login and tenancy)" />;
}
