import type { Page } from '@playwright/test';
import { axeViolations, envelope, expect, failure, mockApi, signIn, test } from './fixtures';

const actor = { id: 'p1', displayName: 'A. Rao', roleName: 'Super Admin' };
const stamps = {
  createdBy: actor,
  createdAt: '2026-10-01T04:30:00.000Z',
  updatedBy: actor,
  updatedAt: '2026-10-02T04:30:00.000Z',
};
const row = {
  id: 's1',
  code: 'SVES',
  name: 'Sri Vidya Educational Society',
  status: 1,
  paused: false,
  institutionCount: 1,
  ...stamps,
};
const detail = (changes: object = {}) => ({
  ...row,
  description: 'A trust',
  email: 'office@svs.example.org',
  phone: null,
  website: null,
  foundedDate: '1998-06-01',
  address: { line1: '12 MG Road', line2: null, pincode: '560001' },
  accessPause: null,
  version: 3,
  institutions: [{ id: 'i1', code: 'SVHS', name: 'Sri Vidya High School', status: 1, paused: false }],
  owners: [{ id: 'o1', displayName: 'Asha Rao', email: 'asha@example.org', accountStatus: 1 }],
  ...changes,
});
const page1 = (items: object[]) => ({
  success: true,
  statusCode: 200,
  code: 'OK',
  message: 'OK',
  data: items,
  meta: { page: 1, limit: 20, totalItems: items.length, totalPages: 1 },
  requestId: 'e2e',
});

async function listOf(page: Page, items: object[]) {
  await mockApi(page, 'platform/societies*', () => page1(items));
}

test('the Societies list opens a Society, which shows its Owners and Institutions', async ({ page }) => {
  await signIn(page);
  await listOf(page, [row]);
  await mockApi(page, 'platform/societies/s1', () => envelope(detail()));
  await page.goto('/societies/');
  await expect(page.getByText('SVES')).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);

  await page.getByText('Sri Vidya Educational Society').click();
  await expect(page).toHaveURL(/\/societies\/workspace\/\?id=s1$/);
  await expect(page.getByRole('heading', { name: 'Sri Vidya Educational Society', level: 1 })).toBeVisible();
  await page.getByRole('tab', { name: /Owners/ }).click();
  await expect(page.getByText('Asha Rao')).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);
});

test('onboarding a Society creates it with its Owner and opens it', async ({ page }) => {
  await signIn(page);
  let posted: unknown;
  await mockApi(
    page,
    'platform/societies',
    async (route) => {
      posted = route.request().postDataJSON();
      return envelope(detail({ id: 'new-1', name: 'Sunrise Trust' }), 'CREATED', 201);
    },
    201,
  );
  await mockApi(page, 'platform/societies/new-1', () =>
    envelope(detail({ id: 'new-1', name: 'Sunrise Trust' })),
  );

  await page.goto('/societies/new/');
  await page.getByLabel(/Society name/).fill('Sunrise Trust');
  await page.getByLabel(/^Code/).fill('SUNRISE');
  await page.getByRole('button', { name: 'Save and continue' }).click();
  await page.getByLabel(/Owner 1 email/).fill('asha@example.org');
  expect(await axeViolations(page)).toEqual([]);
  await page.getByRole('button', { name: 'Save and continue' }).click();
  await page.getByRole('button', { name: 'Onboard Society' }).click();

  await expect(page).toHaveURL(/\/societies\/workspace\/\?id=new-1$/);
  expect(posted).toEqual({ name: 'Sunrise Trust', code: 'SUNRISE', owners: [{ email: 'asha@example.org' }] });
});

test('a taken code sends the operator back to the profile with the reason', async ({ page }) => {
  await signIn(page);
  await mockApi(
    page,
    'platform/societies',
    () => ({
      ...failure(409, 'DUPLICATE'),
      errors: [{ field: 'code', code: 'DUPLICATE', message: 'This code is already used' }],
    }),
    409,
  );
  await page.goto('/societies/new/');
  await page.getByLabel(/Society name/).fill('Sunrise Trust');
  await page.getByLabel(/^Code/).fill('SUNRISE');
  await page.getByRole('button', { name: 'Save and continue' }).click();
  await page.getByLabel(/Owner 1 email/).fill('asha@example.org');
  await page.getByRole('button', { name: 'Save and continue' }).click();
  await page.getByRole('button', { name: 'Onboard Society' }).click();
  await expect(page.getByText('This code is already used')).toBeVisible();
  await expect(page.getByLabel(/Society name/)).toHaveValue('Sunrise Trust');
});

test('pausing asks for a reason, and the page then shows the pause', async ({ page }) => {
  await signIn(page);
  let paused = false;
  let body: unknown;
  await mockApi(page, 'platform/societies/s1', () =>
    envelope(
      detail(
        paused
          ? {
              accessPause: { pausedAt: '2026-10-05T04:30:00.000Z', pausedBy: actor, reason: 'Non-payment' },
              version: 4,
            }
          : {},
      ),
    ),
  );
  await mockApi(page, 'platform/societies/s1/pause', (route) => {
    body = route.request().postDataJSON();
    paused = true;
    return envelope(detail({ version: 4 }));
  });

  await page.goto('/societies/workspace/?id=s1');
  await page.getByRole('button', { name: 'Pause access' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);
  await dialog.getByRole('button', { name: 'Pause access' }).click();
  await expect(dialog.getByText('Give the reason for the pause.')).toBeVisible();
  await dialog.getByLabel(/Reason/).fill('Non-payment');
  await dialog.getByRole('button', { name: 'Pause access' }).click();

  await expect(page.getByText(/Access paused since/)).toContainText('Non-payment');
  await expect(page.getByRole('button', { name: 'Resume access' })).toBeVisible();
  expect(body).toEqual({ reason: 'Non-payment', version: 3 });
});
