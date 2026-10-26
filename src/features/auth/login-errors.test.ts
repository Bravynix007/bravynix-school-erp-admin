import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api/api-error';
import { isLockedOut, isRestartError, loginErrorMessage, maskEmail } from './login-errors';

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

  it('rounds a lock up, so nobody returns early', () => {
    expect(loginErrorMessage(error('AUTH_LOCKED', {}, 84_000))).toBe(
      'Too many failed sign-ins. Try again in 24 hours.',
    );
    expect(loginErrorMessage(error('AUTH_LOCKED', {}, 5300))).toBe(
      'Too many failed sign-ins. Try again in 2 hours.',
    );
    expect(loginErrorMessage(error('AUTH_LOCKED', {}, 1801))).toBe(
      'Too many failed sign-ins. Try again in 31 minutes.',
    );
    expect(loginErrorMessage(error('AUTH_LOCKED', {}, 30))).toBe(
      'Too many failed sign-ins. Try again in 1 minute.',
    );
  });

  it('tells the fifth wrong email code, which locks the email, from the earlier ones', () => {
    expect(loginErrorMessage(error('OTP_ATTEMPTS_EXCEEDED', {}, 1800))).toBe(
      'Too many incorrect codes. Try again in 30 minutes.',
    );
    expect(loginErrorMessage(error('OTP_ATTEMPTS_EXCEEDED', {}, 86_400))).toBe(
      'Too many incorrect codes. Try again in 24 hours.',
    );
    expect(loginErrorMessage(error('OTP_ATTEMPTS_EXCEEDED'))).toBe(
      'Too many incorrect codes. Request a new one.',
    );
  });

  it('knows when the email is locked out', () => {
    expect(isLockedOut(error('OTP_ATTEMPTS_EXCEEDED', {}, 1800))).toBe(true);
    expect(isLockedOut(error('AUTH_LOCKED'))).toBe(true);
    expect(isLockedOut(error('OTP_ATTEMPTS_EXCEEDED'))).toBe(false);
    expect(isLockedOut(error('OTP_INVALID'))).toBe(false);
    expect(isLockedOut(new Error('x'))).toBe(false);
  });

  it('restarts after the last wrong authenticator code a sign-in allows', () => {
    expect(isRestartError(error('MFA_INVALID', { attemptsLeft: 0 }))).toBe(true);
    expect(loginErrorMessage(error('MFA_INVALID', { attemptsLeft: 0 }))).toBe(
      'Too many incorrect authenticator codes. Start again.',
    );
    expect(isRestartError(error('MFA_INVALID', { attemptsLeft: 1 }))).toBe(false);
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
