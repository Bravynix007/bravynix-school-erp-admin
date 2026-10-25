import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { envelope, expect, mockApi, test } from './fixtures';

const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

async function signedInGallery(page: Page) {
  await page.unroute('http://localhost:3000/v1/auth/refresh');
  await mockApi(page, 'auth/refresh', () => envelope({ accessToken: 'access-1' }));
  await page.goto('/gallery/');
  await expect(page.getByRole('heading', { name: 'Component gallery', level: 1 })).toBeVisible();
}

async function violations(page: Page) {
  await page.evaluate(axeSource);
  return page.evaluate(async () => {
    // @ts-expect-error axe is injected above
    const result = await window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    });
    return result.violations.map((v: { id: string; nodes: { target: unknown[] }[] }) => ({
      id: v.id,
      targets: v.nodes.map((n) => n.target.join(' ')),
    }));
  });
}

test('a dialog traps Tab, closes on Esc and gives focus back to its button', async ({ page }) => {
  await signedInGallery(page);
  const opener = page.getByRole('button', { name: 'Open confirm dialog' });
  await opener.click();
  const dialog = page.getByRole('dialog', { name: 'Pause this Institution?' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAccessibleDescription('Staff and parents lose access until you resume it.');

  // Tab cycles inside the dialog (or out to the browser's own bar) and never reaches the page behind it.
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab');
    const ok = await page.evaluate(
      () => document.activeElement === document.body || !!document.activeElement?.closest('dialog'),
    );
    expect(ok).toBe(true);
  }

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

test('a danger dialog starts on Cancel', async ({ page }) => {
  await signedInGallery(page);
  await page.getByRole('button', { name: 'Open danger dialog' }).click();
  await expect(page.getByRole('button', { name: 'Cancel' })).toBeFocused();
});

test('"/" does not pull focus out from behind a dialog', async ({ page }) => {
  await signedInGallery(page);
  await page.getByRole('button', { name: 'Open confirm dialog' }).click();
  await page.keyboard.press('/');
  await expect(page.getByRole('searchbox', { name: 'Search Institutions' })).not.toBeFocused();
  await expect(page.getByRole('dialog')).toContainText('Pause this Institution?');
});

test('the side sheet is 560 px, closes on Esc, on Close and on the backdrop, and returns focus', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await signedInGallery(page);
  const opener = page.getByRole('button', { name: 'Open side sheet' });
  await opener.click();
  const sheet = page.getByRole('dialog', { name: 'Green Valley School' });
  await expect(sheet).toBeVisible();
  expect((await sheet.boundingBox())?.width).toBe(560);
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  await expect(opener).toBeFocused();

  await opener.click();
  await page.getByRole('button', { name: 'Close', exact: true }).first().click();
  await expect(sheet).toBeHidden();

  await opener.click();
  await page.mouse.click(100, 450);
  await expect(sheet).toBeHidden();
});

test('on a phone the side sheet is a full page and the dialog is a bottom sheet', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await signedInGallery(page);
  await page.getByRole('button', { name: 'Open side sheet' }).click();
  const sheet = page.getByRole('dialog', { name: 'Green Valley School' });
  expect((await sheet.boundingBox())?.width).toBe(375);
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Open confirm dialog' }).click();
  const box = await page.getByRole('dialog').boundingBox();
  expect(box?.width).toBe(375);
  expect((box?.y ?? 0) + (box?.height ?? 0)).toBeCloseTo(800, 0);
});

test('no axe violations with a dialog open, and with the side sheet open', async ({ page }) => {
  await signedInGallery(page);
  await page.getByRole('button', { name: 'Open form dialog' }).click();
  expect(await violations(page)).toEqual([]);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Open side sheet' }).click();
  expect(await violations(page)).toEqual([]);
});

test('toasts: success is polite with a link and leaves by itself, an error stays until dismissed', async ({
  page,
}) => {
  await signedInGallery(page);
  await page.getByRole('button', { name: 'Show success toast' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Due BNX/FY2026-27/0007 raised' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'View' })).toHaveAttribute('href', /\/dues\/?$/);
  await page.getByRole('button', { name: 'Show error toast' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Could not save' })).toBeVisible();
  await expect(page.getByText('Due BNX/FY2026-27/0007 raised')).toBeHidden({ timeout: 8000 });
  await expect(page.getByText('Could not save. Check your connection.')).toBeVisible();
  await page.getByRole('button', { name: 'Dismiss' }).click();
  await expect(page.getByText('Could not save. Check your connection.')).toBeHidden();
});

test('the stepper goes back to a done step', async ({ page }) => {
  await signedInGallery(page);
  const onboarding = page.getByRole('list', { name: 'Onboarding' });
  await expect(onboarding.getByRole('listitem').nth(1)).toHaveAttribute('aria-current', 'step');
  await onboarding.getByRole('button', { name: /Society/ }).click();
  await expect(onboarding.getByRole('listitem').nth(0)).toHaveAttribute('aria-current', 'step');
});

test('going offline shows the band and coming back removes it', async ({ page, context }) => {
  await signedInGallery(page);
  await context.setOffline(true);
  await expect(page.getByText("You're offline. Changes can't be saved.")).toBeVisible();
  await context.setOffline(false);
  await expect(page.getByText("You're offline. Changes can't be saved.")).toBeHidden();
});
