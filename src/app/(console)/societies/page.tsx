import type { Metadata } from 'next';
import { ComingSoon } from '@/components/shell/coming-soon';

export const metadata: Metadata = { title: 'Societies' };

export default function SocietiesPage() {
  return <ComingSoon title="Societies" phase="phase 1 (login and tenancy)" />;
}
