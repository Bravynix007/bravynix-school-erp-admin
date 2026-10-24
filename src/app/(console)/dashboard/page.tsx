import type { Metadata } from 'next';
import { ComingSoon } from '@/components/shell/coming-soon';

export const metadata: Metadata = { title: 'Dashboard' };

export default function DashboardPage() {
  return <ComingSoon title="Dashboard" phase="phase 2 (platform billing)" />;
}
