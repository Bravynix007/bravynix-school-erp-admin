import { axeViolations, envelope, expect, failure, mockApi, signIn, test } from './fixtures';

const admin = (changes: object = {}) => ({
  id: 'u1',
  email: 'ananya.rao@bravynix.in',
  displayName: 'Ananya Rao',
  accountStatus: 1,
  blockedAt: null,
  blockReason: null,
  version: 4,
  seatNo: 1,
  authenticatorSetUp: true,
  grantedAt: '2026-10-01T04:30:00.000Z',
  ...changes,
});
const owner = {
  id: 'o1',
  email: 'asha@example.org',
  displayName: 'Asha Rao',
  accountStatus: 1,
  blockedAt: null,
  blockReason: null,
  version: 2,
  seatNo: 1,
  grantedAt: '2026-10-02T04:30:00.000Z',
  society: { id: 's1', code: 'SVES', name: 'Sri Vidya Educational Society' },
};

test('Super Admins are listed by seat, and one can be blocked with a reason', async ({ page }) => {
  await signIn(page);
  let blocked: unknown;
  await mockApi(page, 'platform/super-admins', () => envelope([admin()]));
  await mockApi(page, 'platform/users/u1/block', (route) => {
    blocked = route.request().postDataJSON();
    return envelope(admin({ accountStatus: 2 }));
  });

  await page.goto('/users/');
  await expect(page.getByText('1 of 3 Super Admins')).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);

  await page.getByRole('button', { name: /Ananya Rao/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Ananya Rao' });
  expect(await axeViolations(page)).toEqual([]);
  await sheet.getByRole('button', { name: 'Block' }).click();
  const dialog = page.getByRole('dialog', { name: 'Block Ananya Rao?' });
  await dialog.getByRole('button', { name: 'Block account' }).click();
  await expect(dialog.getByText(/Say why/)).toBeVisible();
  await dialog.getByLabel(/Reason/).fill('Left the company');
  expect(await axeViolations(page)).toEqual([]);
  await dialog.getByRole('button', { name: 'Block account' }).click();
  await expect(page.getByText('Ananya Rao blocked')).toBeVisible();
  expect(blocked).toEqual({ reason: 'Left the company', version: 4 });
});

test('a refused change of email shows the reason inside the dialog', async ({ page }) => {
  await signIn(page);
  await mockApi(page, 'platform/super-admins', () => envelope([admin()]));
  await mockApi(page, 'platform/users/u1/email', () => failure(409, 'EMAIL_IN_USE'), 409);
  await page.goto('/users/');
  await page.getByRole('button', { name: /Ananya Rao/ }).click();
  await page
    .getByRole('dialog', { name: 'Ananya Rao' })
    .getByRole('button', { name: 'Change email' })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Change email' });
  await dialog.getByLabel(/New email/).fill('ravi@bravynix.in');
  await dialog.getByRole('button', { name: 'Change email' }).click();
  await expect(dialog.getByText('This email already belongs to another person.')).toBeVisible();
});

test('Society Owners are listed with their Society, and open to their account actions', async ({ page }) => {
  await signIn(page);
  await mockApi(page, 'platform/super-admins', () => envelope([admin()]));
  await mockApi(page, 'platform/society-owners*', () => ({
    ...envelope([owner]),
    meta: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
  }));
  await page.goto('/users/');
  await page.getByRole('tab', { name: 'Society Owners' }).click();
  await expect(page.getByText('Sri Vidya Educational Society')).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);
  await page.getByRole('button', { name: /Asha Rao/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Asha Rao' });
  await expect(sheet.getByRole('link', { name: 'Sri Vidya Educational Society' })).toBeVisible();
  await expect(sheet.getByRole('button', { name: 'Remove Super Admin' })).toHaveCount(0);
});

test('focus goes back to what opened a dialog, and to the row when the sheet closes', async ({ page }) => {
  await signIn(page);
  await mockApi(page, 'platform/super-admins', () => envelope([admin()]));
  await mockApi(page, 'platform/users/u1/block', () => envelope(admin()));
  await page.goto('/users/');

  await page.getByRole('button', { name: 'Add Super Admin' }).click();
  await page.getByRole('dialog', { name: 'Add Super Admin' }).getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('button', { name: 'Add Super Admin' })).toBeFocused();

  await page.getByRole('button', { name: /Ananya Rao/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Ananya Rao' });
  const block = sheet.getByRole('button', { name: 'Block' });

  await block.click();
  await page
    .getByRole('dialog', { name: 'Block Ananya Rao?' })
    .getByRole('button', { name: 'Cancel' })
    .click();
  await expect(block).toBeFocused();

  await block.click();
  await page.keyboard.press('Escape');
  await expect(block).toBeFocused();

  await block.click();
  await page.getByLabel(/Reason/).fill('Left the company');
  await page.getByRole('button', { name: 'Block account' }).click();
  await expect(page.getByText('Ananya Rao blocked')).toBeVisible();
  await expect(block).toBeFocused();

  await sheet.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('button', { name: /Ananya Rao/ })).toBeFocused();
});
