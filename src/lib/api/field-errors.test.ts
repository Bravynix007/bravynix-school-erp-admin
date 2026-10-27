import { describe, expect, it } from 'vitest';
import { ApiError } from './api-error';
import { fieldErrorsOf } from './field-errors';

describe('fieldErrorsOf', () => {
  it('maps each field to its first message', () => {
    const error = new ApiError(400, 'VALIDATION_FAILED', 'x', 'r', [
      { field: 'name', code: 'REQUIRED', message: 'Required' },
      { field: 'name', code: 'TOO_LONG', message: 'Too long' },
      { field: 'owners[0].email', code: 'INVALID_FORMAT', message: 'Not an email' },
    ]);
    expect(fieldErrorsOf(error)).toEqual({ name: 'Required', 'owners[0].email': 'Not an email' });
  });

  it('is empty for an error without fields and for a non-API error', () => {
    expect(fieldErrorsOf(new ApiError(500, 'INTERNAL_ERROR', 'x', 'r'))).toEqual({});
    expect(fieldErrorsOf(new Error('x'))).toEqual({});
  });
});
