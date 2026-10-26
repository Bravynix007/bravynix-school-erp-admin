import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api/api-error';
import { isRestartError, loginErrorMessage, maskEmail } from './login-errors';

const error = (code: string, details: Record<string, unknown> = {}, retryAfter: number | null = null) =>
  new ApiError(401, code, 'server text', 'req', [], details, retryAfter);

describe('login errors', () => {
  it('shows attempts left on a wrong code', () => {
    expect(loginErrorMessage(error('OTP_INVALID', { attemptsLeft: 3 }))).toBe(
      'Incorrect code. 3 attempts left.',
    );
    expect(loginErrorMessage(error('OTP_INVALID', { attemptsLeft: 1 }))).toBe(
      'Incorrect code. 1 attempt left.',
    );
    expect(loginErrorMessage(error('OTP_INVALID'))).toBe('Incorrect code.');
  });

  it('uses Retry-After for limits', () => {
    expect(loginErrorMessage(error('OTP_REQUEST_LIMIT', {}, 600))).toBe(
      'Too many codes requested. Try again in 10:00.',
    );
  });

  it('says how long a lock lasts, in minutes or hours', () => {
    expect(loginErrorMessage(error('AUTH_LOCKED', {}, 1800))).toBe(
      'Too many failed sign-ins. Try again in 30 minutes.',
    );
    expect(loginErrorMessage(error('AUTH_LOCKED', {}, 86_400))).toBe(
      'Too many failed sign-ins. Try again in 24 hours.',
    );
    expect(loginErrorMessage(error('AUTH_LOCKED', {}, 3600))).toBe(
      'Too many failed sign-ins. Try again in 1 hour.',
    );
    expect(loginErrorMessage(error('AUTH_LOCKED'))).toBe(
      'Too many failed sign-ins. This email is locked for 30 minutes.',
    );
  });

  it('explains the authenticator states that need a fresh start', () => {
    for (const code of ['MFA_ALREADY_ENROLLED', 'MFA_NOT_ENROLLED']) {
      expect(loginErrorMessage(error(code))).not.toBe('server text');
      expect(isRestartError(error(code))).toBe(true);
    }
  });

  it('falls back to the server message for unknown codes', () => {
    expect(loginErrorMessage(error('SOMETHING_NEW'))).toBe('server text');
    expect(loginErrorMessage(new Error('x'))).toBe('Something went wrong. Try again.');
  });

  it('knows which errors restart the flow', () => {
    expect(isRestartError(error('OTP_EXPIRED'))).toBe(true);
    expect(isRestartError(error('AUTH_LOCKED'))).toBe(true);
    expect(isRestartError(error('OTP_INVALID'))).toBe(false);
  });

  it('masks the email like the design', () => {
    expect(maskEmail('ananya.rao@bravynix.in')).toBe('a••••@bravynix.in');
  });
});
