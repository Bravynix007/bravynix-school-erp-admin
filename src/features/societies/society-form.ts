import type { CreateSocietyBody, NewOwner, Society, UpdateSocietyBody } from './types';

/** Every profile field as the operator types it: strings, empty when not given (API design 10.4b). */
export interface ProfileForm {
  name: string;
  code: string;
  description: string;
  email: string;
  phoneCountryCode: string;
  phoneNumber: string;
  website: string;
  foundedDate: string;
  line1: string;
  line2: string;
  pincode: string;
}

export const DEFAULT_COUNTRY_CODE = '91';

export const emptyProfile = (): ProfileForm => ({
  name: '',
  code: '',
  description: '',
  email: '',
  phoneCountryCode: DEFAULT_COUNTRY_CODE,
  phoneNumber: '',
  website: '',
  foundedDate: '',
  line1: '',
  line2: '',
  pincode: '',
});

export const profileOf = (society: Society): ProfileForm => ({
  name: society.name,
  code: society.code,
  description: society.description ?? '',
  email: society.email ?? '',
  phoneCountryCode: society.phone?.countryCode ?? DEFAULT_COUNTRY_CODE,
  phoneNumber: society.phone?.number ?? '',
  website: society.website ?? '',
  foundedDate: society.foundedDate ?? '',
  line1: society.address.line1 ?? '',
  line2: society.address.line2 ?? '',
  pincode: society.address.pincode ?? '',
});

const LIMITS = { name: 255, code: 50, description: 1000, email: 254, website: 255, line1: 255, pincode: 10 };

/**
 * What can be checked before the call; the API checks the rest and answers
 * with field errors. Keys are the API's field names, so both kinds show in
 * the same place.
 */
export function profileErrors(form: ProfileForm, { editing }: { editing: boolean }): Record<string, string> {
  const errors: Record<string, string> = {};
  const name = form.name.trim();
  if (name === '') errors.name = 'Enter the Society name.';
  else if (name.length > LIMITS.name) errors.name = `Use at most ${LIMITS.name} characters.`;
  if (!editing) {
    const code = form.code.trim();
    if (code === '') errors.code = 'Enter a code. It cannot be changed later.';
    else if (code.length > LIMITS.code) errors.code = `Use at most ${LIMITS.code} characters.`;
  }
  if (form.description.trim().length > LIMITS.description) {
    errors.description = `Use at most ${LIMITS.description} characters.`;
  }
  if (form.email.trim().length > LIMITS.email) errors.email = `Use at most ${LIMITS.email} characters.`;
  if (form.website.trim().length > LIMITS.website) {
    errors.website = `Use at most ${LIMITS.website} characters.`;
  }
  const number = form.phoneNumber.trim();
  if (number !== '' && !/^\d{1,4}$/.test(form.phoneCountryCode.trim())) {
    errors['phone.countryCode'] = 'Use 1 to 4 digits, without +.';
  }
  if (number !== '' && !/^\d{6,15}$/.test(number)) errors['phone.number'] = 'Use 6 to 15 digits.';
  const addressGiven = [form.line1, form.line2, form.pincode].some((value) => value.trim() !== '');
  if (addressGiven && form.line1.trim() === '')
    errors['address.line1'] = 'Enter the first line of the address.';
  if (form.line1.trim().length > LIMITS.line1)
    errors['address.line1'] = `Use at most ${LIMITS.line1} characters.`;
  if (form.pincode.trim().length > LIMITS.pincode)
    errors['address.pincode'] = `Use at most ${LIMITS.pincode} characters.`;
  return errors;
}

const given = (value: string): string | undefined => {
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

function phoneOf(form: ProfileForm) {
  const number = given(form.phoneNumber);
  return number === undefined ? null : { countryCode: form.phoneCountryCode.trim(), number };
}

function addressOf(form: ProfileForm) {
  const line1 = given(form.line1);
  if (line1 === undefined) return null;
  const line2 = given(form.line2);
  const pincode = given(form.pincode);
  return { line1, ...(line2 ? { line2 } : {}), ...(pincode ? { pincode } : {}) };
}

export function createBody(form: ProfileForm, owners: NewOwner[]): CreateSocietyBody {
  const phone = phoneOf(form);
  const address = addressOf(form);
  const description = given(form.description);
  const email = given(form.email);
  const website = given(form.website);
  const foundedDate = given(form.foundedDate);
  return {
    name: form.name.trim(),
    code: form.code.trim(),
    ...(description ? { description } : {}),
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {}),
    ...(website ? { website } : {}),
    ...(foundedDate ? { foundedDate } : {}),
    ...(address ? { address } : {}),
    owners,
  };
}

const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * The PATCH body for what changed, or null when nothing did. A field the
 * operator emptied becomes `null`, which clears it; `phone` and `address` are
 * sent whole, because the API replaces them whole (API design 10.4b).
 */
export function updateBody(original: Society, form: ProfileForm): UpdateSocietyBody | null {
  const body: UpdateSocietyBody = { version: original.version };
  let changed = false;
  const set = <K extends Exclude<keyof UpdateSocietyBody, 'version'>>(
    key: K,
    value: UpdateSocietyBody[K],
  ) => {
    body[key] = value;
    changed = true;
  };

  if (form.name.trim() !== original.name) set('name', form.name.trim());
  const text = [
    ['description', original.description, given(form.description)],
    ['email', original.email, given(form.email)],
    ['website', original.website, given(form.website)],
    ['foundedDate', original.foundedDate, given(form.foundedDate)],
  ] as const;
  for (const [key, before, after] of text) {
    if ((before ?? undefined) !== after) set(key, after ?? null);
  }
  const phone = phoneOf(form);
  if (!sameJson(original.phone, phone)) set('phone', phone);
  const address = addressOf(form);
  const before = original.address.line1 === null ? null : addressOf(profileOf(original));
  if (!sameJson(before, address)) set('address', address);
  return changed ? body : null;
}
