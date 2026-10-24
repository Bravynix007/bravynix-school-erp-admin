import { vi } from 'vitest';

interface Reply {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

/** A fetch stand-in that answers in order and records each call. */
export function fakeFetch(...replies: Reply[]) {
  const queue = [...replies];
  const fn = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => {
    const reply = queue.shift();
    if (!reply) throw new Error('fakeFetch: no reply left');
    return new Response(JSON.stringify(reply.body), {
      status: reply.status,
      headers: { 'Content-Type': 'application/json', ...reply.headers },
    });
  });
  return fn;
}

export function ok<T>(data: T, code = 'OK', statusCode = 200): Reply {
  return {
    status: statusCode,
    body: { success: true, statusCode, code, message: 'OK', data, meta: null, requestId: 'req-1' },
  };
}

export function fail(
  statusCode: number,
  code: string,
  extra: Record<string, unknown> = {},
  headers?: Record<string, string>,
): Reply {
  return {
    status: statusCode,
    headers,
    body: {
      success: false,
      statusCode,
      code,
      message: code,
      data: null,
      meta: null,
      requestId: 'req-2',
      ...extra,
    },
  };
}
