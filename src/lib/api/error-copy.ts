import { ApiError } from './api-error';

/**
 * What the operator reads for an API error code (API design 8.1). The UI
 * branches on `code`, never on `message`; a feature passes `overrides` for
 * codes that mean something particular on its screen. The server's own
 * `message` is the last resort for codes this table does not know yet.
 */
const COPY: Record<string, string> = {
  NETWORK_ERROR: "Can't reach the server. Check your connection and try again.",
  RATE_LIMITED: 'Too many requests. Wait a moment and try again.',
  FORBIDDEN: "You don't have access to this.",
  NOT_ASSIGNED: "You don't have access to this.",
  ACCESS_BLOCKED: "You don't have access to this.",
  NOT_FOUND: 'This record no longer exists.',
  VERSION_CONFLICT: 'Someone changed this record while you were editing it. Reload to see the latest.',
  INVALID_STATE: "This can't be done in the record's current state. Reload to see its latest state.",
  DUPLICATE: 'This value is already in use.',
  VALIDATION_FAILED: 'Check the highlighted fields and try again.',
  INTERNAL_ERROR: 'Something went wrong on our side. Try again in a moment.',
  UNEXPECTED_RESPONSE: 'Something went wrong. Try again.',
  SEAT_LIMIT_REACHED: 'The limit of three has been reached.',
  LAST_OWNER: 'A Society must keep at least one Owner. Add the new Owner first, then remove this one.',
  CANNOT_ACT_ON_SELF: "You can't do this to your own account.",
  EMAIL_IN_USE: 'This email already belongs to another person.',
  ACCOUNT_BLOCKED: 'This account is blocked.',
};

export function apiErrorMessage(error: unknown, overrides: Record<string, string> = {}): string {
  if (!(error instanceof ApiError)) return 'Something went wrong. Try again.';
  return overrides[error.code] ?? COPY[error.code] ?? (error.message || 'Something went wrong. Try again.');
}

/**
 * A refusal because the record is no longer as the screen showed it: it changed under the operator, or its
 * state no longer allows the action. Both copy lines say "Reload", so the screen offers it (DESIGN.md 16).
 */
export function isStale(error: unknown): boolean {
  return error instanceof ApiError && (error.code === 'VERSION_CONFLICT' || error.code === 'INVALID_STATE');
}
