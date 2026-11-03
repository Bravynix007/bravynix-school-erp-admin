import { axeViolations, envelope, expect, mockApi, signIn, test } from './fixtures';

const due = {
  id: 'd1',
  invoiceNo: 'BNX/FY2026-27/0007',
  societyId: 's1',
  societyName: 'Sri Vidya Educational Society',
  institution: { id: 'i1', name: 'Sri Vidya High School' },
  periodStartDate: '2026-10-01',
  periodEndDate: '2026-12-31',
  totalAmount: '80000.00',
  dueStatus: 1,
  dueDate: '2020-01-01',
  paidDate: null,
};

test('the dashboard shows the live figures, says "Not available yet" for the rest, and opens a due', async ({
  page,
}) => {
  await signIn(page);
  await mockApi(page, 'platform/dashboard', () =>
    envelope({
      societies: 3,
      institutions: 5,
      activeStudents: null,
      duesOutstandingAmount: '240000.00',
      duesCollectedThisMonthAmount: '118000.00',
      duesCollectedLastMonthAmount: '100000.00',
      openAiReports: null,
    }),
  );
  await mockApi(page, 'platform/access-blocks*', () => ({
    ...envelope([
      {
        id: 'b1',
        section: 'staff',
        societyId: 's1',
        societyName: 'Sri Vidya Educational Society',
        institutionId: 'i1',
        institutionName: 'Sri Vidya High School',
        reason: 'Annual fee unpaid',
        blockedAt: '2026-10-27T04:30:00.000Z',
        blockedBy: { id: 'p1', displayName: 'A. Rao', roleName: 'Super Admin' },
      },
    ]),
    meta: { page: 1, limit: 5, totalItems: 1, totalPages: 1 },
  }));
  await mockApi(page, 'platform/dues*', () => ({
    ...envelope([due]),
    meta: { page: 1, limit: 5, totalItems: 1, totalPages: 1 },
  }));
  await mockApi(page, 'platform/dues/d1', () =>
    envelope({
      ...due,
      studentCountAuto: 0,
      studentCount: 1600,
      studentCountNote: 'Register',
      priceRateId: 'r1',
      ratePerStudentAmount: '50.00',
      baseAmount: '80000.00',
      adjustmentAmount: '0.00',
      adjustmentNote: null,
      paymentMode: null,
      paymentReference: null,
      cancelledAt: null,
      cancelledBy: null,
      cancelReason: null,
      version: 1,
      createdBy: { id: 'p1', displayName: 'A. Rao', roleName: 'Super Admin' },
      createdAt: '2026-10-23T04:45:00.000Z',
      updatedBy: { id: 'p1', displayName: 'A. Rao', roleName: 'Super Admin' },
      updatedAt: '2026-10-23T04:45:00.000Z',
    }),
  );

  await page.goto('/dashboard/');
  const figures = page.getByRole('region', { name: 'Platform figures' });
  await expect(figures).toContainText('Societies');
  await expect(figures).toContainText('₹1 L');
  await expect(figures).toContainText('last month');
  await expect(figures.getByText('Not available yet')).toHaveCount(2);
  const queue = page.getByRole('region', { name: 'Open dues' });
  await expect(queue).toContainText('Past due');
  const blocked = page.getByRole('region', { name: 'Blocked access' });
  await expect(blocked).toContainText('Sri Vidya High School');
  await expect(blocked).toContainText('Staff blocked');
  await expect(blocked).toContainText('Annual fee unpaid');
  expect(await axeViolations(page)).toEqual([]);

  await queue.getByRole('link', { name: /BNX\/FY2026-27\/0007/ }).click();
  await expect(page).toHaveURL(/\/dues\/\?due=d1$/);
  await expect(page.getByRole('dialog', { name: 'BNX/FY2026-27/0007' })).toBeVisible();
});
