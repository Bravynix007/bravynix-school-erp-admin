import type { Metadata } from 'next';
import { ComingSoon } from '@/components/shell/coming-soon';

export const metadata: Metadata = { title: 'Dues and pricing' };

export default function DuesPage() {
  return <ComingSoon title="Dues and pricing" phase="phase 2 (platform billing)" />;
}
