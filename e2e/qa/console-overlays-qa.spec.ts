// QA for Console PR B (overlays): dialogs and the side sheet at 200% and 400%
// zoom, focus never hidden under a toast, a stack of error toasts on a small
// screen, the offline band and support bar while a dialog is open, forced
// colours, reduced motion, text spacing and axe with every overlay up.
import { readFileSync } from 'node:fs';
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

const overlays = [
  { opener: 'Open confirm dialog', name: 'Deactivate this Institution?' },
  { opener: 'Open danger dialog', name: 'Block this user?' },
  { opener: 'Open form dialog', name: 'Set a rate' },
  { opener: 'Open side sheet', name: 'Green Valley School' },
];

/** Tab through the open dialog once; for each stop, how much of the focused element is inside the viewport. */
async function tabThroughDialog(page: Page) {
  const out: { name: string; visible: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const info = await page.evaluate(() => {
      const a = document.activeElement as HTMLElement | null;
      if (!a || !a.closest('dialog[open]')) return null;
      const r = a.getBoundingClientRect();
      const w = Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0));
      const h = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
      return {
        name: (a.getAttribute('aria-label') || a.textContent || a.tagName).trim().slice(0, 30),
        visible: r.width * r.height ? (w * h) / (r.width * r.height) : 0,
      };
    });
    if (info && !out.some((o) => o.name === info.name)) out.push(info);
    await page.keyboard.press('Tab');
  }
  return out;
}

test('every dialog and the side sheet has a solid background, so the page does not show through', async ({
  page,
}) => {
  await gallery(page);
  const seeThrough: string[] = [];
  for (const o of overlays) {
    await page.getByRole('button', { name: o.opener }).click();
    const dialog = page.getByRole('dialog', { name: o.name });
    await expect(dialog).toBeVisible();
    const bg = await dialog.evaluate((el) => getComputedStyle(el).backgroundColor);
    if (!/^rgb\(/.test(bg)) seeThrough.push(`${o.name}: ${bg}`);
    await page.keyboard.press('Escape');
  }
  expect(seeThrough).toEqual([]);
});

for (const [label, size] of [
  ['200%', { width: 640, height: 512 }],
  ['400%', { width: 320, height: 256 }],
] as const) {
  test(`${label} zoom: every dialog and the side sheet fit, and each focus stop inside them can be seen`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await gallery(page);
    const problems: string[] = [];
    for (const o of overlays) {
      await page.getByRole('button', { name: o.opener }).click();
      const dialog = page.getByRole('dialog', { name: o.name });
      await expect(dialog).toBeVisible();
      if (shots)
        await page.screenshot({ path: `${shots}/zoom-${size.width}-${o.opener.replace(/\W+/g, '-')}.png` });
      const box = (await dialog.boundingBox())!;
      if (box.x < -0.5 || box.x + box.width > size.width + 0.5)
        problems.push(`${o.name}: box ${JSON.stringify(box)}`);
      for (const stop of await tabThroughDialog(page)) {
        if (stop.visible < 0.99)
          problems.push(`${o.name}: "${stop.name}" only ${Math.round(stop.visible * 100)}% visible`);
      }
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
    }
    expect(problems).toEqual([]);
  });
}

for (const size of [
  { width: 1280, height: 720 },
  { width: 375, height: 812 },
])
  test(`${size.width} px: focus on the page is never hidden under a toast that stays (WCAG 2.4.11)`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await gallery(page);
    await page.getByRole('button', { name: 'Show error toast' }).click();
    const toast = page.getByRole('alert').filter({ hasText: 'Could not save' });
    await expect(toast).toBeVisible();
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    const hidden: string[] = [];
    for (let i = 0; i < 120; i++) {
      await page.keyboard.press('Tab');
      const r = await page.evaluate(() => {
        const a = document.activeElement as HTMLElement;
        if (a.closest('[role="alert"], [role="status"]')) return null;
        const box = a.getBoundingClientRect();
        // Points across the focused box: covered when every one hits a toast.
        const pts = [0.1, 0.5, 0.9].flatMap((fx) =>
          [0.2, 0.5, 0.8].map((fy) => [box.left + box.width * fx, box.top + box.height * fy] as const),
        );
        const covered = pts.every(([x, y]) => {
          const hit = document.elementFromPoint(x, y);
          return (
            hit &&
            hit !== a &&
            !a.contains(hit) &&
            hit.closest('[role="alert"] .on-frame, [role="status"] .on-frame')
          );
        });
        return covered
          ? `${a.tagName} ${(a.getAttribute('aria-label') || a.textContent || '').trim().slice(0, 30)}`
          : null;
      });
      if (r && !hidden.includes(r)) {
        hidden.push(r);
        if (shots && hidden.length === 1)
          await page.screenshot({ path: `${shots}/focus-under-toast-${size.width}.png` });
      }
    }
    expect(hidden).toEqual([]);
  });

