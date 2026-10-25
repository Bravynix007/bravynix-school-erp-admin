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
    return result.violations.map((v: { id: string; help: string; nodes: { target: unknown[] }[] }) => ({
      id: v.id,
      help: v.help,
      targets: v.nodes.map((n) => n.target.join(' ')),
    }));
  });
}

test('the gallery has no WCAG 2.2 AA violations that a scanner can find', async ({ page }) => {
  await signedInGallery(page);
  expect(await violations(page)).toEqual([]);
});

test('the skip link is the first stop and moves focus past the sidebar', async ({ page }) => {
  await signedInGallery(page);
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.locator('main#content')).toBeFocused();
});

test('"/" jumps to search, filters narrow the table, Clear brings it back', async ({ page }) => {
  await signedInGallery(page);
  await page.getByRole('heading', { name: 'Filter bar, table and pagination' }).click();
  await page.keyboard.press('/');
  const search = page.getByRole('searchbox', { name: 'Search Institutions' });
  await expect(search).toBeFocused();
  await search.fill('lakeview');
  await expect(page.getByRole('status').filter({ hasText: 'Institutions' }).first()).toContainText(
    '12 Institutions',
  );
  await page.getByRole('combobox', { name: 'Status' }).selectOption('Active');
  await expect(page.getByRole('list', { name: 'Applied filters' })).toContainText('Status: Active');
  await page.getByRole('button', { name: 'Clear' }).click();
  await expect(search).toHaveValue('');
  await expect(page.getByRole('status').filter({ hasText: 'Institutions' }).first()).toContainText(
    '47 Institutions',
  );
});

test('sorting and paging work from the keyboard and set aria-sort', async ({ page }) => {
  await signedInGallery(page);
  const table = page.getByRole('table', { name: 'Institutions' });
  const header = table.getByRole('columnheader', { name: /Seats/ });
  await header.getByRole('button').focus();
  await page.keyboard.press('Enter');
  await expect(header).toHaveAttribute('aria-sort', 'ascending');
  await page.keyboard.press('Enter');
  await expect(header).toHaveAttribute('aria-sort', 'descending');
  await page.getByRole('button', { name: 'Next', exact: true }).first().click();
  await expect(page.getByText('Showing 21–40 of 47 Institutions')).toBeVisible();
});

test('a row opens from its button and is marked as the current row', async ({ page }) => {
  await signedInGallery(page);
  await page.getByRole('button', { name: /^Lakeview Academy 2 INS-002$/ }).click();
  const current = page.getByRole('table', { name: 'Institutions' }).locator('tr[aria-current="true"]');
  await expect(current).toHaveCount(1);
  await expect(current).toContainText('Lakeview Academy 2');
});

test('tabs move with the arrow keys', async ({ page }) => {
  await signedInGallery(page);
  await page.getByRole('tab', { name: /Owners/ }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: /Institutions/ })).toBeFocused();
  await expect(page.getByRole('tabpanel')).toContainText('Sri Vidya Educational Society');
});

for (const width of [768, 375, 320]) {
  test(`at ${width} px wide the page does not scroll sideways and rows stack`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await signedInGallery(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    if (width < 768) {
      const box = await page.locator('thead').first().boundingBox();
      expect(box?.width ?? 0).toBeLessThanOrEqual(1);
    }
  });
}

test('with reduced motion the loading bars hold still', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await signedInGallery(page);
  const name = await page
    .locator('.skeleton')
    .first()
    .evaluate((el) => getComputedStyle(el).animationName);
  expect(name).toBe('none');
});
