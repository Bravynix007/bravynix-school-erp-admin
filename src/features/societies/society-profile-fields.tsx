import { Textarea } from '@/components/ui/textarea';
import { TextField } from '@/components/ui/text-field';
import type { ProfileForm } from './society-form';

/**
 * The Society's profile inputs, shared by onboarding and Edit. The code is
 * typed once and never changes (API design 10.4b), so Edit shows it read-only.
 * `errors` is keyed by the API's field names.
 */
export function SocietyProfileFields({
  value,
  onChange,
  errors,
  codeLocked,
}: {
  value: ProfileForm;
  onChange: (next: ProfileForm) => void;
  errors: Record<string, string>;
  codeLocked?: boolean;
}) {
  const set = (key: keyof ProfileForm) => (event: { target: { value: string } }) =>
    onChange({ ...value, [key]: event.target.value });
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <TextField
        label="Society name"
        requiredMark
        value={value.name}
        onChange={set('name')}
        error={errors.name}
        autoComplete="organization"
        className="sm:col-span-2"
      />
      <TextField
        label="Code"
        requiredMark={!codeLocked}
        value={value.code}
        onChange={set('code')}
        error={errors.code}
        readOnly={codeLocked}
        hint={
          codeLocked
            ? 'The code cannot be changed.'
            : 'Short and unique, such as SVES. It cannot be changed later.'
        }
        inputClassName="font-mono"
        autoCapitalize="characters"
      />
      <TextField
        label="Founded on"
        type="date"
        value={value.foundedDate}
        onChange={set('foundedDate')}
        error={errors.foundedDate}
      />
      <Textarea
        label="Description"
        value={value.description}
        onChange={set('description')}
        error={errors.description}
        className="sm:col-span-2"
      />
      <TextField
        label="Email"
        type="email"
        value={value.email}
        onChange={set('email')}
        error={errors.email}
        autoComplete="email"
      />
      <TextField
        label="Website"
        type="url"
        value={value.website}
        onChange={set('website')}
        error={errors.website}
        hint="Starts with https://"
      />
      <div className="grid grid-cols-[6rem_1fr] gap-3 sm:col-span-2">
        <TextField
          label="Country code"
          value={value.phoneCountryCode}
          onChange={set('phoneCountryCode')}
          error={errors['phone.countryCode']}
          inputMode="numeric"
          prefix="+"
        />
        <TextField
          label="Phone"
          type="tel"
          value={value.phoneNumber}
          onChange={set('phoneNumber')}
          error={errors['phone.number']}
          autoComplete="tel-national"
        />
      </div>
      <TextField
        label="Address line 1"
        value={value.line1}
        onChange={set('line1')}
        error={errors['address.line1']}
        autoComplete="address-line1"
        className="sm:col-span-2"
      />
      <TextField
        label="Address line 2"
        value={value.line2}
        onChange={set('line2')}
        error={errors['address.line2']}
        autoComplete="address-line2"
      />
      <TextField
        label="Pincode"
        value={value.pincode}
        onChange={set('pincode')}
        error={errors['address.pincode']}
        autoComplete="postal-code"
        inputMode="numeric"
      />
    </div>
  );
}
