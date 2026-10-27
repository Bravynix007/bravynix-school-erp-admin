import { describe, expect, it } from 'vitest';
import { ApiError } from './api-error';
import { apiErrorMessage, isStale } from './error-copy';

const error = (code: string, message = 'server text') => new ApiError(409, code, message, 'req');

describe('apiErrorMessage', () => {
  it('writes the copy for a known code, not the server text', () => {
    expect(apiErrorMessage(error('LAST_OWNER'))).toMatch(/at least one Owner/);
    expect(apiErrorMessage(error('VERSION_CONFLICT'))).toMatch(/Someone changed this record/);
  });

  it('lets a screen word a code its own way', () => {
    expect(apiErrorMessage(error('INVALID_STATE'), { INVALID_STATE: 'Already paused.' })).toBe(
      'Already paused.',
    );
  });

  it('falls back to the server message for a code it does not know, and to a plain line for a non-API error', () => {
    expect(apiErrorMessage(error('SOMETHING_NEW'))).toBe('server text');
    expect(apiErrorMessage(new Error('boom'))).toBe('Something went wrong. Try again.');
  });

  it('spots a record that changed under the operator, or whose state no longer allows the action', () => {
    expect(isStale(error('VERSION_CONFLICT'))).toBe(true);
    expect(isStale(error('INVALID_STATE'))).toBe(true);
    expect(isStale(error('DUPLICATE'))).toBe(false);
    expect(isStale(new Error('x'))).toBe(false);
  });
});
