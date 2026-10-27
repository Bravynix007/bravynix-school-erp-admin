import type { Page, Route } from '@playwright/test';
import { API, axeViolations, envelope, expect, mockApi, signIn, test } from './fixtures';

const actor = { id: 'p1', displayName: 'A. Rao', roleName: 'Super Admin' };
const stamps = {
  createdBy: actor,
  createdAt: '2026-10-01T04:30:00.000Z',
  updatedBy: actor,
  updatedAt: '2026-10-02T04:30:00.000Z',
};
const society = (staffBlocked: boolean) => ({
  id: 's1',
  code: 'SVES',
  name: 'Sri Vidya Educational Society',
  description: null,
  email: null,
  phone: null,
  website: null,
  foundedDate: null,
  address: { line1: null, line2: null, pincode: null },
  status: 1,
  institutionCount: 1,
  version: 3,
  blockedSections: [],
  institutions: [
    {
      id: 'i1',
      code: 'SVHS',
      name: 'Sri Vidya High School',
      status: 1,
      blockedSections: staffBlocked ? ['staff'] : [],
    },
  ],
  owners: [{ id: 'o1', displayName: 'Asha Rao', email: 'asha@example.org', accountStatus: 1 }],
  ...stamps,
});
const staffBlock = {
  id: 'b1',
  section: 'staff',
  societyId: 's1',
  institutionId: 'i1',
  reason: 'Annual fee unpaid',
  blockedAt: '2026-10-27T04:30:00.000Z',
  blockedBy: actor,
};
const pageOf = (items: object[]) => ({
  ...envelope(items),
  meta: { page: 1, limit: 100, totalItems: items.length, totalPages: 1 },
});

const cors = {
  'Access-Control-Allow-Origin': 'http://localhost:3001',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Headers': '*',
};

/** Answers one method of a path, and lets CORS preflights pass. */
async function routeMethods(
  page: Page,
  path: string,
  answer: (route: Route, method: string) => { status: number; json: unknown },
) {
  await page.route(`${API}/${path}`, async (route) => {
    const method = route.request().method();
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const { status, json } = answer(route, method);
    return route.fulfill({ status, headers: cors, json });
  });
}

/** A Society whose staff block the console sets and lifts, the way the API would. */
async function mockBlockingApi(page: Page, posted: object[]) {
  let staffBlocked = false;
  await mockApi(page, 'platform/societies/s1', () => envelope(society(staffBlocked)));
  await routeMethods(page, 'platform/access-blocks*', (route, method) => {
    if (method === 'POST') {
      posted.push(route.request().postDataJSON() as object);
      staffBlocked = true;
      return { status: 201, json: envelope(staffBlock, 'CREATED', 201) };
    }
    return { status: 200, json: pageOf(staffBlocked ? [staffBlock] : []) };
  });
  await routeMethods(page, 'platform/access-blocks/b1', () => {
    staffBlocked = false;
    return { status: 200, json: envelope({ id: 'b1', status: 0 }) };
  });
}

test('Super Admin blocks the staff of an Institution with a reason, then lifts the block', async ({
  page,
}) => {
  await signIn(page);
  const posted: object[] = [];
  await mockBlockingApi(page, posted);
  await page.goto('/societies/workspace/?id=s1&tab=access');

  await page.getByRole('button', { name: 'Block staff of Sri Vidya High School' }).click();
  await page.getByLabel(/Reason/).fill('Annual fee unpaid');
  await page.getByRole('dialog').getByRole('button', { name: 'Block staff' }).click();

  await expect(page.getByText('Staff blocked').first()).toBeVisible();
  await expect(page.getByText(/Annual fee unpaid/)).toBeVisible();
  expect(posted).toEqual([
    { section: 'staff', societyId: 's1', institutionId: 'i1', reason: 'Annual fee unpaid' },
  ]);
  expect(await axeViolations(page)).toEqual([]);

  await page.getByRole('button', { name: 'Unblock staff of Sri Vidya High School' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Unblock staff' }).click();
  await expect(page.getByRole('button', { name: 'Block staff of Sri Vidya High School' })).toBeVisible();
  await expect(page.getByText('Staff blocked')).toHaveCount(0);
});

test('the Institutions list shows blocked sections and filters on them', async ({ page }) => {
  await signIn(page);
  const asked: string[] = [];
  await mockApi(page, 'platform/institutions*', (route) => {
    asked.push(route.request().url());
    return {
      ...envelope([
        {
          id: 'i1',
          societyId: 's1',
          societyName: 'Sri Vidya Educational Society',
          code: 'SVHS',
          name: 'Sri Vidya High School',
          place: null,
          boardCode: null,
          status: 1,
          blockedSections: ['students'],
          ...stamps,
        },
      ]),
      meta: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
    };
  });
  await page.goto('/institutions/');
  await expect(page.getByRole('heading', { name: 'Institutions', level: 1 })).toBeVisible();
  await expect(page.getByText('Students blocked')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Unblock students of Sri Vidya High School' })).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);

  await page.getByLabel('Access').selectOption('blocked');
  await expect.poll(() => asked.at(-1)).toContain('blocked=true');
});
