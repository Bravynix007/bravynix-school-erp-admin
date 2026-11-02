'use client';

import { useState } from 'react';
import { FormDialog, useServerErrors, type WriteState } from '@/components/shell/form-dialog';
import { TextField } from '@/components/ui/text-field';
import { Textarea } from '@/components/ui/textarea';
import { emailProblem, emptyPerson, personBody, personErrors, type PersonForm } from './person-form';
import type { NewPerson } from './types';

/** PLT-09, PLT-13: a person by email, with the names the welcome email can use. Mounted only while open. */
export function AddPersonDialog({
  title,
  description,
  submitLabel,
  write,
  onSubmit,
  onClose,
}: {
  title: string;
  description: string;
  submitLabel: string;
  write: WriteState;
  onSubmit: (body: NewPerson) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<PersonForm>(emptyPerson);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const server = useServerErrors(write.error);
  const set = (key: keyof PersonForm) => (value: string) => {
    server.edit(key);
    setForm((current) => ({ ...current, [key]: value }));
  };

  return (
    <FormDialog
      title={title}
      description={description}
      submitLabel={submitLabel}
      write={write}
      onClose={onClose}
      onSubmit={() => {
        const found = personErrors(form);
        setErrors(found);
        if (Object.keys(found).length === 0) onSubmit(personBody(form));
      }}
    >
      <TextField
        label="Email"
        type="email"
        autoComplete="off"
        autoFocus
        requiredMark
        value={form.email}
        onChange={(event) => set('email')(event.target.value)}
        error={errors.email ?? server.of('email')}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="First name"
          autoComplete="off"
          value={form.firstName}
          onChange={(event) => set('firstName')(event.target.value)}
          error={errors.firstName ?? server.of('firstName')}
        />
        <TextField
          label="Last name"
          autoComplete="off"
          value={form.lastName}
          onChange={(event) => set('lastName')(event.target.value)}
          error={errors.lastName ?? server.of('lastName')}
        />
      </div>
    </FormDialog>
  );
}

const REASON_LIMIT = 500;

/** PLT-15 and PLT-41 ask for a reason (1 to 500 characters), which the audit log keeps. */
export function ReasonDialog({
  title,
  description,
  submitLabel,
  tone,
  write,
  onSubmit,
  onClose,
}: {
  title: string;
  description: string;
  submitLabel: string;
  tone?: 'primary' | 'danger';
  write: WriteState;
  onSubmit: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string>();
  const server = useServerErrors(write.error);
  return (
    <FormDialog
      title={title}
      description={description}
      submitLabel={submitLabel}
      tone={tone}
      write={write}
      onClose={onClose}
      onSubmit={() => {
        const text = reason.trim();
        if (text === '') setError('Say why. The reason is kept in the audit log.');
        else if (text.length > REASON_LIMIT) setError(`Use at most ${REASON_LIMIT} characters.`);
        else {
          setError(undefined);
          onSubmit(text);
        }
      }}
    >
      <Textarea
        label="Reason"
        autoFocus
        requiredMark
        hint="Kept in the audit log."
        value={reason}
        onChange={(event) => {
          server.edit('reason');
          setReason(event.target.value);
        }}
        error={error ?? server.of('reason')}
      />
    </FormDialog>
  );
}

/** PLT-17: the new email takes effect at once and ends the person's sessions (API design 6.6). */
export function ChangeEmailDialog({
  current,
  write,
  onSubmit,
  onClose,
}: {
  current: string;
  write: WriteState;
  onSubmit: (email: string) => void;
  onClose: () => void;
}) {
  const [email, setEmail] = useState(current);
  const [error, setError] = useState<string>();
  const server = useServerErrors(write.error);
  return (
    <FormDialog
      title="Change email"
      description="The new email takes effect at once. The person is signed out everywhere, and both addresses are told."
      submitLabel="Change email"
      write={write}
      onClose={onClose}
      onSubmit={() => {
        const problem =
          emailProblem(email) ??
          (email.trim().toLowerCase() === current.toLowerCase() ? 'Enter a different email.' : undefined);
        setError(problem);
        if (!problem) onSubmit(email.trim().toLowerCase());
      }}
    >
      <TextField
        label="New email"
        type="email"
        autoComplete="off"
        autoFocus
        requiredMark
        value={email}
        onChange={(event) => {
          server.edit('email');
          setEmail(event.target.value);
        }}
        error={error ?? server.of('email')}
      />
    </FormDialog>
  );
}
