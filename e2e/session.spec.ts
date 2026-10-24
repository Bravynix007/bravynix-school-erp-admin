import { API, envelope, expect, failure, mockApi, test } from './fixtures';

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

test('a tab that finds the cookie refused on load ends the session in the others (final pass)', async ({
  page,
  context,
}) => {
  await page.unroute(`${API}/auth/refresh`);
  await mockApi(page, 'auth/refresh', () => envelope({ accessToken: 'access-1' }));
  await page.goto('/dashboard/');
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();

  // The session was revoked elsewhere; a new tab is the first to ask.
  const other = await context.newPage();
  await mockApi(
    other,
    'auth/refresh',
    () => failure(401, 'REFRESH_TOKEN_INVALID', { data: { reason: 'admin_revoked' } }),
    401,
  );
  await other.goto('/dashboard/');
  await expect(other).toHaveURL(/\/login\/$/);
  await expect(page.getByRole('heading', { name: 'Session ended' })).toBeVisible();
});
