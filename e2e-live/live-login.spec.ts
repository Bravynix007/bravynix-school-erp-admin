import { expect, test } from '@playwright/test';
import { API, authenticatorCode, knownSecret, signInUntilAuthenticator, waitForResendGap } from './operator';

const SA1 = 'sa1@two-worlds.test';
const SA2 = 'sa2@two-worlds.test';

test.describe.serial('Super Admin sign-in against the real API', () => {
  test('first sign-in enrols the authenticator, then lands on the dashboard', async ({ page }) => {
    const secret = await signInUntilAuthenticator(page, SA1, { enrol: true });
    expect(secret).toMatch(/^[A-Z2-7]+$/);
    await expect(page.getByRole('img', { name: 'Authenticator setup QR code' })).toBeVisible();

    await page.getByLabel('Digit 1 of 6').pressSequentially(authenticatorCode(secret!));
    await expect(page).toHaveURL(/\/dashboard\/$/);
    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
  });

  test('a wrong authenticator code is refused; the right one signs in, the cookie survives a reload and logging out ends it', async ({
    page,
    context,
  }) => {
    const secret = await signInUntilAuthenticator(page, SA2, { enrol: true });
    await page.getByLabel('Digit 1 of 6').pressSequentially('000000');
    await expect(page.getByText('Incorrect authenticator code')).toBeVisible();
    await expect(page).toHaveURL(/\/login\/$/);

    await page.getByLabel('Digit 1 of 6').pressSequentially(authenticatorCode(secret!));
    await expect(page).toHaveURL(/\/dashboard\/$/);

    const cookie = (await context.cookies()).find((item) => item.name.includes('refresh'));
    expect(cookie).toMatchObject({ httpOnly: true, sameSite: 'Strict', secure: true, path: '/v1/auth' });

    await page.reload();
    await expect(page).toHaveURL(/\/dashboard\/$/);
    await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();

    const { name, value } = (await context.cookies()).find((item) => item.name.includes('refresh'))!;
    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page).toHaveURL(/\/login\/$/);
    await page.goto('/dashboard/');
    await expect(page).toHaveURL(/\/login\/$/);

    // The cookie the browser held is dead for good: replaying it is refused (API design 6.3).
    const replay = await page.request.post(`${API}/auth/refresh`, {
      headers: { Cookie: `${name}=${value}`, 'X-Requested-With': 'bravynix-console' },
    });
    expect(replay.status()).toBe(401);
  });

  test('an enrolled Super Admin signs in with the authenticator code alone', async ({ page }) => {
    test.setTimeout(120_000);
    await signInUntilAuthenticator(page, SA1, { enrol: false });
    await expect(page.getByRole('img', { name: 'Authenticator setup QR code' })).toHaveCount(0);

    await page.getByLabel('Digit 1 of 6').pressSequentially(authenticatorCode(knownSecret(SA1)!));
    await expect(page).toHaveURL(/\/dashboard\/$/);
  });

  test('five wrong authenticator codes end the sign-in, and Start again returns to the email', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await waitForResendGap(page, SA2);
    await signInUntilAuthenticator(page, SA2, { enrol: false });
    // The sixth try finds the token dead (API design 10.2b): it answers MFA_TOKEN_EXPIRED.
    for (let attempt = 1; attempt <= 5; attempt++) {
      await page.getByLabel('Digit 1 of 6').pressSequentially('000000');
      await expect(page.getByText('Incorrect authenticator code')).toBeVisible();
      await expect(page.getByLabel('Digit 1 of 6')).toHaveValue('');
    }
    await page.getByLabel('Digit 1 of 6').pressSequentially('000000');
    await expect(page.getByText('This sign-in took too long. Start again.')).toBeVisible();

    await page.getByRole('button', { name: 'Start again' }).click();
    await expect(page.getByLabel('Email')).toBeVisible();
  });

  test('the fifth wrong email code locks the email: the screen says for how long and offers only a fresh start', async ({
    page,
  }) => {
    // An address of its own, so the seeded Super Admins stay usable.
    await page.goto('/login/');
    await page.getByLabel('Email').fill(`lockout-${Date.now()}@two-worlds.test`);
    await page.getByRole('button', { name: 'Send code' }).click();
    for (let attempt = 1; attempt <= 4; attempt++) {
      await page.getByLabel('Digit 1 of 6').pressSequentially('000000');
      await expect(page.getByText(/^Incorrect code\. \d attempts? left\.$/)).toBeVisible();
    }
    await page.getByLabel('Digit 1 of 6').pressSequentially('000000');
    await expect(page.getByText('Too many incorrect codes. Try again in 30 minutes.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Resend code' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Start again' }).click();
    await expect(page.getByLabel('Email')).toBeVisible();
  });
});
