import { emailProblem, nameProblem, personBody } from '@/features/users/person-form';
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
    const problem = emailProblem(email, 'the Owner’s');
    if (problem) errors[`owners[${index}].email`] = problem;
    else if (seen.has(email)) errors[`owners[${index}].email`] = 'This email is already listed above.';
    seen.add(email);
    const first = nameProblem(row.firstName);
    if (first) errors[`owners[${index}].firstName`] = first;
    const last = nameProblem(row.lastName);
    if (last) errors[`owners[${index}].lastName`] = last;
  });
  return errors;
}

export const ownersBody = (rows: readonly OwnerRow[]): NewOwner[] => rows.map(personBody);
