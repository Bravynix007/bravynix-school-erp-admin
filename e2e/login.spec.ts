import { envelope, expect, failure, mockApi, test } from './fixtures';

test('signed-out visitors land on sign-in', async ({ page }) => {
  await page.goto('/societies/');
  await expect(page).toHaveURL(/\/login\/$/);
  await expect(page.getByRole('heading', { name: 'Sign in to BravyNix Console' })).toBeVisible();
});

test('email → code → authenticator → dashboard', async ({ page }) => {
  await mockApi(
    page,
    'auth/otp',
    () => envelope({ resendAfterSeconds: 60, expiresInSeconds: 600 }, 'OTP_SENT_IF_REGISTERED', 202),
    202,
  );
  await mockApi(page, 'auth/otp/verify', () =>
    envelope({ mfaRequired: true, mfaToken: 'mfa', mfaEnrolled: true }, 'MFA_REQUIRED'),
  );
  await mockApi(page, 'auth/mfa/verify', () =>
    envelope(
      {
        accessToken: 'access',
        accessTokenExpiresAt: '2026-10-23T05:00:00.000Z',
        person: {
          id: 'p',
          email: 'ananya.rao@bravynix.in',
          firstName: 'Ananya',
          lastName: 'Rao',
          preferredLanguage: 'en',
        },
      },
      'LOGIN_OK',
    ),
  );

  await page.goto('/login/');
  await page.getByLabel('Email').fill('ananya.rao@bravynix.in');
  await page.getByRole('button', { name: 'Send code' }).click();
  await expect(page.getByText('a••••@bravynix.in')).toBeVisible();
  await expect(page.getByText(/Resend code in 0:5\d|Resend code in 1:00/)).toBeVisible();

  await page.getByLabel('Digit 1 of 6').pressSequentially('482017');
  await expect(
    page.getByRole('heading', { name: 'Enter the code from your authenticator app' }),
  ).toBeVisible();

  await page.getByLabel('Digit 1 of 6').pressSequentially('135790');
  await expect(page).toHaveURL(/\/dashboard\/$/);
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Dashboard' }),
  ).toHaveAttribute('aria-current', 'page');
});

test('a wrong code shows the attempts left', async ({ page }) => {
  await mockApi(page, 'auth/otp', () => envelope({ resendAfterSeconds: 60, expiresInSeconds: 600 }), 202);
  await mockApi(
    page,
    'auth/otp/verify',
    () => failure(401, 'OTP_INVALID', { data: { attemptsLeft: 4 } }),
    401,
  );
  await page.goto('/login/');
  await page.getByLabel('Email').fill('ananya.rao@bravynix.in');
  await page.getByRole('button', { name: 'Send code' }).click();
  await page.getByLabel('Digit 1 of 6').pressSequentially('111111');
  await expect(page.getByText('Incorrect code. 4 attempts left.')).toBeVisible();
});
