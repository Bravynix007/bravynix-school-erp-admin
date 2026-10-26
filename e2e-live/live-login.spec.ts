import { expect, test, type Page } from '@playwright/test';
import { authenticatorCode } from './totp';

const API = 'http://localhost:3000/v1';

interface Envelope<T> {
  data: T;
}

interface Requested {
  devOtp?: string;
  resendAfterSeconds: number;
}

/**
 * Types the email and the emailed code (the API echoes it in development). Returns
 * the authenticator's setup key when the Super Admin has to enrol, and when the
 * API will take another code request for the email.
 */
async function signInUntilAuthenticator(
  page: Page,
  email: string,
  { enrol }: { enrol: boolean },
): Promise<{ secret: string | null; mayRequestAgainAt: number }> {
  await page.goto('/login/');
  await page.getByLabel('Email').fill(email);
  const requested = page.waitForResponse(`${API}/auth/otp`);
  await page.getByRole('button', { name: 'Send code' }).click();
  const { data } = (await (await requested).json()) as Envelope<Requested>;
  const mayRequestAgainAt = Date.now() + (data.resendAfterSeconds + 1) * 1000;
  expect(data.devOtp, 'the API must run with OTP_DEV_ECHO=true').toMatch(/^\d{6}$/);

  const enrolled = enrol ? page.waitForResponse(`${API}/auth/mfa/enrol`) : null;
  await page.getByLabel('Digit 1 of 6').pressSequentially(data.devOtp!);
  const secret = enrolled
    ? ((await (await enrolled).json()) as Envelope<{ secret: string }>).data.secret
    : null;
  await expect(
    page.getByRole('heading', {
      name: enrol ? 'Set up your authenticator app' : 'Enter the code from your authenticator app',
    }),
  ).toBeVisible();
  return { secret, mayRequestAgainAt };
}

test.describe.serial('Super Admin sign-in against the real API', () => {
  let sa1Secret = '';
  let sa1MayRequestAgainAt = 0;

  test('first sign-in enrols the authenticator, then lands on the dashboard', async ({ page }) => {
    const { secret, mayRequestAgainAt } = await signInUntilAuthenticator(page, 'sa1@two-worlds.test', {
      enrol: true,
    });
    expect(secret).toMatch(/^[A-Z2-7]+$/);
    sa1Secret = secret!;
    sa1MayRequestAgainAt = mayRequestAgainAt;
    await expect(page.getByRole('img', { name: 'Authenticator setup QR code' })).toBeVisible();

    await page.getByLabel('Digit 1 of 6').pressSequentially(authenticatorCode(sa1Secret));
    await expect(page).toHaveURL(/\/dashboard\/$/);
    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
  });

  test('a wrong authenticator code is refused; the right one signs in, the cookie survives a reload and logging out ends it', async ({
    page,
    context,
  }) => {
    const { secret } = await signInUntilAuthenticator(page, 'sa2@two-worlds.test', {
      enrol: true,
    });
    await page.getByLabel('Digit 1 of 6').pressSequentially('000000');
    await expect(page.getByText('Incorrect authenticator code')).toBeVisible();
    await expect(page).toHaveURL(/\/login\/$/);

    await page.getByLabel('Digit 1 of 6').pressSequentially(authenticatorCode(secret!));
    await expect(page).toHaveURL(/\/dashboard\/$/);

    const cookie = (await context.cookies()).find((item) => item.name.includes('refresh'));
    expect(cookie).toMatchObject({ httpOnly: true, sameSite: 'Strict' });

    await page.reload();
    await expect(page).toHaveURL(/\/dashboard\/$/);
    await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();

    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page).toHaveURL(/\/login\/$/);
    await page.goto('/dashboard/');
    await expect(page).toHaveURL(/\/login\/$/);
  });

  test('an enrolled Super Admin signs in with the authenticator code alone', async ({ page }) => {
    test.setTimeout(120_000);
    // A second code request for one email waits out the resend gap (API design 10.1).
    await page.waitForTimeout(Math.max(0, sa1MayRequestAgainAt - Date.now()));
    await signInUntilAuthenticator(page, 'sa1@two-worlds.test', { enrol: false });
    await expect(page.getByRole('img', { name: 'Authenticator setup QR code' })).toHaveCount(0);

    await page.getByLabel('Digit 1 of 6').pressSequentially(authenticatorCode(sa1Secret));
    await expect(page).toHaveURL(/\/dashboard\/$/);
  });

  test('five wrong authenticator codes end the sign-in, and Start again returns to the email', async ({
    page,
  }) => {
    await signInUntilAuthenticator(page, 'sa2@two-worlds.test', { enrol: false });
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
});
