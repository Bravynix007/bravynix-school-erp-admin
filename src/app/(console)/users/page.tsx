import type { Metadata } from 'next';
import { ComingSoon } from '@/components/shell/coming-soon';

export const metadata: Metadata = { title: 'Users' };

export default function UsersPage() {
  return <ComingSoon title="Users" phase="phase 1 (Super Admins) and phase 4 (all users)" />;
}
