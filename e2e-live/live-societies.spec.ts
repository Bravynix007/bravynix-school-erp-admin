import { expect, test, type Page } from '@playwright/test';
import { sharedOperator } from './operator';

/** The Society screens against the real API: onboard, find, read, edit and deactivate. */
test.describe.serial('Societies against the real API', () => {
  test.setTimeout(150_000);
  let page: Page;
  const stamp = Date.now().toString(36).toUpperCase();
  const code = `LIVE${stamp}`;
  const name = `Live Check Trust ${stamp}`;
  const owner = `owner-${stamp.toLowerCase()}@two-worlds.test`;

  test.beforeAll(async ({ browser }) => {
    // Signing in as sa1 may first wait out the API's one-minute resend gap after an earlier spec's sign-in.
    test.setTimeout(150_000);
    ({ page } = await sharedOperator(browser, 'sa1@two-worlds.test'));
  });

  test('onboarding creates the Society with its Owner and opens it', async () => {
    await page.goto('/societies/new/');
    await page.getByLabel(/Society name/).fill(name);
    await page.getByLabel(/^Code/).fill(code);
    await page.getByLabel('Email', { exact: true }).fill('office@two-worlds.test');
    await page.getByRole('button', { name: 'Save and continue' }).click();
    await page.getByLabel('Owner 1 first name').fill('Asha');
    await page.getByLabel(/Owner 1 email/).fill(owner);
    await page.getByRole('button', { name: 'Save and continue' }).click();
    await page.getByRole('button', { name: 'Onboard Society' }).click();

    await expect(page).toHaveURL(/\/societies\/workspace\/\?id=/);
    await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible();
    await page.getByRole('tab', { name: /Owners/ }).click();
    await expect(page.getByText(owner)).toBeVisible();
    await expect(page.getByText('1 of 3 Owners')).toBeVisible();
  });

  test('a taken code is refused on the code field, and nothing is made', async () => {
    await page.goto('/societies/new/');
    await page.getByLabel(/Society name/).fill('Another Trust');
    await page.getByLabel(/^Code/).fill(code.toLowerCase());
    await page.getByRole('button', { name: 'Save and continue' }).click();
    await page.getByLabel(/Owner 1 email/).fill(`second-${owner}`);
    await page.getByRole('button', { name: 'Save and continue' }).click();
    await page.getByRole('button', { name: 'Onboard Society' }).click();
    await expect(page.getByLabel(/^Code/)).toBeVisible();
    await expect(page.getByLabel(/^Code/)).toHaveAccessibleDescription(/./);
    await expect(page).toHaveURL(/\/societies\/new\/$/);
  });

  test('the list finds it by name and by code', async () => {
    await page.goto('/societies/');
    await page.getByLabel('Search Societies').fill(stamp);
    await expect(page.getByText(name)).toBeVisible();
    await expect(page.getByText(code)).toBeVisible();
    await expect(page.getByText('1 Society').first()).toBeVisible();
  });

  test('editing the name is saved and shown', async () => {
    await page.goto('/societies/');
    await page.getByLabel('Search Societies').fill(stamp);
    await page.getByText(name).click();
    await page.getByRole('link', { name: 'Edit' }).click();
    await expect(page.getByRole('textbox', { name: 'Code', exact: true })).toHaveAttribute('readonly', '');
    await page.getByLabel(/Society name/).fill(`${name} Renamed`);
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('heading', { name: `${name} Renamed`, level: 1 })).toBeVisible();
  });

  test('deactivating asks first, then the list shows it Inactive', async () => {
    await page.getByRole('button', { name: 'Deactivate' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Deactivate Society' }).click();
    await expect(page).toHaveURL(/\/societies\/$/);
    await page.getByLabel('Search Societies').fill(stamp);
    await expect(page.getByRole('table').getByText('Inactive')).toBeVisible();
  });
});
