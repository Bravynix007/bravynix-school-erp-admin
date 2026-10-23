'use client';

import { IconCheck, IconCopy, IconShieldCheck } from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { InlineAlert } from '@/components/ui/inline-alert';
import { OtpInput } from '@/components/ui/otp-input';
import { Spinner } from '@/components/ui/spinner';
import { authApi, type LoginTokens } from '@/lib/auth/auth-api';
import { isRestartError, loginErrorMessage } from './login-errors';

/**
 * Screen 3: the authenticator code. On first login it enrols first: QR code,
 * the setup key with a copy button, "Shown only once" (STITCH_PROMPT 3).
 */
export function MfaStep({
  mfaToken,
  enrolled,
  onTokens,
  onRestart,
}: {
  mfaToken: string;
  enrolled: boolean;
  onTokens(tokens: LoginTokens): void;
  onRestart(): void;
}) {
  const [code, setCode] = useState('');

  const enrol = useMutation({ mutationFn: () => authApi.enrolMfa(mfaToken) });
  const verify = useMutation({
    mutationFn: (value: string) => authApi.verifyMfa(mfaToken, value),
    onSuccess: onTokens,
    onError: () => setCode(''),
  });

  // The setup URI is returned once, so enrol exactly once even under
  // React Strict Mode's double effects.
  const enrolStarted = useRef(false);
  const { mutate: startEnrol } = enrol;
  useEffect(() => {
    if (enrolled || enrolStarted.current) return;
    enrolStarted.current = true;
    startEnrol();
  }, [enrolled, startEnrol]);

  const failure = verify.error ?? enrol.error;
  if (failure && isRestartError(failure)) {
    return (
      <div className="flex flex-col gap-5">
        <InlineAlert tone="error">{loginErrorMessage(failure)}</InlineAlert>
        <Button className="w-full" onClick={onRestart}>
          Start again
        </Button>
      </div>
    );
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
        <IconShieldCheck size={28} stroke={1.5} className="mb-3 text-primary" aria-hidden="true" />
        <h1 className="text-h2 font-semibold">
          {enrolled ? 'Enter the code from your authenticator app' : 'Set up your authenticator app'}
        </h1>
        {!enrolled ? (
          <p className="mt-1 text-body text-ink-secondary">
            Scan the QR code with an authenticator app, then enter the 6-digit code it shows.
          </p>
        ) : null}
      </div>

      {!enrolled ? <Enrolment state={enrol} /> : null}
      {enrol.error ? <InlineAlert tone="error">{loginErrorMessage(enrol.error)}</InlineAlert> : null}

      <OtpInput
        label="Authenticator code"
        value={code}
        onChange={setCode}
        onComplete={(value) => {
          if (!verify.isPending) verify.mutate(value);
        }}
        error={verify.error ? loginErrorMessage(verify.error) : undefined}
        disabled={verify.isPending || (!enrolled && !enrol.data)}
        autoFocus={enrolled}
      />
      <Button type="submit" loading={verify.isPending} disabled={code.length !== 6} className="w-full">
        Verify and continue
      </Button>
    </form>
  );
}

function Enrolment({
  state,
}: {
  state: { data?: { setupUri: string; secret: string }; isPending: boolean };
}) {
  const [copied, setCopied] = useState(false);
  if (state.isPending || !state.data) {
    return (
      <div className="flex h-40 items-center justify-center text-primary" role="status">
        <Spinner size={24} />
        <span className="sr-only">Preparing your setup key</span>
      </div>
    );
  }
  const { setupUri, secret } = state.data;
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-line bg-canvas p-4">
      <QRCodeSVG value={setupUri} size={160} marginSize={2} title="Authenticator setup QR code" />
      <div className="flex w-full items-center gap-2 rounded-md border border-line bg-surface px-3 py-2">
        <code className="flex-1 font-mono text-caption break-all text-ink">{secret}</code>
        <Button
          variant="secondary"
          size="sm"
          aria-label="Copy setup key"
          icon={
            copied ? <IconCheck size={16} aria-hidden="true" /> : <IconCopy size={16} aria-hidden="true" />
          }
          onClick={async () => {
            await navigator.clipboard.writeText(secret);
            setCopied(true);
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <p className="text-caption text-warning">Shown only once. Keep it somewhere safe.</p>
    </div>
  );
}
