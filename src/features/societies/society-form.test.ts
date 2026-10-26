import { describe, expect, it } from 'vitest';
import {
  createBody,
  emptyProfile,
  profileErrors,
  profileOf,
  updateBody,
  type ProfileForm,
} from './society-form';
import type { Society } from './types';

const actor = { id: 'p', displayName: 'A. Rao', roleName: 'Super Admin' };
const society: Society = {
  id: 's1',
  code: 'SVES',
  name: 'Sri Vidya',
  description: 'A trust',
  email: 'office@svs.example.org',
  phone: { countryCode: '91', number: '9876543210' },
  website: null,
  foundedDate: '1998-06-01',
  address: { line1: '12 MG Road', line2: null, pincode: '560001' },
  status: 1,
  accessPause: null,
  institutionCount: 2,
  version: 3,
  createdBy: actor,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedBy: actor,
  updatedAt: '2026-10-02T00:00:00.000Z',
};

const filled = (changes: Partial<ProfileForm> = {}): ProfileForm => ({
  ...emptyProfile(),
  name: 'Sunrise Trust',
  code: 'SUNRISE',
  ...changes,
});

describe('profileErrors', () => {
  it('asks for the name and, when onboarding, the code', () => {
    expect(profileErrors(emptyProfile(), { editing: false })).toEqual({
      name: 'Enter the Society name.',
      code: 'Enter a code. It cannot be changed later.',
    });
    expect(profileErrors(emptyProfile(), { editing: true })).toEqual({ name: 'Enter the Society name.' });
  });

  it('accepts a minimal profile', () => {
    expect(profileErrors(filled(), { editing: false })).toEqual({});
  });

  it('needs a first address line once any address field is given', () => {
    expect(profileErrors(filled({ pincode: '560001' }), { editing: false })['address.line1']).toBeDefined();
    expect(profileErrors(filled({ line1: '12 MG Road', pincode: '560001' }), { editing: false })).toEqual({});
  });

  it('checks the phone: digits only, 6 to 15 for the number, 1 to 4 for the country code', () => {
    expect(profileErrors(filled({ phoneNumber: '12345' }), { editing: false })['phone.number']).toBeDefined();
    expect(
      profileErrors(filled({ phoneNumber: '9876543210', phoneCountryCode: '+91' }), { editing: false }),
    ).toEqual({
      'phone.countryCode': 'Use 1 to 4 digits, without +.',
    });
    expect(profileErrors(filled({ phoneNumber: '9876543210' }), { editing: false })).toEqual({});
  });

  it('refuses text past the limits', () => {
    expect(profileErrors(filled({ name: 'x'.repeat(256) }), { editing: false }).name).toMatch(/at most 255/);
    expect(profileErrors(filled({ code: 'x'.repeat(51) }), { editing: false }).code).toMatch(/at most 50/);
    expect(profileErrors(filled({ description: 'x'.repeat(1001) }), { editing: false }).description).toMatch(
      /at most 1000/,
    );
  });
});

describe('createBody', () => {
  it('leaves out every empty optional field and trims', () => {
    expect(createBody(filled({ name: ' Sunrise Trust ' }), [{ email: 'a@example.org' }])).toEqual({
      name: 'Sunrise Trust',
      code: 'SUNRISE',
      owners: [{ email: 'a@example.org' }],
    });
  });

  it('carries the phone, the address and the other given fields', () => {
    const body = createBody(
      filled({
        phoneNumber: '9876543210',
        line1: '12 MG Road',
        pincode: '560001',
        website: 'https://svs.example.org',
        foundedDate: '1998-06-01',
        email: 'office@svs.example.org',
        description: 'A trust',
      }),
      [],
    );
    expect(body).toMatchObject({
      phone: { countryCode: '91', number: '9876543210' },
      address: { line1: '12 MG Road', pincode: '560001' },
      website: 'https://svs.example.org',
      foundedDate: '1998-06-01',
      email: 'office@svs.example.org',
      description: 'A trust',
    });
    expect(body.address).not.toHaveProperty('line2');
  });
});

describe('updateBody', () => {
  it('is null when nothing changed', () => {
    expect(updateBody(society, profileOf(society))).toBeNull();
  });

  it('sends the version and only what changed', () => {
    const form = { ...profileOf(society), name: 'Sri Vidya Trust' };
    expect(updateBody(society, form)).toEqual({ version: 3, name: 'Sri Vidya Trust' });
  });

  it('turns an emptied optional field into null so the API clears it', () => {
    const form = { ...profileOf(society), description: '', email: '  ', foundedDate: '' };
    expect(updateBody(society, form)).toEqual({
      version: 3,
      description: null,
      email: null,
      foundedDate: null,
    });
  });

  it('sends the phone and the address whole, and null when they are cleared', () => {
    const changed = updateBody(society, {
      ...profileOf(society),
      phoneNumber: '9123456789',
      line2: 'Block B',
    });
    expect(changed).toEqual({
      version: 3,
      phone: { countryCode: '91', number: '9123456789' },
      address: { line1: '12 MG Road', line2: 'Block B', pincode: '560001' },
    });
    const cleared = updateBody(society, { ...profileOf(society), phoneNumber: '', line1: '', pincode: '' });
    expect(cleared).toEqual({ version: 3, phone: null, address: null });
  });

  it('treats a Society with no address as unchanged when it stays empty', () => {
    const bare: Society = { ...society, address: { line1: null, line2: null, pincode: null } };
    expect(updateBody(bare, profileOf(bare))).toBeNull();
  });
});
