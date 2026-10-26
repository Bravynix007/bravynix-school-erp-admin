'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { PageHeader } from '@/components/shell/page-header';
import { WriteError } from '@/components/shell/write-error';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { KeyValueList } from '@/components/ui/key-value-list';
import { Stepper } from '@/components/ui/stepper';
import { TextField } from '@/components/ui/text-field';
import { useToast } from '@/components/ui/toast';
import { fieldErrorsOf } from '@/lib/api/field-errors';
import { formatSchoolDate } from '@/lib/format/date';
import { MAX_OWNERS, newOwnerRow, ownerErrors, ownersBody, type OwnerRow } from './owner-rows';
import { createBody, emptyProfile, profileErrors, type ProfileForm } from './society-form';
import { SocietyProfileFields } from './society-profile-fields';
import { societyWorkspaceHref } from './societies-list';
import { useCreateSociety } from './use-societies';

const STEPS = [
  { key: 'profile', label: 'Profile' },
  { key: 'owners', label: 'Owners' },
  { key: 'review', label: 'Review' },
];

const ADD_OWNER_ID = 'add-owner';
const ownerEmailId = (key: number) => `owner-email-${key}`;

const PROFILE_FIELDS = ['name', 'code', 'description', 'email', 'website', 'foundedDate', 'phone', 'address'];

/** Which step a server field error belongs on. */
const stepOf = (field: string) =>
  field.startsWith('owners') ? 1 : PROFILE_FIELDS.some((f) => field.startsWith(f)) ? 0 : -1;

/**
 * Onboard a Society: Profile, Owners, Review (STITCH_PROMPT 2.2). The Society
 * and its Owners are made in one call, so a refusal leaves nothing half made
 * (API design 10.4b). Institutions are added from the Society afterwards.
 */
