import type { NewPerson } from './types';

const NAME_LIMIT = 100;

/** What is wrong with an email typed for a person, or undefined (API design 10.4d: lower-cased, one per person). */
export function emailProblem(value: string, who = 'the person’s'): string | undefined {
  const email = value.trim();
  if (email === '') return `Enter ${who} email.`;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? undefined : 'Enter a valid email address.';
}

export const nameProblem = (value: string): string | undefined =>
  value.trim().length > NAME_LIMIT ? `Use at most ${NAME_LIMIT} characters.` : undefined;

/** A person being added: the email, and the names the welcome email can use. */
export interface PersonForm {
  email: string;
  firstName: string;
  lastName: string;
}

export const emptyPerson: PersonForm = { email: '', firstName: '', lastName: '' };

export function personErrors(form: PersonForm): Record<string, string> {
  const errors: Record<string, string> = {};
  const email = emailProblem(form.email);
  if (email) errors.email = email;
  const first = nameProblem(form.firstName);
  if (first) errors.firstName = first;
  const last = nameProblem(form.lastName);
  if (last) errors.lastName = last;
  return errors;
}

/** The body of PLT-09 and PLT-13: the email lower-cased, an empty name left out. */
export function personBody(form: PersonForm): NewPerson {
  const firstName = form.firstName.trim();
  const lastName = form.lastName.trim();
  return {
    email: form.email.trim().toLowerCase(),
    ...(firstName ? { firstName } : {}),
    ...(lastName ? { lastName } : {}),
  };
}