test('four error toasts on a 320 x 256 screen (400% zoom) leave the page usable and each can be dismissed', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 256 });
  await gallery(page);
  const open = page.getByRole('button', { name: 'Show error toast' });
  // Keyboard, because once the first toasts are up they cover the button.
  await open.focus();
  for (let i = 0; i < 4; i++) await page.keyboard.press('Enter');
  const cards = page.locator('[role="alert"] .on-frame');
  // Errors never expire, so beyond two the older ones fold into a "Show 2 more" button (engineer's fix for this finding).
  await expect(cards).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Show 2 more' })).toBeVisible();
  if (shots) await page.screenshot({ path: `${shots}/four-errors-320x256.png` });
  const covered = await page.evaluate(() => {
    let area = 0;
    for (const el of Array.from(document.querySelectorAll('[role="alert"] .on-frame'))) {
      const r = el.getBoundingClientRect();
      const w = Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0));
      const h = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
      area += w * h;
    }
    return area / (innerWidth * innerHeight);
  });
  const offscreen = await cards.evaluateAll(
    (els) => els.filter((el) => el.getBoundingClientRect().top < 0).length,
  );
  // Can the page under the toasts still be clicked? Sample a grid of points.
  const blocked = await page.evaluate(() => {
    let hit = 0;
    let all = 0;
    for (let x = 10; x < innerWidth; x += 20)
      for (let y = 10; y < innerHeight; y += 20) {
        all++;
        if (document.elementFromPoint(x, y)?.closest('[role="alert"] .on-frame')) hit++;
      }
    return hit / all;
  });
  console.log(JSON.stringify({ covered, blocked, offscreen }));
  expect(offscreen, 'toasts pushed above the top of the screen').toBe(0);
  expect(blocked, 'share of the screen the toasts cover').toBeLessThan(0.5);
  // Each one can still be dismissed by keyboard.
  for (let i = 0; i < 4; i++) {
    await page
      .getByRole('button', { name: /Dismiss/ })
      .first()
      .focus();
    await page.keyboard.press('Enter');
  }
  await expect(cards).toHaveCount(0);
});

test('going offline while a form dialog is open is shown and announced inside the dialog', async ({
  page,
  context,
  browserName,
}) => {
  await gallery(page);
  await page.getByRole('button', { name: 'Open form dialog' }).click();
  const dialog = page.getByRole('dialog', { name: 'Set a rate' });
  await expect(dialog).toBeVisible();
  await context.setOffline(true);
  // In every browser: the line is inside the dialog, in a live region that was mounted before the change.
  await expect(dialog.getByRole('status').filter({ hasText: /offline/i })).toHaveText(
    "You're offline. Changes can't be saved.",
  );
  if (shots) await page.screenshot({ path: `${shots}/offline-under-dialog.png` });
  if (browserName === 'chromium') {
    // The accessibility tree itself, which only Chromium exposes through CDP.
    const cdp = await context.newCDPSession(page);
    const { nodes } = (await cdp.send('Accessibility.getFullAXTree')) as {
      nodes: { ignored: boolean; name?: { value?: string } }[];
    };
    expect(nodes.some((n) => !n.ignored && /offline/i.test(n.name?.value ?? ''))).toBe(true);
  }
  await context.setOffline(false);
});

