import { ApiError } from './api-error';

/** The API's field errors as `{ field: message }` (API design 8.1), the first message per field. */
export function fieldErrorsOf(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError)) return {};
  const byField: Record<string, string> = {};
  for (const item of error.fieldErrors) byField[item.field] ??= item.message;
  return byField;
}
