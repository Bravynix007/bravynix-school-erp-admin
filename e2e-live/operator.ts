import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { authenticatorCode } from './totp';

export const API = 'http://localhost:3000/v1';

interface Envelope<T> {
  data: T;
}

interface Requested {
  devOtp?: string;
  resendAfterSeconds: number;
}

/** The setup key of each Super Admin enrolled so far in this run, and when the API takes another code request for each. */
const secrets = new Map<string, string>();
const mayRequestAgainAt = new Map<string, number>();

export const knownSecret = (email: string) => secrets.get(email);

/** A second code request for one email waits out the resend gap (API design 10.1). */
export async function waitForResendGap(page: Page, email: string): Promise<void> {
  await page.waitForTimeout(Math.max(0, (mayRequestAgainAt.get(email) ?? 0) - Date.now()));
}

/**
 * Types the email and the emailed code (the API echoes it in development) and
 * stops at the authenticator step. Enrolling returns the setup key.
 */
export async function signInUntilAuthenticator(
  page: Page,
  email: string,
  { enrol }: { enrol: boolean },
): Promise<string | null> {
  await waitForResendGap(page, email);
  await page.goto('/login/');
  await page.getByLabel('Email').fill(email);
  const requested = page.waitForResponse(`${API}/auth/otp`);
  await page.getByRole('button', { name: 'Send code' }).click();
  const { data } = (await (await requested).json()) as Envelope<Requested>;
  mayRequestAgainAt.set(email, Date.now() + (data.resendAfterSeconds + 1) * 1000);
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
  if (secret) secrets.set(email, secret);
  return secret;
}

/** Signs a Super Admin in all the way to the dashboard, enrolling the authenticator the first time. */
async function signInOperator(
  browser: Browser,
  email: string,
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ baseURL: 'http://localhost:3001', locale: 'en-IN' });
  const page = await context.newPage();
  const known = secrets.get(email);
  const secret = (await signInUntilAuthenticator(page, email, { enrol: known === undefined })) ?? known!;
  await page.getByLabel('Digit 1 of 6').pressSequentially(authenticatorCode(secret));
  await expect(page).toHaveURL(/\/dashboard\/$/);
  return { context, page };
}

const signedIn = new Map<string, Promise<{ context: BrowserContext; page: Page }>>();

/**
 * The one signed-in session of a Super Admin for the whole run. The API takes at most three code
 * requests per email in 15 minutes (API design 10.1), so specs that need the same operator share it
 * instead of signing in again. The browser closes it when the run ends.
 */
export function sharedOperator(browser: Browser, email: string) {
  let session = signedIn.get(email);
  if (!session) {
    session = signInOperator(browser, email);
    signedIn.set(email, session);
  }
  return session;
}

export { authenticatorCode };
