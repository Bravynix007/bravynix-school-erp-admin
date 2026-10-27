import type { Metadata } from 'next';
import { OnboardSociety } from '@/features/societies/onboard-society';

export const metadata: Metadata = { title: 'Onboard Society' };

export default function OnboardSocietyPage() {
  return <OnboardSociety />;
}
