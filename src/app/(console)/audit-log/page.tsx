import type { Metadata } from 'next';
import { ComingSoon } from '@/components/shell/coming-soon';

export const metadata: Metadata = { title: 'Audit log' };

export default function AuditLogPage() {
  return <ComingSoon title="Audit log" phase="phase 8 (engagement)" />;
}
