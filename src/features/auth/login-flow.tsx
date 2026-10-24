'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { LoginTokens } from '@/lib/auth/auth-api';
import { useSession } from '@/lib/auth/session';
import { CodeStep } from './code-step';
import { EmailStep } from './email-step';
import { MfaStep } from './mfa-step';

type Step =
  | { kind: 'email'; email: string }
  | { kind: 'code'; email: string; resendAt: number }
  | { kind: 'mfa'; email: string; mfaToken: string; enrolled: boolean };

/**
 * Email → 6-digit email code → authenticator code (API design 6.2). There
 * are no passwords anywhere (DESIGN.md 18). The steps live in component
 * state, so a reload starts again at the email, as the 5-minute MFA token
 * should not outlive the page.
 */
export function LoginFlow() {
  const [step, setStep] = useState<Step>({ kind: 'email', email: '' });
  const { signedIn } = useSession();
  const router = useRouter();

  const finish = (tokens: LoginTokens) => {
    signedIn(tokens.accessToken);
    router.replace('/dashboard');
  };

  switch (step.kind) {
    case 'email':
      return (
        <EmailStep
          defaultEmail={step.email}
          onSent={(email, seconds) => setStep({ kind: 'code', email, resendAt: Date.now() + seconds * 1000 })}
        />
      );
    case 'code':
      return (
        <CodeStep
          email={step.email}
          resendAt={step.resendAt}
          onResent={(seconds) => setStep({ ...step, resendAt: Date.now() + seconds * 1000 })}
          onChangeEmail={() => setStep({ kind: 'email', email: step.email })}
          onMfa={(challenge) =>
            setStep({
              kind: 'mfa',
              email: step.email,
              mfaToken: challenge.mfaToken,
              enrolled: challenge.mfaEnrolled,
            })
          }
          onTokens={finish}
        />
      );
    case 'mfa':
      return (
        <MfaStep
          mfaToken={step.mfaToken}
          enrolled={step.enrolled}
          onTokens={finish}
          onRestart={() => setStep({ kind: 'email', email: step.email })}
        />
      );
  }
}