export function OnboardSociety() {
  const router = useRouter();
  const toast = useToast();
  const create = useCreateSociety();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<ProfileForm>(emptyProfile);
  const [owners, setOwners] = useState<OwnerRow[]>([newOwnerRow(1)]);
  const [nextKey, setNextKey] = useState(2);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // When the step changes, the control that was focused is gone or disabled, so focus moves to the new step's
  // heading: a keyboard user continues from there and a screen reader says which step it is (WCAG 2.4.3).
  const heading = useRef<HTMLHeadingElement>(null);
  const shownStep = useRef(step);
  useEffect(() => {
    if (shownStep.current === step) return;
    shownStep.current = step;
    heading.current?.focus();
  }, [step]);

  // After a row is removed, focus goes to the field of the row that took its place, or to Add Owner.
  const focusAfterRemove = useRef<string | null>(null);
  useEffect(() => {
    if (focusAfterRemove.current === null) return;
    document.getElementById(focusAfterRemove.current)?.focus();
    focusAfterRemove.current = null;
  }, [owners]);

  function goTo(index: number, nextErrors: Record<string, string> = {}) {
    setErrors(nextErrors);
    setStep(index);
  }

  function next() {
    if (step === 0) {
      const found = profileErrors(profile, { editing: false });
      if (Object.keys(found).length > 0) return setErrors(found);
      return goTo(1);
    }
    const found = ownerErrors(owners);
    if (Object.keys(found).length > 0) return setErrors(found);
    return goTo(2);
  }

  function submit() {
    create.mutate(createBody(profile, ownersBody(owners)), {
      onSuccess: (society) => {
        toast.success(`${society.name} onboarded`);
        router.replace(societyWorkspaceHref(society.id));
      },
      onError: (error) => {
        const fields = fieldErrorsOf(error);
        const target = Object.keys(fields)
          .map(stepOf)
          .find((index) => index >= 0);
        if (target !== undefined) goTo(target, fields);
      },
    });
  }

  /** The errors are keyed by row position, so they are dropped with the row; "Save and continue" finds them again. */
  function removeOwner(index: number) {
    const rest = owners.filter((_, position) => position !== index);
    const taker = rest[index];
    focusAfterRemove.current = taker ? ownerEmailId(taker.key) : ADD_OWNER_ID;
    setOwners(rest);
    setErrors((current) =>
      Object.fromEntries(Object.entries(current).filter(([field]) => !field.startsWith('owners'))),
    );
  }

  const setOwner = (key: number, changes: Partial<OwnerRow>) =>
    setOwners((rows) => rows.map((row) => (row.key === key ? { ...row, ...changes } : row)));

  return (
    <div className="mx-auto max-w-[880px]">
      <PageHeader
        title="Onboard Society"
        breadcrumb={
          <Breadcrumbs items={[{ label: 'Societies', href: '/societies' }, { label: 'Onboard' }]} />
        }
      />
      <div className="mb-8">
        <Stepper steps={STEPS} current={step} onStepClick={(index) => goTo(index)} label="Onboarding steps" />
      </div>

      <form
        noValidate
        className="flex flex-col gap-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (step < 2) next();
          else submit();
        }}
      >
        <h2 ref={heading} tabIndex={-1} className="sr-only">
          Step {step + 1} of {STEPS.length}: {STEPS[step]!.label}
        </h2>
        {step === 0 ? <SocietyProfileFields value={profile} onChange={setProfile} errors={errors} /> : null}

        {step === 1 ? (
          <fieldset className="flex flex-col gap-4">
            <legend className="text-h3 font-semibold">Owners</legend>
            <p className="text-caption text-ink-secondary" id="owners-help">
              Each Owner gets a welcome email and signs in with an email code. {owners.length} of {MAX_OWNERS}{' '}
              Owners.
            </p>
            {errors.owners ? (
              <p role="alert" className="text-caption text-error">
                {errors.owners}
              </p>
            ) : null}
            {create.isError && Object.keys(errors).length === 0 ? <WriteError error={create.error} /> : null}
            {owners.map((row, index) => (
              <div key={row.key} className="grid items-start gap-3 sm:grid-cols-[1fr_1fr_1.4fr_auto]">
                <TextField
                  label={`Owner ${index + 1} first name`}
                  value={row.firstName}
                  onChange={(event) => setOwner(row.key, { firstName: event.target.value })}
                  error={errors[`owners[${index}].firstName`]}
                  autoComplete="off"
                />
                <TextField
                  label={`Owner ${index + 1} last name`}
                  value={row.lastName}
                  onChange={(event) => setOwner(row.key, { lastName: event.target.value })}
                  error={errors[`owners[${index}].lastName`]}
                  autoComplete="off"
                />
                <TextField
                  id={ownerEmailId(row.key)}
                  label={`Owner ${index + 1} email`}
                  type="email"
                  requiredMark
                  value={row.email}
                  onChange={(event) => setOwner(row.key, { email: event.target.value })}
                  error={errors[`owners[${index}].email`]}
                  autoComplete="off"
                />
                <Button
                  variant="secondary"
                  className="sm:mt-[1.65rem]"
                  aria-label={`Remove Owner ${index + 1}`}
                  title={`Remove Owner ${index + 1}`}
                  icon={<IconTrash size={18} aria-hidden="true" />}
                  disabled={owners.length === 1}
                  onClick={() => removeOwner(index)}
                />
              </div>
            ))}
            {owners.length < MAX_OWNERS ? (
              <Button
                id={ADD_OWNER_ID}
                variant="secondary"
                className="self-start"
                icon={<IconPlus size={18} aria-hidden="true" />}
                onClick={() => {
                  setOwners((rows) => [...rows, newOwnerRow(nextKey)]);
                  setNextKey((key) => key + 1);
                }}
              >
                Add Owner
              </Button>
            ) : null}
          </fieldset>
        ) : null}

        {step === 2 ? (
          <Review
            profile={profile}
            owners={owners}
            onEdit={goTo}
            error={create.isError ? create.error : null}
          />
        ) : null}

        <div className="flex justify-between gap-3 border-t border-line-subtle pt-6">
          <Button
            variant="secondary"
            disabled={step === 0 || create.isPending}
            onClick={() => goTo(step - 1)}
          >
            Back
          </Button>
          <Button type="submit" loading={create.isPending}>
            {step < 2 ? 'Save and continue' : 'Onboard Society'}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Review({
  profile,
  owners,
  onEdit,
  error,
}: {
  profile: ProfileForm;
  owners: OwnerRow[];
  onEdit: (step: number) => void;
  error: unknown;
}) {
  const address = [profile.line1, profile.line2, profile.pincode]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ');
  return (
    <div className="flex flex-col gap-6">
      {error ? <WriteError error={error} /> : null}
      <section aria-labelledby="review-profile" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 id="review-profile" className="text-h3 font-semibold">
            Profile
          </h2>
          <Button variant="tertiary" onClick={() => onEdit(0)}>
            Edit profile
          </Button>
        </div>
        <KeyValueList
          items={[
            { label: 'Name', value: profile.name.trim() },
            { label: 'Code', value: profile.code.trim() },
            { label: 'Founded on', value: profile.foundedDate ? formatSchoolDate(profile.foundedDate) : '—' },
            { label: 'Email', value: profile.email.trim() || '—' },
            {
              label: 'Phone',
              value: profile.phoneNumber.trim()
                ? `+${profile.phoneCountryCode.trim()} ${profile.phoneNumber.trim()}`
                : '—',
            },
            { label: 'Website', value: profile.website.trim() || '—' },
            { label: 'Address', value: address || '—' },
            { label: 'Description', value: profile.description.trim() || '—' },
          ]}
        />
      </section>
      <section aria-labelledby="review-owners" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 id="review-owners" className="text-h3 font-semibold">
            Owners
          </h2>
          <Button variant="tertiary" onClick={() => onEdit(1)}>
            Edit Owners
          </Button>
        </div>
        <ul className="flex flex-col gap-1 text-body">
          {owners.map((row) => (
            <li key={row.key}>
              {[row.firstName.trim(), row.lastName.trim()].filter(Boolean).join(' ') || 'No name yet'} ·{' '}
              <span className="text-ink-secondary">{row.email.trim()}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
