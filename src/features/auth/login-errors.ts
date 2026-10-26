import { ApiError } from '@/lib/api/api-error';
import { formatCountdown } from '@/lib/hooks/use-countdown';

/**
 * Copy for each login error code (API design 6.2, 10.1, 10.2). The UI
 * branches on `code`; the server's `message` is the fallback for codes this
 * table does not know yet.
 */
export function loginErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Something went wrong. Try again.';
  const wait = error.retryAfterSeconds ? formatCountdown(error.retryAfterSeconds) : null;
  switch (error.code) {
    case 'OTP_INVALID': {
      const left = Number(error.details.attemptsLeft);
      return error.details.attemptsLeft !== undefined && Number.isFinite(left)
        ? `Incorrect code. ${left} ${left === 1 ? 'attempt' : 'attempts'} left.`
        : 'Incorrect code.';
    }
    case 'OTP_EXPIRED':
      return 'This code has expired. Request a new one.';
    case 'OTP_ATTEMPTS_EXCEEDED':
      // The fifth wrong code locks the email, and the answer says for how long (API design 6.2).
      return error.retryAfterSeconds
        ? `Too many incorrect codes. Try again in ${lockDuration(error.retryAfterSeconds)}.`
        : 'Too many incorrect codes. Request a new one.';
    case 'OTP_RESEND_TOO_SOON':
      return wait
        ? `Wait ${wait} before asking for another code.`
        : 'Wait a minute before asking for another code.';
    case 'OTP_REQUEST_LIMIT':
      return wait
        ? `Too many codes requested. Try again in ${wait}.`
        : 'Too many codes requested. Try again later.';
    case 'AUTH_LOCKED':
      return error.retryAfterSeconds
        ? `Too many failed sign-ins. Try again in ${lockDuration(error.retryAfterSeconds)}.`
        : 'Too many failed sign-ins. This email is locked for 30 minutes.';
    case 'RATE_LIMITED':
      return 'Too many attempts from this network. Try again shortly.';
    case 'ACCOUNT_BLOCKED':
      return "This account is blocked and can't access the console.";
    case 'CONSOLE_NOT_ALLOWED':
      return 'The console is for Super Admins only. Use the BravyNix app instead.';
    // API design 6.2, 8.1.
    case 'MFA_INVALID':
      return mfaTriesSpent(error)
        ? 'Too many incorrect authenticator codes. Start again.'
        : 'Incorrect authenticator code. Check the time on your phone and try again.';
    case 'MFA_TOKEN_EXPIRED':
      return 'This sign-in took too long. Start again.';
    // The token's state and the account's disagree, for instance after setup in another tab.
    case 'MFA_ALREADY_ENROLLED':
      return 'An authenticator app is already set up for this account. Start again and enter its code.';
    case 'MFA_NOT_ENROLLED':
      return 'Set up your authenticator app first. Start again.';
    case 'NETWORK_ERROR':
      return "Can't reach the server. Check your connection and try again.";
    default:
      return error.message || 'Something went wrong. Try again.';
  }
}

/**
 * A lock of 30 minutes or 24 hours, in the words the lockout email uses. It
 * rounds up, so nobody tries again a minute early and is refused.
 */
function lockDuration(seconds: number): string {
  if (seconds >= 3600) {
    const hours = Math.ceil(seconds / 3600);
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  }
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
}

/** The email is locked: a new code cannot be requested, so the screen offers a fresh start rather than Resend. */
export function isLockedOut(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.code === 'AUTH_LOCKED' ||
      (error.code === 'OTP_ATTEMPTS_EXCEEDED' && error.retryAfterSeconds !== null))
  );
}

/** The last wrong code a sign-in token allows: the token is dead (API design 10.2b). */
function mfaTriesSpent(error: ApiError): boolean {
  return error.code === 'MFA_INVALID' && error.details.attemptsLeft === 0;
}

/** Errors after which the current code or MFA token is dead and the flow restarts. */
export function isRestartError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (mfaTriesSpent(error) ||
      [
        'OTP_EXPIRED',
        'OTP_ATTEMPTS_EXCEEDED',
        'AUTH_LOCKED',
        'MFA_TOKEN_EXPIRED',
        'MFA_ALREADY_ENROLLED',
        'MFA_NOT_ENROLLED',
      ].includes(error.code))
  );
}

/** "asha.rao@bravynix.in" → "a••••@bravynix.in" (STITCH_PROMPT screen 2). */
export function maskEmail(email: string): string {
  const [local = '', domain = ''] = email.split('@');
  return `${local.slice(0, 1)}••••@${domain}`;
}
