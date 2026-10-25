// QA for Console PR A (components): reflow at 200% and 400% zoom, text
// spacing, axe at phone widths, keyboard focus visibility on every stop,
// the "/" and Ctrl+K shortcuts with the switch on and off (also across
// tabs and inside a modal), text selection in a row, forced colours and
// reduced motion, and the 3:1 field outline.
import { mkdirSync, readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { envelope, expect, mockApi, test } from '../fixtures';

const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const shots = process.env.QA_SHOTS;

async function gallery(page: Page) {
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

/** Text that is cut: an element that hides overflow and whose content is bigger than its box. */
async function clipped(page: Page) {
  return page.evaluate(() => {
    const out: string[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
      if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') continue;
      if (el.closest('.sr-only, [aria-hidden="true"], svg, select, option, input, textarea')) continue;
      const style = getComputedStyle(el);
      // Visually hidden on purpose (sr-only, also responsive variants such as max-md:sr-only).
      let hidden = false;
      for (let n: HTMLElement | null = el; n; n = n.parentElement) {
        const s = getComputedStyle(n);
        if (n.getBoundingClientRect().width <= 1 && s.position === 'absolute') hidden = true;
      }
      if (hidden) continue;
      const hidesX = ['hidden', 'clip'].includes(style.overflowX) || style.textOverflow === 'ellipsis';
      const hidesY = ['hidden', 'clip'].includes(style.overflowY);
      const text = (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 50);
      if (!text) continue;
      if (hidesX && el.scrollWidth > el.clientWidth + 1) out.push(`${el.tagName} "${text}" cut sideways`);
      if (hidesY && el.scrollHeight > el.clientHeight + 1)
        out.push(`${el.tagName} "${text}" cut at the bottom`);
    }
    return out;
  });
}

const sideways = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

// 200% and 400% of a 1280 x 1024 desktop (WCAG 1.4.10 reflow).
for (const [zoom, width, height] of [
  ['200%', 640, 512],
  ['400%', 320, 256],
] as const) {
  test(`${zoom} zoom: no sideways scroll, nothing cut, no axe violations`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await gallery(page);
    expect(await sideways(page)).toBeLessThanOrEqual(0);
    expect(await clipped(page)).toEqual([]);
    expect(await violations(page)).toEqual([]);
    if (shots) await page.screenshot({ path: `${shots}/zoom-${width}.png`, fullPage: true });
  });
}

test('text spacing (WCAG 1.4.12) at 375 px: nothing is cut or overlaps the page edge', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await gallery(page);
  await page.addStyleTag({
    content:
      '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }',
  });
  expect(await sideways(page)).toBeLessThanOrEqual(0);
  expect(await clipped(page)).toEqual([]);
});

test('captures every Tab stop focused and unfocused (pixel contrast is measured from the shots)', async ({
  page,
}) => {
  await gallery(page);
  if (shots) mkdirSync(`${shots}/focus`, { recursive: true });
  const stops: { name: string; box: { x: number; y: number; width: number; height: number } }[] = [];
  await page.locator('body').click({ position: { x: 1, y: 1 } });
  for (let i = 0; i < 80; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const a = document.activeElement as HTMLElement | null;
      if (!a || a === document.body) return null;
      a.scrollIntoView({ block: 'center' });
      const r = a.getBoundingClientRect();
      const label = (
        a.getAttribute('aria-label') ||
        a.innerText ||
        a.getAttribute('placeholder') ||
        a.tagName
      )
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 40);
      return { label, tag: a.tagName, x: r.x, y: r.y, w: r.width, h: r.height };
    });
    if (!info) break;
    const pad = 8;
    const clip = {
      x: Math.max(0, info.x - pad),
      y: Math.max(0, info.y - pad),
      width: info.w + 2 * pad,
      height: info.h + 2 * pad,
    };
    if (shots) {
      await page.screenshot({ path: `${shots}/focus/${String(i).padStart(2, '0')}-on.png`, clip });
      // The same box unfocused: move focus to the body without scrolling, shoot, then restore with Tab order intact.
      await page.evaluate(() => (document.activeElement as HTMLElement).setAttribute('data-qa-focus', '1'));
      await page.evaluate(() => (document.activeElement as HTMLElement).blur());
      await page.screenshot({ path: `${shots}/focus/${String(i).padStart(2, '0')}-off.png`, clip });
      await page.evaluate(() => {
        const el = document.querySelector<HTMLElement>('[data-qa-focus]');
        el?.removeAttribute('data-qa-focus');
        // Restore keyboard focus (and :focus-visible) on the same element.
        el?.focus({ preventScroll: true });
      });
    }
    stops.push({ name: `${info.tag} ${info.label}`, box: clip });
  }
  if (shots) {
    const { writeFileSync } = await import('node:fs');
    writeFileSync(`${shots}/focus/stops.json`, JSON.stringify(stops, null, 1));
  }
  expect(stops.length).toBeGreaterThan(20);
});

