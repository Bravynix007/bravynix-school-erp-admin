'use client';

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { InlineAlert } from '@/components/ui/inline-alert';
import { OtpInput } from '@/components/ui/otp-input';
import { ApiError } from '@/lib/api/api-error';
import { authApi, isMfaChallenge, type LoginTokens, type MfaChallenge } from '@/lib/auth/auth-api';
import { formatCountdown, useCountdown } from '@/lib/hooks/use-countdown';
import { isLockedOut, isRestartError, loginErrorMessage, maskEmail } from './login-errors';
import { RestartPanel } from './restart-panel';

/** Screen 2: six digit boxes, Verify, resend timer, "Use a different email". */
export function CodeStep({
  email,
  resendAt,
  onResent,
  onChangeEmail,
  onMfa,
  onTokens,
}: {
  email: string;
  resendAt: number;
  onResent(resendAfterSeconds: number): void;
  onChangeEmail(): void;
  onMfa(challenge: MfaChallenge): void;
  onTokens(tokens: LoginTokens): void;
}) {
  const [code, setCode] = useState('');
  const secondsLeft = useCountdown(resendAt);

  const verify = useMutation({
    mutationFn: (value: string) => authApi.verifyOtp(email, value),
    onSuccess: (result) => (isMfaChallenge(result) ? onMfa(result) : onTokens(result)),
    onError: () => setCode(''),
  });

  const resend = useMutation({
    mutationFn: () => authApi.requestOtp(email),
    onSuccess: (result) => {
      verify.reset();
      setCode('');
      onResent(result.resendAfterSeconds);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.retryAfterSeconds) onResent(error.retryAfterSeconds);
    },
  });

  const error = verify.error ?? resend.error;
  const codeError =
    verify.error && !isRestartError(verify.error) ? loginErrorMessage(verify.error) : undefined;
  const bandError = error && !codeError ? loginErrorMessage(error) : null;

  // A locked email cannot be sent a new code, so there is nothing to type or resend: only a way back.
  // Either call may carry the lock.
  const locked = [verify.error, resend.error].find(isLockedOut);
  if (locked) {
    return <RestartPanel message={loginErrorMessage(locked)} onRestart={onChangeEmail} />;
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (code.length === 6) verify.mutate(code);
      }}
    >
      <div>
        <h1 className="text-h2 font-semibold">Check your email</h1>
        <p className="mt-1 text-body text-ink-secondary">
          Enter the 6-digit code sent to <span className="font-medium text-ink">{maskEmail(email)}</span>
        </p>
      </div>
      {bandError ? <InlineAlert tone="error">{bandError}</InlineAlert> : null}
      <OtpInput
        label="Email code"
        value={code}
        onChange={setCode}
        onComplete={(value) => {
          if (!verify.isPending) verify.mutate(value);
        }}
        error={codeError}
        disabled={verify.isPending}
        autoFocus
      />
      <Button type="submit" loading={verify.isPending} disabled={code.length !== 6} className="w-full">
        Verify
      </Button>
      <div className="flex items-center justify-between text-caption">
        {secondsLeft > 0 ? (
          // Not a live region: a ticking timer is noise for screen readers (DESIGN.md 15).
          <span className="text-ink-tertiary tabular">Resend code in {formatCountdown(secondsLeft)}</span>
        ) : (
          <Button variant="tertiary" size="sm" loading={resend.isPending} onClick={() => resend.mutate()}>
            Resend code
          </Button>
        )}
        <Button variant="tertiary" size="sm" onClick={onChangeEmail}>
          Use a different email
        </Button>
      </div>
    </form>
  );
}
