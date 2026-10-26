import type { Metadata } from 'next';
import { SocietiesList } from '@/features/societies/societies-list';

export const metadata: Metadata = { title: 'Societies' };

export default function SocietiesPage() {
  return <SocietiesList />;
}
