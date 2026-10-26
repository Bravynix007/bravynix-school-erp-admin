'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { LoadFailed } from '@/components/shell/load-failed';
import { PageHeader } from '@/components/shell/page-header';
import { RecordNotFound } from '@/components/shell/status-panels';
import { WriteError } from '@/components/shell/write-error';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { InlineAlert } from '@/components/ui/inline-alert';
import { LinkButton } from '@/components/ui/link-button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { fieldErrorsOf } from '@/lib/api/field-errors';
import { profileErrors, profileOf, updateBody, type ProfileForm } from './society-form';
import { SocietyProfileFields } from './society-profile-fields';
import { societyWorkspaceHref } from './societies-list';
import type { SocietyDetail } from './types';
import { useSociety, useUpdateSociety } from './use-societies';

/** PLT-05: edit the profile. The code is not editable here (API design 10.4b). */
export function EditSociety() {
  const id = useSearchParams().get('id');
  const query = useSociety(id);

  if (id === null) return <RecordNotFound listHref="/societies" listLabel="Societies" />;
  if (query.isPending) return <Skeleton className="h-96 w-full" />;
  if (query.isError) {
    return (
      <LoadFailed
        error={query.error}
        onRetry={() => void query.refetch()}
        list={{ href: '/societies', label: 'Societies' }}
      />
    );
  }
  // Keyed by version, so a reload after a conflict starts the form again from what is stored.
  return <EditForm key={query.data.version} society={query.data} reload={() => void query.refetch()} />;
}

function EditForm({ society, reload }: { society: SocietyDetail; reload: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const update = useUpdateSociety(society.id);
  const [form, setForm] = useState<ProfileForm>(() => profileOf(society));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [unchanged, setUnchanged] = useState(false);

  const workspace = societyWorkspaceHref(society.id);

  function save() {
    const found = profileErrors(form, { editing: true });
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    const body = updateBody(society, form);
    setUnchanged(body === null);
    if (body === null) return;
    update.mutate(body, {
      onSuccess: () => {
        toast.success('Changes saved');
        router.push(workspace);
      },
      onError: (error) => setErrors(fieldErrorsOf(error)),
    });
  }

  return (
    <div className="mx-auto max-w-[880px]">
      <PageHeader
        title={`Edit ${society.name}`}
        breadcrumb={
          <Breadcrumbs
            items={[
              { label: 'Societies', href: '/societies' },
              { label: society.name, href: workspace },
              { label: 'Edit' },
            ]}
          />
        }
      />
      {society.status === 0 ? (
        <InlineAlert tone="info">This Society is deactivated and can no longer be edited.</InlineAlert>
      ) : (
        <form
          noValidate
          className="flex flex-col gap-6"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          {update.isError && Object.keys(errors).length === 0 ? (
            <WriteError error={update.error} onReload={reload} />
          ) : null}
          {unchanged ? (
            <InlineAlert tone="info">There is nothing to save: no field was changed.</InlineAlert>
          ) : null}
          <SocietyProfileFields
            value={form}
            onChange={(next) => {
              setForm(next);
              setUnchanged(false);
            }}
            errors={errors}
            codeLocked
          />
          <div className="flex justify-end gap-3 border-t border-line-subtle pt-6">
            <LinkButton href={workspace} variant="secondary">
              Cancel
            </LinkButton>
            <Button type="submit" loading={update.isPending}>
              Save changes
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
