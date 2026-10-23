import type { Route } from 'next';
import {
  IconBuildingCommunity,
  IconLayoutDashboard,
  IconListDetails,
  IconReceipt2,
  IconSchool,
  IconShieldCheck,
  IconUsers,
  IconHistory,
  type Icon,
} from '@tabler/icons-react';

export interface NavItem {
  label: string;
  href: Route;
  icon: Icon;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

/** The sidebar: the only global navigation, 8 destinations (DESIGN.md 9, 13). */
export const navigation: NavGroup[] = [
  {
    title: 'Overview',
    items: [{ label: 'Dashboard', href: '/dashboard', icon: IconLayoutDashboard }],
  },
  {
    title: 'Tenants',
    items: [
      { label: 'Societies', href: '/societies', icon: IconBuildingCommunity },
      { label: 'Institutions', href: '/institutions', icon: IconSchool },
    ],
  },
  {
    title: 'Money',
    items: [{ label: 'Dues and pricing', href: '/dues', icon: IconReceipt2 }],
  },
  {
    title: 'Safety',
    items: [
      { label: 'AI reports', href: '/ai-reports', icon: IconShieldCheck },
      { label: 'Audit log', href: '/audit-log', icon: IconHistory },
    ],
  },
  {
    title: 'Platform',
    items: [
      { label: 'Users', href: '/users', icon: IconUsers },
      { label: 'Masters', href: '/masters', icon: IconListDetails },
    ],
  },
];
