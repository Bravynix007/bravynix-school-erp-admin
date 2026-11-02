/**
 * What the operator reads for the codes the due calls can return, beyond the shared copy (API design 10.22, 12).
 * `NOTE_REQUIRED`, `TOTAL_NEGATIVE` and `OUT_OF_RANGE` also arrive against a field, which then shows its own line.
 */
export const DUE_ERROR_COPY: Record<string, string> = {
  NO_RATE_IN_FORCE:
    'No rate is in force on the first day of this period. Set a rate in the Institution’s Pricing tab first.',
  TOTAL_NEGATIVE: 'The total cannot be below ₹0.00. Reduce the deduction.',
  NOTE_REQUIRED: 'A note is required for the count or the adjustment you entered.',
  OUT_OF_RANGE: 'This date is not allowed.',
  INVALID_CODE: 'Choose how it was paid.',
  FIELD_NOT_ALLOWED: 'That part of a due cannot be changed.',
  IDEMPOTENCY_KEY_REUSED:
    'This form was already sent with different details. Close it and raise the due again.',
  IDEMPOTENCY_IN_PROGRESS: 'The first request is still being processed. Wait a moment and try again.',
  IDEMPOTENCY_KEY_REQUIRED: 'Something went wrong. Close the form and try again.',
};

/** Raising or editing on an Institution or Society that was deactivated meanwhile, or a due already settled. */
export const RAISE_ERROR_COPY: Record<string, string> = {
  ...DUE_ERROR_COPY,
  INVALID_STATE: 'This Institution or its Society is deactivated, so no due can be raised for it.',
};

export const SETTLED_ERROR_COPY: Record<string, string> = {
  ...DUE_ERROR_COPY,
  INVALID_STATE: 'This due is already paid or cancelled and can no longer be changed. Reload to see it.',
};
