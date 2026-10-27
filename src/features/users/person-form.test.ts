import { describe, expect, it } from 'vitest';
import { emailProblem, personBody, personErrors } from './person-form';

describe('person form', () => {
  it('asks for an email, and a valid one', () => {
    expect(emailProblem('')).toBe('Enter the person’s email.');
    expect(emailProblem('  ')).toBe('Enter the person’s email.');
    expect(emailProblem('asha@')).toBe('Enter a valid email address.');
    expect(emailProblem('asha@example.org')).toBeUndefined();
    expect(emailProblem('', 'the Owner’s')).toBe('Enter the Owner’s email.');
  });

  it('limits the names to 100 characters', () => {
    const errors = personErrors({ email: 'a@b.co', firstName: 'x'.repeat(101), lastName: 'y'.repeat(100) });
    expect(errors).toEqual({ firstName: 'Use at most 100 characters.' });
  });

  it('lower-cases the email and leaves out an empty name', () => {
    expect(personBody({ email: ' Asha@Example.ORG ', firstName: ' Asha ', lastName: '' })).toEqual({
      email: 'asha@example.org',
      firstName: 'Asha',
    });
  });
});
