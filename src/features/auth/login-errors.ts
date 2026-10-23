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
      return 'Too many incorrect codes. Request a new one.';
    case 'OTP_RESEND_TOO_SOON':
      return wait
        ? `Wait ${wait} before asking for another code.`
        : 'Wait a minute before asking for another code.';
    case 'OTP_REQUEST_LIMIT':
      return wait
        ? `Too many codes requested. Try again in ${wait}.`
        : 'Too many codes requested. Try again later.';
    case 'AUTH_LOCKED':
      return 'Too many failed sign-ins. This email is locked for 30 minutes.';
    case 'RATE_LIMITED':
      return 'Too many attempts from this network. Try again shortly.';
    case 'ACCOUNT_BLOCKED':
      return "This account is blocked and can't access the console.";
    case 'CONSOLE_NOT_ALLOWED':
      return 'The console is for Super Admins only. Use the BravyNix app instead.';
    // The two MFA codes are Proposed; API design 8 lists them when Identity lands.
    case 'MFA_INVALID':
      return 'Incorrect authenticator code. Check the time on your phone and try again.';
    case 'MFA_TOKEN_EXPIRED':
      return 'This sign-in took too long. Start again.';
    case 'NETWORK_ERROR':
      return "Can't reach the server. Check your connection and try again.";
    default:
      return error.message || 'Something went wrong. Try again.';
  }
}

/** Errors after which the current code or MFA token is dead and the flow restarts. */
export function isRestartError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    ['OTP_EXPIRED', 'OTP_ATTEMPTS_EXCEEDED', 'AUTH_LOCKED', 'MFA_TOKEN_EXPIRED'].includes(error.code)
  );
}

/** "asha.rao@bravynix.in" → "a••••@bravynix.in" (STITCH_PROMPT screen 2). */
export function maskEmail(email: string): string {
  const [local = '', domain = ''] = email.split('@');
  return `${local.slice(0, 1)}••••@${domain}`;
}
