'use client';

import { useState } from 'react';
import { FormDialog, useServerErrors, type WriteState } from '@/components/shell/form-dialog';
import { InlineAlert } from '@/components/ui/inline-alert';
import { Select } from '@/components/ui/select';
import { TextField } from '@/components/ui/text-field';
import {
  changeBody,
  emptyMasterForm,
  formOfEntry,
  isUnchanged,
  masterErrors,
  newEntryBody,
  type MasterForm,
} from './master-form';
import type { MasterSpec } from './master-specs';
import type { MasterChange, MasterEntry, NewMasterEntry } from './types';

interface Common {
  spec: MasterSpec;
  /** Every class category, for the picker of a predefined class. */
  categories: readonly MasterEntry[];
  write: WriteState;
  /** A field was edited: the refusal was about the old values, so its banner goes too. */
  onEdit: () => void;
  onClose: () => void;
}

/**
 * PLT-31 (add) and PLT-32 (edit): the fields of one master. The code and the class category are set when an entry is
 * added and never changed, so an edit shows them as plain text. Mounted only while open.
 */
export function MasterDialog(
  props: Common &
    (
      | { entry?: undefined; defaultCategoryId: string; onSubmit: (body: NewMasterEntry) => void }
      | { entry: MasterEntry; defaultCategoryId?: undefined; onSubmit: (body: MasterChange) => void }
    ),
) {
  const { spec, categories, write, onEdit, onClose, entry } = props;
  const [form, setForm] = useState<MasterForm>(() =>
    entry ? formOfEntry(entry) : emptyMasterForm(props.defaultCategoryId),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [unchanged, setUnchanged] = useState(false);
  const server = useServerErrors(write.error);
  const change = (key: keyof MasterForm) => (value: string) => {
    server.edit(key);
    onEdit();
    setUnchanged(false);
    setForm((current) => ({ ...current, [key]: value }));
  };
  const category = categories.find((item) => item.id === form.classCategoryId);

  function submit() {
    const found = masterErrors(spec, form, entry === undefined);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    if (props.entry) {
      const body = changeBody(spec, props.entry, form);
      if (isUnchanged(body)) setUnchanged(true);
      else props.onSubmit(body);
    } else {
      props.onSubmit(newEntryBody(spec, form));
    }
  }

  return (
    <FormDialog
      title={entry ? `Edit ${entry.name}` : spec.addLabel}
      description={
        entry
          ? 'Hide an entry from the list instead of deleting it: Institutions that use it keep it.'
          : 'It goes last in the list. Move it into place with the arrows afterwards.'
      }
      submitLabel={entry ? 'Save changes' : spec.addLabel}
      write={write}
      onClose={onClose}
      onSubmit={submit}
    >
      {spec.isClass ? (
        entry ? (
          <p className="text-label text-ink-secondary">
            Class category: <span className="text-ink">{category?.name ?? '—'}</span>
          </p>
        ) : (
          <Select
            label="Class category"
            requiredMark
            placeholder="Choose a class category"
            value={form.classCategoryId}
            onChange={(event) => change('classCategoryId')(event.target.value)}
            options={categories.map((item) => ({
              value: item.id,
              label: item.status === 0 ? `${item.name} (hidden)` : item.name,
              disabled: item.status === 0,
            }))}
            error={errors.classCategoryId ?? server.of('classCategoryId')}
          />
        )
      ) : null}
      {entry ? (
        <p className="text-label text-ink-secondary">
          Code: <span className="font-mono text-mono text-ink">{entry.code}</span>
        </p>
      ) : (
        <TextField
          label="Code"
          requiredMark
          autoFocus={!spec.isClass}
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={spec.codeMax}
          value={form.code}
          onChange={(event) => change('code')(event.target.value.toUpperCase())}
          hint={spec.codeHint}
          error={errors.code ?? server.of('code')}
          inputClassName="font-mono"
        />
      )}
      <TextField
        label="Name"
        requiredMark
        autoFocus={entry !== undefined}
        value={form.name}
        onChange={(event) => change('name')(event.target.value)}
        error={errors.name ?? server.of('name')}
      />
      {spec.isClass ? (
        <TextField
          label="Numeric value"
          inputMode="numeric"
          value={form.numericValue}
          onChange={(event) => change('numericValue')(event.target.value)}
          hint="Optional, 0 to 99: the class as a number, for example 5 for the 5th."
          error={errors.numericValue ?? server.of('numericValue')}
        />
      ) : null}
      {unchanged ? <InlineAlert tone="info">Nothing has changed yet.</InlineAlert> : null}
    </FormDialog>
  );
}
