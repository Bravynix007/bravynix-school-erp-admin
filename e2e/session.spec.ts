import { API, envelope, expect, mockApi, test } from './fixtures';

test('a refresh that cannot connect keeps the session and offers Try again (review C1)', async ({ page }) => {
  let reachable = false;
  await page.unroute(`${API}/auth/refresh`);
  await mockApi(page, 'auth/refresh', () => envelope({ accessToken: 'access-2' }));
  // Registered last, so it runs first: offline until `reachable`.
  await page.route(`${API}/auth/refresh`, (route) =>
    reachable ? route.fallback() : route.abort('internetdisconnected'),
  );

  await page.goto('/dashboard/');
  await expect(page.getByRole('heading', { name: "Can't reach the server" })).toBeVisible();
  await expect(page).toHaveURL(/\/dashboard\/$/);

  reachable = true;
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
});

test('logging out in one tab signs every open tab out (re-review R-C2)', async ({ page, context }) => {
  const other = await context.newPage();
  for (const tab of [page, other]) {
    await tab.unroute(`${API}/auth/refresh`);
    await mockApi(tab, 'auth/refresh', () => envelope({ accessToken: 'access-1' }));
    await mockApi(tab, 'auth/logout', () => envelope(null));
  }

  await page.goto('/dashboard/');
  await other.goto('/dashboard/');
  await expect(other.getByRole('button', { name: 'Log out' })).toBeVisible();

  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/\/login\/$/);
  await expect(other).toHaveURL(/\/login\/$/);
  await expect(other.getByRole('button', { name: 'Log out' })).toHaveCount(0);
});
