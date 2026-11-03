import type { Page, Route } from '@playwright/test';
import { API, axeViolations, envelope, expect, failure, signIn, test } from './fixtures';

const cors = {
  'Access-Control-Allow-Origin': 'http://localhost:3001',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Headers': '*',
};

interface Entry {
  id: string;
  status: 0 | 1;
  version: number;
  code: string;
  name: string;
  displayOrder: number;
}

const designation = (id: string, name: string, displayOrder: number, status: 0 | 1 = 1): Entry => ({
  id,
  status,
  version: 1,
  code: name.toUpperCase().replace(/ /g, '_'),
  name,
  displayOrder,
});

/** The designations as MST-01 (hidden ones included), PLT-31 and PLT-32 keep them: moving shifts the entries it passes. */
async function mockDesignations(page: Page, seen: { read: string[]; writes: object[] }) {
  const entries = [
    designation('d1', 'Principal', 1),
    designation('d2', 'Teacher', 2),
    designation('d3', 'Clerk', 3, 0),
  ];
  await page.route(`${API}/masters/designations?*`, async (route: Route) => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    seen.read.push(new URL(route.request().url()).search);
    return route.fulfill({ status: 200, headers: cors, json: envelope(entries) });
  });
  await page.route(`${API}/platform/masters/designations**`, async (route: Route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const body = request.postDataJSON() as Partial<Entry> & { version?: number };
    seen.writes.push(body);
    if (request.method() === 'POST') {
      if (entries.some((entry) => entry.code === body.code)) {
        return route.fulfill({
          status: 409,
          headers: cors,
          json: failure(409, 'DUPLICATE', {
            errors: [{ field: 'code', code: 'DUPLICATE', message: 'This code is taken' }],
          }),
        });
      }
      const created = { ...designation('d9', body.name ?? '', entries.length + 1), code: body.code ?? '' };
      entries.push(created);
      return route.fulfill({ status: 201, headers: cors, json: envelope(created, 'CREATED', 201) });
    }
    const id = request.url().split('/').pop();
    const current = entries.find((entry) => entry.id === id)!;
    if (body.displayOrder !== undefined) {
      const from = entries.indexOf(current);
      entries.splice(from, 1);
      entries.splice(body.displayOrder - 1, 0, current);
      entries.forEach((entry, index) => {
        entry.displayOrder = index + 1;
        entry.version += 1;
      });
    }
    if (body.status !== undefined) current.status = body.status;
    return route.fulfill({ status: 200, headers: cors, json: envelope(current) });
  });
}

test('Super Admin adds, moves, hides and shows a designation', async ({ page }) => {
  await signIn(page);
  const seen = { read: [] as string[], writes: [] as object[] };
  await mockDesignations(page, seen);

  await page.goto('/masters/?tab=designations');
  await expect(page.getByText('Entries in use are hidden, never deleted', { exact: false })).toBeVisible();
  const rows = page.getByRole('table', { name: 'Designations' }).getByRole('row');
  await expect(rows).toHaveCount(4);
  await expect(page.getByText('Hidden', { exact: true })).toBeVisible();
  expect(seen.read[0]).toBe('?includeHidden=true');
  expect(await axeViolations(page)).toEqual([]);

  // Up and down buttons move an entry: the list is read again and shows the new order.
  await page.getByRole('button', { name: 'Move Teacher up' }).click();
  await expect(page.getByText('Teacher moved up')).toBeVisible();
  await expect(rows.nth(1)).toContainText('Teacher');
  await expect(page.getByRole('button', { name: 'Move Teacher up' })).toBeDisabled();

  // Hiding asks first.
  await page.getByRole('button', { name: 'Hide Principal' }).click();
  await page.getByRole('dialog', { name: 'Hide Principal?' }).getByRole('button', { name: 'Hide' }).click();
  await expect(page.getByText('Principal hidden')).toBeVisible();
  await page.getByRole('button', { name: 'Show Clerk' }).click();
  await expect(page.getByText('Clerk is shown again')).toBeVisible();

  // A code already in use is refused beside the code field.
  await page.getByRole('button', { name: 'Add designation' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add designation' });
  await dialog.getByLabel(/Code/).fill('teacher');
  await dialog.getByLabel(/Name/).fill('Teacher again');
  await dialog.getByRole('button', { name: 'Add designation' }).click();
  await expect(dialog.getByText('This code is taken')).toBeVisible();
  await dialog.getByLabel(/Code/).fill('LIBRARIAN');
  await dialog.getByLabel(/Name/).fill('Librarian');
  await dialog.getByRole('button', { name: 'Add designation' }).click();
  await expect(page.getByText('Librarian added')).toBeVisible();
  await expect(rows).toHaveCount(5);
  expect(seen.writes).toContainEqual({ code: 'LIBRARIAN', name: 'Librarian' });
  expect(await axeViolations(page)).toEqual([]);
});

test('anyone but a Super Admin is told they have no access to the masters', async ({ page }) => {
  await signIn(page);
  await page.route(`${API}/masters/*`, async (route: Route) => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    return route.fulfill({ status: 403, headers: cors, json: failure(403, 'FORBIDDEN') });
  });
  await page.goto('/masters/');
  await expect(page.getByText("You don't have access to this", { exact: false })).toBeVisible();
});