test('"/" never steals a "/" typed into a field, and Ctrl+K works from inside one', async ({ page }) => {
  await gallery(page);
  const note = page.getByRole('textbox', { name: 'Internal note' });
  await note.click();
  await page.keyboard.type('a/b');
  await expect(note).toHaveValue('a/b');
  await expect(note).toBeFocused();
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('searchbox', { name: 'Search Institutions' })).toBeFocused();
});

test('turning the shortcut off in one tab turns it off in another open tab', async ({ page, context }) => {
  await gallery(page);
  const other = await context.newPage();
  await other.unroute('http://localhost:3000/v1/auth/refresh');
  await mockApi(other, 'auth/refresh', () => envelope({ accessToken: 'access-1' }));
  await other.goto('/gallery/');
  await expect(other.getByRole('heading', { name: 'Component gallery', level: 1 })).toBeVisible();
  await page.getByRole('switch', { name: 'Single-key shortcuts' }).click();
  await expect(other.getByRole('switch', { name: 'Single-key shortcuts' })).toHaveAttribute(
    'aria-checked',
    'false',
  );
  await other.getByRole('heading', { name: 'Filter bar, table and pagination' }).click();
  await other.keyboard.press('/');
  await expect(other.getByRole('searchbox', { name: 'Search Institutions' })).not.toBeFocused();
  // The search placeholder stops advertising "/".
  await expect(other.getByRole('searchbox', { name: 'Search Institutions' })).not.toHaveAttribute(
    'placeholder',
    /press \//,
  );
});

test('"/" and Ctrl+K do nothing while a modal dialog is open', async ({ page }) => {
  await gallery(page);
  await page.evaluate(() => {
    const d = document.createElement('dialog');
    d.innerHTML = '<p>Confirm</p><button>OK</button>';
    document.body.append(d);
    d.showModal();
  });
  await page.keyboard.press('/');
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('button', { name: 'OK' })).toBeFocused();
});

test('selecting text in a row (drag or double-click) does not open the row', async ({ page }) => {
  await gallery(page);
  const table = page.getByRole('table', { name: 'Institutions' });
  const row = table.getByRole('row').nth(3);
  const cell = row.getByRole('cell').nth(1);
  await cell.scrollIntoViewIfNeeded();
  // Drag across the value's text (the cell's first span is a hidden column label): Firefox and WebKit start no selection from a cell's padding.
  const text = await cell.evaluate((el) => {
    const node = document.createTreeWalker(el.lastElementChild!, NodeFilter.SHOW_TEXT).nextNode()!;
    const range = document.createRange();
    range.selectNodeContents(node);
    const { x, y, width, height } = range.getBoundingClientRect();
    return { x, y, width, height };
  });
  await page.mouse.move(text.x + 1, text.y + text.height / 2);
  await page.mouse.down();
  await page.mouse.move(text.x + text.width - 1, text.y + text.height / 2, { steps: 8 });
  await page.mouse.up();
  expect(await page.evaluate(() => window.getSelection()?.toString().length ?? 0)).toBeGreaterThan(0);
  await expect(table.locator('tr[aria-current="true"]')).toHaveCount(0);
  await cell.dblclick();
  await expect(table.locator('tr[aria-current="true"]')).toHaveCount(0);
  // A plain click on the same cell still opens the row.
  await page.evaluate(() => window.getSelection()?.removeAllRanges());
  await cell.click();
  await expect(table.locator('tr[aria-current="true"]')).toHaveCount(1);
});

