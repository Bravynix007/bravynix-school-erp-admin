import type { Metadata } from 'next';
import { PlatformDashboardView } from '@/features/dashboard/platform-dashboard';

export const metadata: Metadata = { title: 'Dashboard' };

export default function DashboardPage() {
  return <PlatformDashboardView />;
}
