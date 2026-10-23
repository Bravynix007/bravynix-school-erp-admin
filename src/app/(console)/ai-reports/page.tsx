import type { Metadata } from 'next';
import { ComingSoon } from '@/components/shell/coming-soon';

export const metadata: Metadata = { title: 'AI reports' };

export default function AiReportsPage() {
  return <ComingSoon title="AI reports" phase="phase 9 (AI assistant)" />;
}