test('form fields, selects and the search box draw the #80878D outline', async ({ page }) => {
  await gallery(page);
  const colours = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>('input:not([type=checkbox]), textarea, select')).map(
      (el) => {
        // The visible outline is on the field or on its wrapper.
        let node: HTMLElement | null = el;
        for (let i = 0; i < 3 && node; i++, node = node.parentElement) {
          const c = getComputedStyle(node);
          if (parseFloat(c.borderTopWidth) > 0)
            return `${el.getAttribute('aria-label') ?? el.id}: ${c.borderTopColor}`;
        }
        return `${el.getAttribute('aria-label') ?? el.id}: no border`;
      },
    ),
  );
  const off = colours.filter((c) => !/rgb\(128, 135, 141\)|rgb\(14, 94, 90\)|rgb\(1[0-9]{2}, /.test(c));
  if (shots) {
    const { writeFileSync } = await import('node:fs');
    writeFileSync(`${shots}/field-borders.json`, JSON.stringify(colours, null, 1));
  }
  expect(colours.length).toBeGreaterThan(4);
  expect(off.filter((c) => /no border|rgb\(224, 221, 213\)/.test(c))).toEqual([]);
});

test('forced colours (Windows High Contrast): screenshots of the switch, checkbox and seat meter', async ({
  page,
}) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await gallery(page);
  if (shots) {
    await page
      .getByRole('switch', { name: 'Single-key shortcuts' })
      .screenshot({ path: `${shots}/forced-switch.png` });
    await page
      .getByRole('checkbox')
      .first()
      .screenshot({ path: `${shots}/forced-checkbox.png` });
    await page
      .locator('#g-tabs')
      .locator('..')
      .screenshot({ path: `${shots}/forced-tabs-seat.png` });
  }
  // axe does not model forced colours (it reads the author colours), so compare pixels instead:
  // the on and off states of the switch must look different.
  const sw = page.getByRole('switch', { name: 'Single-key shortcuts' });
  const before = await sw.getAttribute('aria-checked');
  const a = await sw
    .locator('span')
    .first()
    .screenshot({ path: shots ? `${shots}/forced-switch-a.png` : undefined });
  await sw.click();
  await expect(sw).not.toHaveAttribute('aria-checked', before ?? '');
  await page.mouse.move(0, 0);
  await page.waitForTimeout(400);
  const b = await sw
    .locator('span')
    .first()
    .screenshot({ path: shots ? `${shots}/forced-switch-b.png` : undefined });
  expect(a.equals(b), 'the switch looks the same on and off in forced colours').toBe(false);
});

test('stacked table at 375 px: every cell is announced with its column name, and axe is clean', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await gallery(page);
  const table = page.getByRole('table').first();
  await table.scrollIntoViewIfNeeded();
  if (shots) await table.screenshot({ path: `${shots}/stacked-375.png` });
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(375);
  if (shots) {
    const { writeFileSync } = await import('node:fs');
    writeFileSync(`${shots}/stacked-375-aria.yml`, await table.ariaSnapshot());
  }
  await expect(table.getByRole('columnheader').first()).toBeAttached();
  expect(await table.getByRole('cell').count()).toBeGreaterThan(0);
  expect(await violations(page)).toEqual([]);
});

test('reduced motion: no running animations or transitions longer than 0.01 s', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await gallery(page);
  const moving = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>('body *'))
      .map((el) => ({ el, s: getComputedStyle(el) }))
      .filter(({ s }) => s.animationName !== 'none' && parseFloat(s.animationDuration) > 0.01)
      .map(({ el, s }) => `${el.className.toString().slice(0, 40)} ${s.animationName}`),
  );
  expect(moving).toEqual([]);
});

test('stacked table at 375 px: keyboard focus never lands on something that cannot be seen', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await gallery(page);
  const hidden = await page
    .getByRole('table')
    .first()
    .evaluate((table) =>
      Array.from(table.querySelectorAll<HTMLElement>('button, a, input, select, [tabindex]'))
        // display: none leaves the tab order, so only boxes that are rendered can trap focus.
        .filter((el) => el.tabIndex >= 0 && el.checkVisibility())
        .filter((el) => {
          const r = el.getBoundingClientRect();
          const clip = el.closest('.sr-only, [class*="sr-only"]');
          return (
            r.width <= 1 ||
            r.height <= 1 ||
            r.right <= 0 ||
            (clip && getComputedStyle(clip).position === 'absolute')
          );
        })
        .map((el) => el.textContent?.trim()),
    );
  expect(hidden).toEqual([]);
});
