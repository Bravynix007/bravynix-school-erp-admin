'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { InlineAlert } from '@/components/ui/inline-alert';
import { TextField } from '@/components/ui/text-field';
import { ApiError } from '@/lib/api/api-error';
import { authApi } from '@/lib/auth/auth-api';
import { loginErrorMessage } from './login-errors';

export const emailSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Enter your email address.')
    .max(254, 'Email addresses are at most 254 characters.')
    .pipe(z.email('Enter a valid email address, like name@bravynix.in.')),
});

type EmailForm = z.infer<typeof emailSchema>;

/** Screen 1: email, "Send code", "Super Admins only" (STITCH_PROMPT 1). */
export function EmailStep({
  defaultEmail = '',
  onSent,
}: {
  defaultEmail?: string;
  onSent(email: string, resendAfterSeconds: number): void;
}) {
  const form = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: defaultEmail },
  });

  const send = useMutation({
    mutationFn: (email: string) => authApi.requestOtp(email),
    onSuccess: (result, email) => onSent(email, result.resendAfterSeconds),
    onError: (error, email) => {
      // A code went out less than a minute ago: it is still valid, so go on.
      if (error instanceof ApiError && error.code === 'OTP_RESEND_TOO_SOON') {
        onSent(email, error.retryAfterSeconds ?? 60);
        return;
      }
      const field = error instanceof ApiError ? error.fieldError('email') : undefined;
      if (field) form.setError('email', { message: field.message });
    },
  });

  const serverError =
    send.error && !(send.error instanceof ApiError && send.error.fieldError('email'))
      ? loginErrorMessage(send.error)
      : null;

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={form.handleSubmit(({ email }) => send.mutate(email.toLowerCase()))}
    >
      <div>
        <h1 className="text-h2 font-semibold">Sign in to BravyNix Console</h1>
        <p className="mt-1 text-caption text-ink-secondary">Super Admins only</p>
      </div>
      {serverError ? <InlineAlert tone="error">{serverError}</InlineAlert> : null}
      <TextField
        label="Email"
        type="email"
        autoComplete="username"
        autoFocus
        error={form.formState.errors.email?.message}
        {...form.register('email')}
      />
      <Button type="submit" loading={send.isPending} className="w-full">
        Send code
      </Button>
    </form>
  );
}
