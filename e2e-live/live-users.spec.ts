import { expect, test, type Page } from '@playwright/test';
import { sharedOperator } from './operator';

/** The Users page and the Owner seats against the real API: PLT-09 to PLT-12, PLT-15 to PLT-17, PLT-41. */
test.describe.serial('Users and Owners against the real API', () => {
  test.setTimeout(150_000);
  let page: Page;
  const stamp = Date.now().toString(36).toUpperCase();
  const code = `USR${stamp}`;
  const name = `Users Check Trust ${stamp}`;
  const first = `first-${stamp.toLowerCase()}@two-worlds.test`;
  const second = `second-${stamp.toLowerCase()}@two-worlds.test`;
  const moved = `moved-${stamp.toLowerCase()}@two-worlds.test`;

  test.beforeAll(async ({ browser }) => {
    // Signing in as sa1 may first wait out the API's one-minute resend gap after an earlier spec's sign-in.
    test.setTimeout(150_000);
    ({ page } = await sharedOperator(browser, 'sa1@two-worlds.test'));
  });

  test('the Users page lists the seeded Super Admins by seat', async () => {
    await page.goto('/users/');
    await expect(page.getByText('2 of 3 Super Admins')).toBeVisible();
    await expect(page.getByText('sa1@two-worlds.test')).toBeVisible();
    await expect(page.getByText('sa2@two-worlds.test')).toBeVisible();
  });

  test('a Society is onboarded, a second Owner is added, and the last-Owner rule holds', async () => {
    await page.goto('/societies/new/');
    await page.getByLabel(/Society name/).fill(name);
    await page.getByLabel(/^Code/).fill(code);
    await page.getByRole('button', { name: 'Save and continue' }).click();
    await page.getByLabel('Owner 1 first name').fill('Asha');
    await page.getByLabel(/Owner 1 email/).fill(first);
    await page.getByRole('button', { name: 'Save and continue' }).click();
    await page.getByRole('button', { name: 'Onboard Society' }).click();
    await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible();
    await page.getByRole('tab', { name: /Owners/ }).click();

    // The only Owner cannot be removed.
    await page.getByRole('button', { name: 'Remove Asha' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Remove Owner' }).click();
    await expect(page.getByRole('dialog').getByText(/must keep at least one Owner/)).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();

    await page.getByRole('button', { name: 'Add an Owner' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Add Owner' });
    await dialog.getByLabel(/Email/).fill(second);
    await dialog.getByLabel('First name').fill('Ravi');
    await dialog.getByRole('button', { name: 'Add Owner' }).click();
    await expect(page.getByText('2 of 3 Owners')).toBeVisible();
    await expect(page.getByText(second)).toBeVisible();
  });

  test('an Owner found on the Users page is blocked with a reason, and unblocked', async () => {
    await page.goto('/users/');
    await page.getByRole('tab', { name: 'Society Owners' }).click();
    await page.getByLabel('Search Owners').fill(stamp.toLowerCase());
    await page.getByRole('button', { name: /Ravi/ }).click();
    const sheet = page.getByRole('dialog', { name: /Ravi/ });
    await sheet.getByRole('button', { name: 'Block', exact: true }).click();
    const block = page.getByRole('dialog', { name: /Block Ravi/ });
    await block.getByLabel(/Reason/).fill('Live check');
    await block.getByRole('button', { name: 'Block account' }).click();
    await expect(sheet.getByText(/Blocked .*Live check/)).toBeVisible();

    await sheet.getByRole('button', { name: 'Unblock' }).click();
    await page
      .getByRole('dialog', { name: /Unblock Ravi/ })
      .getByRole('button', { name: 'Unblock account' })
      .click();
    await expect(sheet.getByRole('button', { name: 'Block', exact: true })).toBeVisible();
  });

  test('changing the email takes effect, and a clean account has nothing to unlock', async () => {
    const sheet = page.getByRole('dialog', { name: /Ravi/ });
    await sheet.getByRole('button', { name: 'Change email' }).click();
    const dialog = page.getByRole('dialog', { name: 'Change email' });
    await dialog.getByLabel(/New email/).fill(moved);
    await dialog.getByRole('button', { name: 'Change email' }).click();
    await expect(sheet.getByText(moved)).toBeVisible();

    await sheet.getByRole('button', { name: 'Unlock sign-in' }).click();
    const unlock = page.getByRole('dialog', { name: /Unlock sign-in for Ravi/ });
    await unlock.getByLabel(/Reason/).fill('Live check');
    await unlock.getByRole('button', { name: 'Unlock sign-in' }).click();
    await expect(
      unlock.getByText('This person is not locked out, so there is nothing to unlock.'),
    ).toBeVisible();
  });

  test('the second Owner can then be removed from the Society', async () => {
    await page.goto('/societies/');
    await page.getByLabel('Search Societies').fill(stamp);
    await page.getByText(name).click();
    await page.getByRole('tab', { name: /Owners/ }).click();
    await page.getByRole('button', { name: 'Remove Ravi' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Remove Owner' }).click();
    await expect(page.getByText('1 of 3 Owners')).toBeVisible();
  });
});
