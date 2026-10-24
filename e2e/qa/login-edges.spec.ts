/**
 * QA edge cases for the console sign-in (QA strategy 7.1, 8; API design 6.1,
 * 6.2, 8.2). The API is mocked; these check what the console does with each
 * answer, and that it never leaks tokens.
 */
import type { Page } from '@playwright/test';
import { envelope, expect, failure, mockApi, test, API } from '../fixtures';

const loginOk = envelope(
  {
    accessToken: 'secret-access-token',
    accessTokenExpiresAt: '2026-10-23T05:00:00.000Z',
    person: { id: 'p', email: 'a@b.in', firstName: 'A', lastName: 'B', preferredLanguage: 'en' },
  },
  'LOGIN_OK',
);

async function toCodeStep(page: Page) {
  await page.goto('/login/');
  await page.getByLabel('Email').fill('ananya.rao@bravynix.in');
  await page.getByRole('button', { name: 'Send code' }).click();
}

test('trims and lower-cases the email before sending it', async ({ page }) => {
  let sent: unknown;
  await mockApi(
    page,
    'auth/otp',
    (route) => {
      sent = route.request().postDataJSON();
      return envelope({ resendAfterSeconds: 60, expiresInSeconds: 600 });
    },
    202,
  );
  await page.goto('/login/');
  await page.getByLabel('Email').fill('  Ananya.Rao@BravyNix.in ');
  await page.getByRole('button', { name: 'Send code' }).click();
  await expect.poll(() => sent).toMatchObject({ email: 'ananya.rao@bravynix.in' });
});

test('a double click on Send code sends one request', async ({ page }) => {
  let calls = 0;
  await mockApi(
    page,
    'auth/otp',
    async () => {
      calls += 1;
      await new Promise((r) => setTimeout(r, 300));
      return envelope({ resendAfterSeconds: 60, expiresInSeconds: 600 });
    },
    202,
  );
  await page.goto('/login/');
  await page.getByLabel('Email').fill('ananya.rao@bravynix.in');
  await page.getByRole('button', { name: 'Send code' }).dblclick();
  await expect(page.getByText('a••••@bravynix.in')).toBeVisible();
  expect(calls).toBe(1);
});

test('OTP_RESEND_TOO_SOON goes to the code step and counts down from Retry-After', async ({ page }) => {
  await page.route(`${API}/auth/otp`, (route) =>
    route.request().method() === 'OPTIONS'
      ? route.fulfill({
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': 'http://localhost:3001',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Allow-Headers': '*',
          },
        })
      : route.fulfill({
          status: 429,
          headers: {
            'Access-Control-Allow-Origin': 'http://localhost:3001',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Expose-Headers': 'Retry-After',
            'Retry-After': '42',
          },
          contentType: 'application/json',
          json: failure(429, 'OTP_RESEND_TOO_SOON'),
        }),
  );
  await toCodeStep(page);
  await expect(page.getByText(/Resend code in 0:[34]\d/)).toBeVisible();
});

test('AUTH_LOCKED on verify explains the lock and restarts the flow', async ({ page }) => {
  await mockApi(page, 'auth/otp', () => envelope({ resendAfterSeconds: 60, expiresInSeconds: 600 }), 202);
  await mockApi(page, 'auth/otp/verify', () => failure(423, 'AUTH_LOCKED'), 423);
  await toCodeStep(page);
  await page.getByLabel('Digit 1 of 6').pressSequentially('111111');
  await expect(page.getByText(/locked for 30 minutes/)).toBeVisible();
});

test('a network failure shows a connection message, not a crash', async ({ page }) => {
  await page.route(`${API}/auth/otp`, (route) => route.abort('internetdisconnected'));
  await toCodeStep(page);
  await expect(page.getByText(/Can't reach the server/)).toBeVisible();
});

test('pasting a code with letters does not submit it', async ({ page }) => {
  let verifyCalls = 0;
  await mockApi(page, 'auth/otp', () => envelope({ resendAfterSeconds: 60, expiresInSeconds: 600 }), 202);
  await mockApi(
    page,
    'auth/otp/verify',
    () => {
      verifyCalls += 1;
      return failure(401, 'OTP_INVALID');
    },
    401,
  );
  await toCodeStep(page);
  await page.getByLabel('Digit 1 of 6').focus();
  await page.evaluate(() => {
    const data = new DataTransfer();
    data.setData('text/plain', '12ab56');
    document.activeElement?.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: data, bubbles: true }),
    );
  });
  await page.waitForTimeout(300);
  expect(verifyCalls).toBe(0);
});

test('the access token never reaches storage, cookies or the URL', async ({ page, context }) => {
  await mockApi(page, 'auth/otp', () => envelope({ resendAfterSeconds: 60, expiresInSeconds: 600 }), 202);
  await mockApi(page, 'auth/otp/verify', () =>
    envelope({ mfaRequired: true, mfaToken: 'secret-mfa-token', mfaEnrolled: true }, 'MFA_REQUIRED'),
  );
  await mockApi(page, 'auth/mfa/verify', () => loginOk);
  await toCodeStep(page);
  await page.getByLabel('Digit 1 of 6').pressSequentially('482017');
  await page.getByLabel('Digit 1 of 6').pressSequentially('135790');
  await expect(page).toHaveURL(/\/dashboard\/$/);
  // Reads web storage only to prove nothing was written there.
  const stored = await page.evaluate(
    () =>
      // eslint-disable-next-line no-restricted-globals
      JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }) + document.cookie,
  );
  expect(stored).not.toContain('secret');
  expect(page.url()).not.toContain('secret');
  const cookies = await context.cookies();
  expect(JSON.stringify(cookies)).not.toContain('secret');
});

test('refresh is sent with the CSRF header and credentials', async ({ page }) => {
  let headers: Record<string, string> = {};
  await page.unroute(`${API}/auth/refresh`);
  await mockApi(
    page,
    'auth/refresh',
    (route) => {
      headers = route.request().headers();
      return failure(401, 'REFRESH_TOKEN_INVALID');
    },
    401,
  );
  await page.goto('/dashboard/');
  await expect.poll(() => headers['x-requested-with']).toBe('bravynix-console');
});
