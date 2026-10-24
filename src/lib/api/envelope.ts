/** The response envelope every API call returns (API design 7.1). */
export interface PageMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface CursorMeta {
  limit: number;
  nextCursor: string | null;
  hasMore: boolean;
}

export interface FieldError {
  field: string;
  code: string;
  message: string;
  params?: Record<string, unknown>;
}

export interface ApiEnvelope<T> {
  success: boolean;
  statusCode: number;
  code: string;
  message: string;
  data: T | null;
  meta: PageMeta | CursorMeta | null;
  errors?: FieldError[];
  requestId: string;
  [extra: string]: unknown;
}

/** "Who added or changed a record" on every resource (API design 7.6). */
export interface Actor {
  id: string | null;
  displayName: string;
  roleName: string | null;
}

export interface Stamped {
  id: string;
  createdBy: Actor;
  createdAt: string;
  updatedBy: Actor;
  updatedAt: string;
}

export function isEnvelope(value: unknown): value is ApiEnvelope<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    'code' in value &&
    'statusCode' in value
  );
}
