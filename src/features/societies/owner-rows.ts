import type { NewOwner } from './types';

export const MAX_OWNERS = 3;

/** One Owner being typed: the key keeps a row's inputs in place when another is removed. */
export interface OwnerRow {
  key: number;
  firstName: string;
  lastName: string;
  email: string;
}

export const newOwnerRow = (key: number): OwnerRow => ({ key, firstName: '', lastName: '', email: '' });

/** Errors keyed like the API's, `owners[0].email`, so a server refusal lands on the same input. */
export function ownerErrors(rows: readonly OwnerRow[]): Record<string, string> {
  const errors: Record<string, string> = {};
  if (rows.length === 0) errors.owners = 'Add at least one Owner, so someone can sign in.';
  const seen = new Set<string>();
  rows.forEach((row, index) => {
    const email = row.email.trim().toLowerCase();
    if (email === '') errors[`owners[${index}].email`] = 'Enter the Owner’s email.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errors[`owners[${index}].email`] = 'Enter a valid email address.';
    else if (seen.has(email)) errors[`owners[${index}].email`] = 'This email is already listed above.';
    seen.add(email);
    if (row.firstName.trim().length > 100)
      errors[`owners[${index}].firstName`] = 'Use at most 100 characters.';
    if (row.lastName.trim().length > 100) errors[`owners[${index}].lastName`] = 'Use at most 100 characters.';
  });
  return errors;
}

export function ownersBody(rows: readonly OwnerRow[]): NewOwner[] {
  return rows.map((row) => {
    const firstName = row.firstName.trim();
    const lastName = row.lastName.trim();
    return {
      email: row.email.trim().toLowerCase(),
      ...(firstName ? { firstName } : {}),
      ...(lastName ? { lastName } : {}),
    };
  });
}
