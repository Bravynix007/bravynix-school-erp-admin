import { axeViolations, envelope, expect, mockApi, signIn, test } from './fixtures';

const actor = { id: 'p1', displayName: 'A. Rao', roleName: 'Super Admin' };
const stamps = {
  createdBy: actor,
  createdAt: '2026-10-23T04:45:00.000Z',
  updatedBy: actor,
  updatedAt: '2026-10-23T04:45:00.000Z',
};

const line = (status: number) => ({
  id: 'd1',
  invoiceNo: 'BNX/FY2026-27/0007',
  societyId: 's1',
  societyName: 'Sri Vidya Educational Society',
  institution: { id: 'i1', name: 'Sri Vidya High School' },
  periodStartDate: '2026-10-01',
  periodEndDate: '2026-12-31',
  totalAmount: '80000.00',
  dueStatus: status,
  dueDate: '2026-11-15',
  paidDate: status === 2 ? '2026-11-01' : null,
});
const full = (status: number) => ({
  ...line(status),
  studentCountAuto: 0,
  studentCount: 1650,
  studentCountNote: 'Counted from the register',
  priceRateId: 'r1',
  ratePerStudentAmount: '50.00',
  baseAmount: '82500.00',
  adjustmentAmount: '-2500.00',
  adjustmentNote: 'Festive discount',
  paymentMode: status === 2 ? 3 : null,
  paymentReference: null,
  cancelledAt: null,
  cancelledBy: null,
  cancelReason: null,
  version: status === 2 ? 2 : 1,
  ...stamps,
});
const page1 = (items: object[]) => ({
  ...envelope(items),
  meta: { page: 1, limit: 20, totalItems: items.length, totalPages: 1 },
});

test('Super Admin raises a due, reads how it was worked out and marks it paid', async ({ page }) => {
  await signIn(page);
  let status: number | null = null;
  const raised: object[] = [];
  const paid: object[] = [];
  await mockApi(page, 'platform/dashboard', () =>
    envelope({
      societies: 1,
      institutions: 1,
      activeStudents: null,
      duesOutstandingAmount: status === 1 ? '80000.00' : '0.00',
      duesCollectedThisMonthAmount: status === 2 ? '80000.00' : '0.00',
      duesCollectedLastMonthAmount: '0.00',
      openAiReports: null,
    }),
  );
  await mockApi(page, 'platform/dues*', (route) => {
    if (route.request().method() === 'POST') {
      raised.push(route.request().postDataJSON());
      status = 1;
      return envelope(full(1), 'CREATED', 201);
    }
    return page1(status === null ? [] : [line(status)]);
  });
  await mockApi(page, 'platform/dues/d1', () => envelope(full(status ?? 1)));
  await mockApi(page, 'platform/dues/d1/mark-paid', (route) => {
    paid.push(route.request().postDataJSON());
    status = 2;
    return envelope(full(2));
  });
  await mockApi(page, 'platform/institutions/i1/due-quote*', () =>
    envelope({
      institutionId: 'i1',
      periodStartDate: '2026-10-01',
      periodEndDate: '2026-12-31',
      studentCountAuto: 0,
      priceRateId: 'r1',
      ratePerStudentAmount: '50.00',
      rateEffectiveFromDate: '2026-06-01',
      baseAmount: '0.00',
    }),
  );
  await mockApi(page, 'platform/institutions?*', () => ({
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
        blockedSections: [],
        ...stamps,
      },
    ]),
    meta: { page: 1, limit: 8, totalItems: 1, totalPages: 1 },
  }));

  await page.goto('/dues/');
  await expect(page.getByRole('heading', { name: 'Dues and pricing', level: 1 })).toBeVisible();
  await expect(page.getByText('No dues yet')).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);

  await page.getByRole('button', { name: 'Raise a due' }).first().click();
  const form = page.getByRole('dialog', { name: 'Raise a due' });
  await form.getByLabel(/^Institution/).fill('sri');
  await form.getByRole('button', { name: /Sri Vidya High School/ }).click();
  await form.getByLabel(/Period starts/).fill('2026-10-01');
  await form.getByLabel(/Period ends/).fill('2026-12-31');
  await form.getByLabel(/Students/).fill('1650');
  await form.getByLabel(/Where the count comes from/).fill('Counted from the register');
  await form.getByLabel(/^Adjustment/).fill('-2500');
  await form.getByLabel(/Note for the Owners/).fill('Festive discount');
  await expect(form.getByLabel('Amount of this due')).toContainText('₹80,000.00');
  expect(await axeViolations(page)).toEqual([]);
  await form.getByRole('button', { name: 'Raise due' }).click();

  const sheet = page.getByRole('dialog', { name: 'BNX/FY2026-27/0007' });
  await expect(sheet).toBeVisible();
  await expect(page.getByText('Raised BNX/FY2026-27/0007')).toBeVisible();
  await expect(sheet.getByLabel('How the total was reached')).toContainText('1,650 students × ₹50.00');
  expect(raised).toEqual([
    {
      institutionId: 'i1',
      periodStartDate: '2026-10-01',
      periodEndDate: '2026-12-31',
      studentCount: 1650,
      studentCountNote: 'Counted from the register',
      adjustmentAmount: '-2500.00',
      adjustmentNote: 'Festive discount',
    },
  ]);
  expect(await axeViolations(page)).toEqual([]);

  await sheet.getByRole('button', { name: 'Mark as paid' }).click();
  const pay = page.getByRole('dialog', { name: /Mark BNX\/FY2026-27\/0007 as paid/ });
  await pay.getByLabel(/Paid on/).fill('2026-11-01');
  await pay.getByLabel(/Paid by/).selectOption({ label: 'UPI' });
  await pay.getByRole('button', { name: 'Mark as paid' }).click();
  await expect(page.getByText('Marked as paid')).toBeVisible();
  await expect(sheet.getByText('Paid on')).toBeVisible();
  await expect(sheet.getByRole('button', { name: 'Mark as paid' })).toHaveCount(0);
  expect(paid).toEqual([{ version: 1, paidDate: '2026-11-01', paymentMode: 3 }]);

  await page.reload();
  await expect(page.getByRole('dialog', { name: 'BNX/FY2026-27/0007' })).toBeVisible();
});

test('an Institution’s Dues tab lists its dues, and offers no new due once it is deactivated', async ({
  page,
}) => {
  await signIn(page);
  const institution = {
    id: 'i1',
    societyId: 's1',
    societyName: 'Sri Vidya Educational Society',
    societyStatus: 1,
    code: 'SVHS',
    name: 'Sri Vidya High School',
    place: null,
    boardCode: null,
    affiliationNumber: null,
    gstin: null,
    email: null,
    phone: null,
    telephone: null,
    address: { line1: null, line2: null, pincode: null },
    location: null,
    status: 0,
    version: 1,
    blockedSections: [],
    ...stamps,
  };
  await mockApi(page, 'platform/institutions/i1', () => envelope(institution));
  await mockApi(page, 'platform/dues*', () => page1([line(1)]));
  await page.goto('/institutions/workspace/?id=i1&tab=dues');
  await expect(page.getByText('BNX/FY2026-27/0007')).toBeVisible();
  await expect(page.getByText('1 due for Sri Vidya High School')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Raise a due' })).toHaveCount(0);
  expect(await axeViolations(page)).toEqual([]);
});
