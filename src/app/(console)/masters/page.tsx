import type { Metadata } from 'next';
import { ComingSoon } from '@/components/shell/coming-soon';

export const metadata: Metadata = { title: 'Masters' };

export default function MastersPage() {
  return <ComingSoon title="Masters" phase="phase 3 (academic setup)" />;
}