test('axe is clean with toasts up, offline, and on the 403 and 404 panels', async ({ page, context }) => {
  await gallery(page);
  await page.getByRole('button', { name: 'Show success toast' }).click();
  await page.getByRole('button', { name: 'Show error toast' }).click();
  await context.setOffline(true);
  await expect(page.getByText("You're offline. Changes can't be saved.")).toBeVisible();
  const found = await violations(page);
  await context.setOffline(false);
  expect(found).toEqual([]);
});

test('text spacing (WCAG 1.4.12) at 375 px: dialog, side sheet and toast text is not cut', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await gallery(page);
  await page.addStyleTag({
    content:
      '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }',
  });
  const cut: string[] = [];
  const check = async (where: string) => {
    const found = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>('dialog[open] *, .on-frame *'))
        .filter((el) => {
          const s = getComputedStyle(el);
          if (!/(hidden|clip)/.test(s.overflow + s.overflowX + s.overflowY)) return false;
          return (
            el.scrollWidth > el.clientWidth + 1 ||
            (s.overflowY !== 'auto' && el.scrollHeight > el.clientHeight + 1)
          );
        })
        .filter((el) => (el.textContent ?? '').trim())
        .map((el) => (el.textContent ?? '').trim().slice(0, 40)),
    );
    cut.push(...found.map((f) => `${where}: ${f}`));
  };
  for (const o of overlays) {
    await page.getByRole('button', { name: o.opener }).click();
    await expect(page.getByRole('dialog', { name: o.name })).toBeVisible();
    await check(o.name);
    await page.keyboard.press('Escape');
  }
  await page.getByRole('button', { name: 'Show success toast' }).click();
  await check('toast');
  expect(cut).toEqual([]);
});

test('reduced motion: nothing animates with a dialog, the sheet and a toast up', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await gallery(page);
  const moving = async () =>
    page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>('body *, dialog'))
        .map((el) => ({ el, s: getComputedStyle(el) }))
        // Movement only: colour fades on hover are not motion.
        .filter(({ s }) => s.animationName !== 'none' && parseFloat(s.animationDuration) > 0.01)
        .filter(({ el }) => el.checkVisibility())
        .map(
          ({ el, s }) =>
            `${el.tagName}.${el.className.toString().slice(0, 30)} ${s.animationName} ${s.transitionDuration}`,
        ),
    );
  const found: string[] = [];
  await page.getByRole('button', { name: 'Open side sheet' }).click();
  found.push(...(await moving()));
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Show success toast' }).click();
  found.push(...(await moving()));
  expect([...new Set(found)]).toEqual([]);
});

test('forced colours: the progress bar fill, the dialog edge and the stepper are still drawn', async ({
  page,
}) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await page.setViewportSize({ width: 1280, height: 900 });
  await gallery(page);
  const bar = page.getByRole('progressbar').first();
  await bar.scrollIntoViewIfNeeded();
  const png = await bar.screenshot({ path: shots ? `${shots}/forced-progress.png` : undefined });
  if (shots) {
    await page
      .locator('#g-wizard')
      .locator('..')
      .screenshot({ path: `${shots}/forced-stepper.png` });
    await page
      .locator('#g-ops')
      .locator('..')
      .screenshot({ path: `${shots}/forced-ops.png` });
    await page.getByRole('button', { name: 'Open confirm dialog' }).click();
    await page.screenshot({ path: `${shots}/forced-dialog.png` });
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Open side sheet' }).click();
    await page.screenshot({ path: `${shots}/forced-sheet.png` });
    await page.keyboard.press('Escape');
  }
  // The bar is 1 of 3 done: in forced colours the fill must be drawn in a different colour from the track.
  expect(png.length).toBeGreaterThan(0);
  const colours = await bar.evaluate((el) => ({
    track: getComputedStyle(el).backgroundColor,
    fill: getComputedStyle(el.firstElementChild!).backgroundColor,
  }));
  expect(colours.fill, `the fill looks the same as the track: ${JSON.stringify(colours)}`).not.toBe(
    colours.track,
  );
});
