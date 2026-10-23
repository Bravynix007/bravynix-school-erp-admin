import { test as base, type Page, type Route } from '@playwright/test';

export const API = 'http://localhost:3000/v1';

export function envelope(data: unknown, code = 'OK', statusCode = 200) {
  return { success: true, statusCode, code, message: 'OK', data, meta: null, requestId: 'e2e' };
}

export function failure(statusCode: number, code: string, extra: Record<string, unknown> = {}) {
  return {
    success: false,
    statusCode,
    code,
    message: code,
    data: null,
    meta: null,
    requestId: 'e2e',
    ...extra,
  };
}

/** Answers one API path with a JSON envelope; CORS preflights pass. */
export async function mockApi(page: Page, path: string, reply: (route: Route) => unknown, status = 200) {
  await page.route(`${API}/${path}`, async (route) => {
    const cors = {
      'Access-Control-Allow-Origin': 'http://localhost:3001',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': '*',
    };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    return route.fulfill({
      status,
      headers: cors,
      contentType: 'application/json',
      json: await reply(route),
    });
  });
}

export const test = base.extend<{ signedOut: void }>({
  // Every page starts by asking /auth/refresh; by default there is no session.
  signedOut: [
    async ({ page }, use) => {
      await mockApi(page, 'auth/refresh', () => failure(401, 'REFRESH_TOKEN_INVALID'), 401);
      await use();
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';
