/**
 * QA edge cases for the console session (QA strategy 7.1, 8; API design 6.1,
 * 6.3, 8.2): refusals end the session, outages do not, and tabs never use the
 * single-use refresh cookie at the same time.
 */
import { API, envelope, expect, failure, mockApi, test } from '../fixtures';

for (const status of [400, 403, 404]) {
  test(`a refresh refused with ${status} ends the session`, async ({ page }) => {
    await page.unroute(`${API}/auth/refresh`);
    await mockApi(page, 'auth/refresh', () => failure(status, 'REFRESH_TOKEN_INVALID'), status);
    await page.goto('/dashboard/');
    await expect(page).toHaveURL(/\/login\/$/);
    await expect(page.getByRole('button', { name: 'Log out' })).toHaveCount(0);
  });
}

for (const status of [429, 503]) {
  test(`a refresh answered ${status} keeps the session and Try again waits out Retry-After`, async ({
    page,
  }) => {
    let calls = 0;
    const times: number[] = [];
    await page.unroute(`${API}/auth/refresh`);
    await page.route(`${API}/auth/refresh`, (route) => {
      const cors = {
        'Access-Control-Allow-Origin': 'http://localhost:3001',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Expose-Headers': 'Retry-After',
      };
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
      calls += 1;
      times.push(Date.now());
      return calls === 1
        ? route.fulfill({
            status,
            headers: { ...cors, 'Retry-After': '3' },
            contentType: 'application/json',
            json: failure(status, status === 429 ? 'RATE_LIMITED' : 'SERVICE_UNAVAILABLE'),
          })
        : route.fulfill({
            status: 200,
            headers: cors,
            contentType: 'application/json',
            json: envelope({ accessToken: 'a2' }),
          });
    });
    await page.goto('/dashboard/');
    await expect(page.getByRole('heading', { name: "Can't reach the server" })).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard\/$/);
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible({ timeout: 8000 });
    expect(calls).toBe(2);
    // The retry must not go out before Retry-After (3 s) has passed.
    expect(times[1]! - times[0]!).toBeGreaterThanOrEqual(2900);
  });
}

test('two tabs opening at once never refresh at the same time', async ({ context, page }) => {
  let inFlight = 0;
  let maxInFlight = 0;
  let calls = 0;
  const other = await context.newPage();
  for (const tab of [page, other]) {
    await tab.unroute(`${API}/auth/refresh`);
    await mockApi(tab, 'auth/refresh', async () => {
      calls += 1;
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((r) => setTimeout(r, 400));
      inFlight -= 1;
      return envelope({ accessToken: `a-${calls}` });
    });
  }
  await Promise.all([page.goto('/dashboard/'), other.goto('/dashboard/')]);
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
  await expect(other.getByRole('button', { name: 'Log out' })).toBeVisible();
  expect(calls).toBe(2);
  expect(maxInFlight).toBe(1);
});

test('signing in in one tab signs in the other tab without exposing the token', async ({ context, page }) => {
  const other = await context.newPage();
  let otherRefreshes = 0;
  await mockApi(page, 'auth/otp', () => envelope({ resendAfterSeconds: 60, expiresInSeconds: 600 }), 202);
  await mockApi(page, 'auth/otp/verify', () =>
    envelope({ mfaRequired: true, mfaToken: 'm', mfaEnrolled: true }, 'MFA_REQUIRED'),
  );
  await mockApi(page, 'auth/mfa/verify', () =>
    envelope(
      {
        accessToken: 'secret-a',
        accessTokenExpiresAt: '2026-10-23T05:00:00.000Z',
        person: { id: 'p', email: 'a@b.in', firstName: 'A', lastName: 'B', preferredLanguage: 'en' },
      },
      'LOGIN_OK',
    ),
  );
  await other.goto('/login/');
  // Let the tab finish its own first refresh (signed out) before counting.
  await expect(other.getByRole('button', { name: 'Send code' })).toBeVisible();
  await other.unroute(`${API}/auth/refresh`);
  await mockApi(other, 'auth/refresh', () => {
    otherRefreshes += 1;
    return envelope({ accessToken: 'secret-b' });
  });
  const messages: unknown[] = [];
  await other.exposeFunction('qaRecord', (m: unknown) => messages.push(m));
  await other.evaluate(() => {
    const ch = new BroadcastChannel('bravynix-console-session');
    ch.onmessage = (e) => (window as unknown as { qaRecord: (m: unknown) => void }).qaRecord(e.data);
  });

  await page.goto('/login/');
  await page.getByLabel('Email').fill('ananya.rao@bravynix.in');
  await page.getByRole('button', { name: 'Send code' }).click();
  await page.getByLabel('Digit 1 of 6').pressSequentially('482017');
  await page.getByLabel('Digit 1 of 6').pressSequentially('135790');
  await expect(page).toHaveURL(/\/dashboard\/$/);

  await expect(other).toHaveURL(/\/dashboard\/$/);
  expect(otherRefreshes).toBe(1);
  expect(JSON.stringify(messages)).not.toContain('secret');
});
