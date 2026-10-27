import { describe, expect, it } from 'vitest';
import { newOwnerRow, ownerErrors, ownersBody, type OwnerRow } from './owner-rows';

const row = (changes: Partial<OwnerRow>): OwnerRow => ({ ...newOwnerRow(1), ...changes });

describe('ownerErrors', () => {
  it('needs at least one Owner', () => {
    expect(ownerErrors([]).owners).toMatch(/at least one Owner/);
  });

  it('asks for an email and checks its shape', () => {
    expect(ownerErrors([row({})])['owners[0].email']).toBe('Enter the Owner’s email.');
    expect(ownerErrors([row({ email: 'nope' })])['owners[0].email']).toBe('Enter a valid email address.');
    expect(ownerErrors([row({ email: 'asha@example.org' })])).toEqual({});
  });

  it('refuses the same email twice, ignoring case', () => {
    const errors = ownerErrors([
      row({ key: 1, email: 'A@example.org' }),
      row({ key: 2, email: 'a@EXAMPLE.org' }),
    ]);
    expect(errors).toEqual({ 'owners[1].email': 'This email is already listed above.' });
  });

  it('limits the names to 100 characters', () => {
    const errors = ownerErrors([row({ email: 'a@example.org', firstName: 'x'.repeat(101) })]);
    expect(errors['owners[0].firstName']).toMatch(/at most 100/);
  });
});

describe('ownersBody', () => {
  it('lower-cases and trims the email and leaves out empty names', () => {
    expect(
      ownersBody([
        row({ email: ' Asha@Example.org ', firstName: ' Asha ' }),
        row({ key: 2, email: 'b@example.org' }),
      ]),
    ).toEqual([{ email: 'asha@example.org', firstName: 'Asha' }, { email: 'b@example.org' }]);
  });
});
