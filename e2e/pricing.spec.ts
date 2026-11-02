import type { Page, Route } from '@playwright/test';
import { API, axeViolations, envelope, expect, failure, mockApi, signIn, test } from './fixtures';

const actor = { id: 'p1', displayName: 'A. Rao', roleName: 'Super Admin' };
const stamps = {
  createdBy: actor,
  createdAt: '2026-10-01T04:30:00.000Z',
  updatedBy: actor,
  updatedAt: '2026-10-02T04:30:00.000Z',
};
const institution = {
  id: 'i1',
  societyId: 's1',
  societyName: 'Sri Vidya Educational Society',
  societyStatus: 1,
  code: 'SVHS',
  name: 'Sri Vidya High School',
  place: 'Whitefield',
  boardCode: 2,
  affiliationNumber: null,
  gstin: null,
  email: null,
  phone: null,
  telephone: null,
  address: { line1: '12 Lake Road', line2: null, pincode: null },
  location: null,
  status: 1,
  version: 2,
  blockedSections: [],
  ...stamps,
};
const rate = (id: string, amount: string, from: string, inForce: boolean, note: string | null = null) => ({
  id,
  institutionId: 'i1',
  ratePerStudentAmount: amount,
  effectiveFromDate: from,
  note,
  inForce,
  createdAt: '2026-05-28T10:10:00.000Z',
  createdBy: actor,
});

const cors = {
  'Access-Control-Allow-Origin': 'http://localhost:3001',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Headers': '*',
};

/** The rates of Institution i1, newest day first, as PLT-22 answers; PLT-23 adds one, or refuses a day that is taken. */
async function mockRates(page: Page, posted: object[]) {
  const rates = [rate('r1', '50.00', '2026-06-01', true, 'Renewal 2026')];
  await page.route(`${API}/platform/institutions/i1/price-rates`, async (route: Route) => {
    const method = route.request().method();
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (method === 'POST') {
      const body = route.request().postDataJSON() as {
        ratePerStudentAmount: string;
        effectiveFromDate: string;
      };
      posted.push(body);
      if (rates.some((r) => r.effectiveFromDate === body.effectiveFromDate)) {
        return route.fulfill({
          status: 409,
          headers: cors,
          json: failure(409, 'DUPLICATE', {
            errors: [{ field: 'effectiveFromDate', code: 'DUPLICATE', message: 'A rate starts on this day' }],
          }),
        });
      }
      const created = rate('r2', body.ratePerStudentAmount, body.effectiveFromDate, false);
      rates.unshift(created);
      return route.fulfill({ status: 201, headers: cors, json: envelope(created, 'CREATED', 201) });
    }
    return route.fulfill({ status: 200, headers: cors, json: envelope(rates) });
  });
}

test('Super Admin opens an Institution from the list, reads its rate history and sets a new rate', async ({
  page,
}) => {
  await signIn(page);
  const posted: object[] = [];
  await mockApi(page, 'platform/institutions/i1', () => envelope(institution));
  await mockRates(page, posted);
  await mockApi(page, 'platform/institutions?*', () => ({
    ...envelope([
      {
        id: 'i1',
        societyId: 's1',
        societyName: institution.societyName,
        code: 'SVHS',
        name: institution.name,
        place: null,
        boardCode: null,
        status: 1,
        blockedSections: [],
        ...stamps,
      },
    ]),
    meta: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
  }));

  await page.goto('/institutions/');
  await page
    .getByRole('button', { name: /Sri Vidya High School/ })
    .first()
    .click();
  await expect(page.getByRole('heading', { name: 'Sri Vidya High School', level: 1 })).toBeVisible();

  await page.getByRole('tab', { name: 'Pricing' }).click();
  const current = page.getByRole('region', { name: 'Rate in force' });
  await expect(current).toContainText('₹50.00');
  await expect(current).toContainText('In force since 01-06-2026');
  await expect(page.getByText('Renewal 2026')).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);

  await page.getByRole('button', { name: 'Set new rate' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel(/Rate per student/).fill('55');
  await dialog.getByLabel(/In force from/).fill('2026-06-01');
  await dialog.getByRole('button', { name: 'Set rate' }).click();
  // A rate already starts that day: the refusal sits beside the date and nothing was added.
  await expect(dialog.getByText('A rate already starts on this date. Choose another day.')).toBeVisible();

  await dialog.getByLabel(/In force from/).fill('2027-04-01');
  await dialog.getByRole('button', { name: 'Set rate' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('Rate set')).toBeVisible();
  await expect(page.getByText('Starts 01-04-2027')).toBeVisible();
  await expect(page.getByText('2 rates on file.', { exact: false })).toBeVisible();
  expect(posted).toEqual([
    { ratePerStudentAmount: '55.00', effectiveFromDate: '2026-06-01' },
    { ratePerStudentAmount: '55.00', effectiveFromDate: '2027-04-01' },
  ]);
  expect(await axeViolations(page)).toEqual([]);
});

test('a deactivated Institution shows its rates and offers no new one', async ({ page }) => {
  await signIn(page);
  await mockApi(page, 'platform/institutions/i1', () => envelope({ ...institution, status: 0 }));
  await mockRates(page, []);
  await page.goto('/institutions/workspace/?id=i1&tab=pricing');
  await expect(page.getByRole('region', { name: 'Rate in force' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Set new rate' })).toHaveCount(0);
});
