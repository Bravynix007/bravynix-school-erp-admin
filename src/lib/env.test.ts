import { describe, expect, it } from 'vitest';
import { parseEnv } from './env';

describe('parseEnv', () => {
  it('defaults a local build to the local API', () => {
    expect(parseEnv({})).toEqual({
      NEXT_PUBLIC_APP_ENV: 'local',
      NEXT_PUBLIC_API_BASE_URL: 'http://localhost:3000/v1',
    });
  });

  it('accepts an https API for staging', () => {
    const env = parseEnv({
      NEXT_PUBLIC_APP_ENV: 'staging',
      NEXT_PUBLIC_API_BASE_URL: 'https://api.staging.bravynix.in/v1',
    });
    expect(env.NEXT_PUBLIC_API_BASE_URL).toBe('https://api.staging.bravynix.in/v1');
  });

  it.each([
    [{ NEXT_PUBLIC_APP_ENV: 'production' }, /required/],
    [{ NEXT_PUBLIC_APP_ENV: 'production', NEXT_PUBLIC_API_BASE_URL: 'http://api.bravynix.in/v1' }, /https/],
    [{ NEXT_PUBLIC_APP_ENV: 'staging', NEXT_PUBLIC_API_BASE_URL: 'https://localhost:3000/v1' }, /not local/],
    [{ NEXT_PUBLIC_API_BASE_URL: 'http://api.example.in/v1' }, /https unless/],
  ])('refuses %j', (raw, message) => {
    expect(() => parseEnv(raw)).toThrow(message);
  });
});
