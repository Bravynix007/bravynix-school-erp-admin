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
