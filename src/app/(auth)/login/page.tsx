'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { LoginFlow } from '@/features/auth/login-flow';
import { useSession } from '@/lib/auth/session';

export default function LoginPage() {
  const { state } = useSession();
  const router = useRouter();

  useEffect(() => {
    document.title = 'Sign in · BravyNix Console';
  }, []);

  useEffect(() => {
    if (state.status === 'signed-in') router.replace('/dashboard');
  }, [state.status, router]);

  if (state.status === 'checking' || state.status === 'signed-in') {
    return (
      <div role="status" className="flex h-40 items-center justify-center text-primary">
        <Spinner size={24} />
        <span className="sr-only">Checking your session</span>
      </div>
    );
  }
  return <LoginFlow />;
}
