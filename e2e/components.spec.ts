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

test('no axe violations once a row is selected and a filter is applied', async ({ page }) => {
  await signedInGallery(page);
  await page.getByRole('combobox', { name: 'Status' }).selectOption('Paused');
  await page.getByRole('button', { name: /^Lakeview Academy 2 INS-002$/ }).click();
  await expect(page.locator('tr[aria-current="true"]')).toHaveCount(1);
  expect(await violations(page)).toEqual([]);
});

test('focus stays in the page when Clear, a chip, Previous or Load more change state', async ({ page }) => {
  await signedInGallery(page);
  const active = () => page.evaluate(() => document.activeElement?.tagName);

  // Clear removes itself.
  await page.getByRole('combobox', { name: 'Status' }).selectOption('Active');
  await page.getByRole('button', { name: 'Clear' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('searchbox', { name: 'Search Institutions' })).toBeFocused();

  // The last chip removes itself.
  await page.getByRole('combobox', { name: 'Status' }).selectOption('Active');
  await page.getByRole('button', { name: /Remove filter Status: Active/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('searchbox', { name: 'Search Institutions' })).toBeFocused();

  // Previous on page 1 stays focusable and keeps focus.
  const previous = page.getByRole('button', { name: 'Previous' }).first();
  await previous.focus();
  await page.keyboard.press('Enter');
  await expect(previous).toBeFocused();
  expect(await active()).toBe('BUTTON');

  // Next to the last page: Next soft-disables and keeps focus.
  const next = page.getByRole('button', { name: 'Next', exact: true }).first();
  await next.click();
  await next.click();
  await expect(page.getByText('Showing 41–47 of 47 Institutions')).toBeVisible();
  await next.focus();
  await page.keyboard.press('Enter');
  await expect(next).toBeFocused();
});

test('the single-key shortcut can be switched off in the top bar', async ({ page }) => {
  await signedInGallery(page);
  await page.getByRole('switch', { name: 'Single-key shortcuts' }).click();
  await page.getByRole('heading', { name: 'Filter bar, table and pagination' }).click();
  await page.keyboard.press('/');
  await expect(page.getByRole('searchbox', { name: 'Search Institutions' })).not.toBeFocused();
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('searchbox', { name: 'Search Institutions' })).toBeFocused();
  await page.reload();
  await expect(page.getByRole('switch', { name: 'Single-key shortcuts' })).toHaveAttribute(
    'aria-checked',
    'false',
  );
});

test('the stacked table keeps row and cell roles at 375 px', async ({ page, browserName }) => {
  test.skip(browserName !== 'webkit', 'WebKit is where native table roles were lost');
  await page.setViewportSize({ width: 375, height: 800 });
  await signedInGallery(page);
  const snapshot = await page.getByRole('table', { name: 'Institutions' }).ariaSnapshot();
  expect(snapshot).toContain('- row');
  expect(snapshot).toContain('- cell');
  expect(snapshot).toContain('- columnheader');
});

test('Load more keeps focus in the page, also on the final click', async ({ page }) => {
  await signedInGallery(page);
  const more = page.getByRole('button', { name: 'Load more' });
  await more.scrollIntoViewIfNeeded();
  for (let i = 0; i < 3; i++) {
    await more.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByText(`Showing ${20 + i * 10} entries`)).toBeVisible();
    await expect(more).toBeFocused();
  }
  await page.keyboard.press('Enter');
  await expect(page.getByText('That is all of them')).toBeFocused();
});

test('the shortcuts switch has a visible label on a phone too', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await signedInGallery(page);
  const toggle = page.getByRole('switch', { name: 'Single-key shortcuts' });
  await expect(toggle).toContainText('Shortcuts');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
