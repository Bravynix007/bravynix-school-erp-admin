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
  version: 3,
  institutions: [{ id: 'i1', code: 'SVHS', name: 'Sri Vidya High School', status: 1 }],
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

test('deactivating asks first, says what happens, and returns to the list', async ({ page }) => {
  await signIn(page);
  let deactivated = false;
  await mockApi(page, 'platform/societies/s1', (route) => {
    if (route.request().method() === 'DELETE') {
      deactivated = true;
      return envelope({ id: 's1', status: 0 });
    }
    return envelope(detail());
  });
  await listOf(page, []);

  await page.goto('/societies/workspace/?id=s1');
  await page.getByRole('button', { name: 'Deactivate' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText(/signed out/)).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);
  await dialog.getByRole('button', { name: 'Deactivate Society' }).click();
  await expect(page).toHaveURL(/\/societies\/$/);
  expect(deactivated).toBe(true);
});

test('the open tab and the list search survive a refresh', async ({ page }) => {
  await signIn(page);
  await mockApi(page, 'platform/societies/s1', () => envelope(detail()));
  await listOf(page, [row]);

  await page.goto('/societies/workspace/?id=s1');
  await page.getByRole('tab', { name: /Owners/ }).click();
  await expect(page).toHaveURL(/id=s1&tab=owners$/);
  await page.reload();
  await expect(page.getByRole('tab', { name: /Owners/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('Asha Rao')).toBeVisible();

  await page.goto('/societies/');
  await page.getByLabel('Search Societies').fill('vidya');
  await expect(page).toHaveURL(/\?q=vidya$/);
  await page.reload();
  await expect(page.getByLabel('Search Societies')).toHaveValue('vidya');
});
