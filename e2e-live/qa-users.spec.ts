import { execFileSync } from 'node:child_process';
import { expect, test, type Page } from '@playwright/test';
import { API, knownSecret, sharedOperator } from './operator';

/**
 * QA attacks on C3 against the real API (fresh database). Two Super Admins act
 * at once for the version races. `sql` opens the code-request gates between
 * sign-ins, sets locks, and reads rows as the database owner.
 */
function sql(statement: string): string {
  return execFileSync('su', ['postgres', '-c', `psql -qtA -d school_erp_live -c "${statement}"`])
    .toString()
    .trim();
}

function openGates(): void {
  sql(
    "update otp_challenges set created_at = created_at - interval '20 minutes', expires_at = expires_at - interval '20 minutes'; delete from public_call_counters",
  );
}

const SOCIETY_B = '00000000-0000-7000-8000-000000001002';
const SO_A2 = '00000000-0000-7000-8000-000000003005';

/** Each write the page sends, as `METHOD path status`, from the moment it is called. */
function recordWrites(page: Page, path: RegExp): string[] {
  const writes: string[] = [];
  page.on('response', (response) => {
    const method = response.request().method();
    const url = response.url().replace(API, '');
    if (method !== 'GET' && method !== 'OPTIONS' && path.test(url)) {
      writes.push(`${method} ${url} ${response.status()}`);
    }
  });
  return writes;
}

/** What has focus, as a short label. */
async function focused(page: Page): Promise<string> {
  return page.evaluate(() => {
    const element = document.activeElement as HTMLElement | null;
    if (!element || element === document.body) return 'body';
    return `${element.tagName.toLowerCase()} ${(element.getAttribute('aria-label') ?? element.innerText).replace(/\s+/g, ' ').trim().slice(0, 60)}`;
  });
}

async function ownersTab(page: Page, search: string): Promise<void> {
  await page.goto('/users/?tab=owners');
  await page.getByLabel('Search Owners').fill(search);
  // The search is sent after a 300 ms pause.
  await page.waitForTimeout(800);
}

const ownerRow = (page: Page, text: string) =>
  page.getByRole('row').filter({ hasText: text }).getByRole('button').first();

test.describe('QA: C3 Users page against the real API', () => {
  test.describe.configure({ timeout: 150_000 });
  let a: Page;
  let b: Page;

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(150_000);
    // A Super Admin whose setup key this worker does not know (a fresh worker, or one after a failed test)
    // enrols again. Run with the other live specs, the shared sessions are reused as they are.
    for (const email of ['sa1@two-worlds.test', 'sa2@two-worlds.test']) {
      if (!knownSecret(email)) {
        sql(
          `delete from user_totp_factors where user_id = (select id from users where email = '${email}'); delete from mfa_challenges`,
        );
      }
    }
    openGates();
    ({ page: a } = await sharedOperator(browser, 'sa1@two-worlds.test'));
    openGates();
    ({ page: b } = await sharedOperator(browser, 'sa2@two-worlds.test'));
  });

  test('U1 an Owner of two Societies: one Add, two rows, the link opens the right one, a block shows on both', async () => {
    const writes = recordWrites(a, /owners|block|unblock/);
    await a.goto(`/societies/workspace/?id=${SOCIETY_B}&tab=owners`);
    await a.getByRole('button', { name: 'Add an Owner' }).first().click();
    const add = a.getByRole('dialog', { name: 'Add Owner' });
    await add.getByLabel(/Email/).fill('so-a2@two-worlds.test');
    await add.getByRole('button', { name: 'Add Owner' }).dblclick();
    await expect(a.getByText('2 of 3 Owners')).toBeVisible();

    await ownersTab(a, 'so-a2@');
    await expect(a.getByRole('row').filter({ hasText: 'so-a2@two-worlds.test' })).toHaveCount(2);
    await ownerRow(a, 'Society B').click();
    await expect(a).toHaveURL(
      new RegExp(`person=${SO_A2}.*society=${SOCIETY_B}|society=${SOCIETY_B}.*person=${SO_A2}`),
    );
    await a.reload();
    const sheet = a
      .getByRole('dialog')
      .filter({ has: a.getByRole('heading', { level: 2 }) })
      .first();
    await expect(sheet.getByRole('link', { name: 'Society B' })).toBeVisible();
    await expect(sheet.getByText('Society A')).toHaveCount(0);

    await sheet.getByRole('button', { name: 'Block', exact: true }).click();
    const block = a.getByRole('dialog', { name: /^Block / });
    await block.getByLabel(/Reason/).fill('<b>Unpaid</b> & "fees"');
    await block.getByRole('button', { name: 'Block account' }).dblclick();
    await expect(sheet.getByText('<b>Unpaid</b> & "fees"', { exact: false })).toBeVisible();
    await expect(sheet.locator('b')).toHaveCount(0);
    // The Block button became Unblock in place, so focus stays on the sheet's action.
    console.log('U1 focus after Block:', await focused(a));
    expect(await focused(a)).toMatch(/Unblock/);
    await expect(
      a.getByRole('row').filter({ hasText: 'so-a2@two-worlds.test' }).getByText('Blocked'),
    ).toHaveCount(2);

    // Unblock from the other row, with the version its row now lists.
    await sheet.getByRole('button', { name: 'Close' }).click();
    await ownerRow(a, 'Society A').click();
    await sheet.getByRole('button', { name: 'Unblock' }).click();
    await a
      .getByRole('dialog', { name: /^Unblock / })
      .getByRole('button', { name: 'Unblock account' })
      .dblclick();
    await expect(sheet.getByRole('button', { name: 'Block', exact: true })).toBeVisible();
    await a.waitForTimeout(500);
    console.log('U1 writes:', writes.join(', '));
    expect(writes.map((w) => w.replace(/[0-9a-f-]{36}/g, ':id'))).toEqual([
      'POST /platform/societies/:id/owners 201',
      'POST /platform/users/:id/block 200',
      'POST /platform/users/:id/unblock 200',
    ]);
  });

  test('U2 a block with a version another operator moved on is refused, Reload shows the latest, and it then works', async () => {
    await ownersTab(a, 'so-a1@');
    await ownerRow(a, 'so-a1@').click();
    const sheetA = a.getByRole('dialog').first();

    // Meanwhile operator B blocks and unblocks the same person.
    await ownersTab(b, 'so-a1@');
    await ownerRow(b, 'so-a1@').click();
    const sheetB = b.getByRole('dialog').first();
    await sheetB.getByRole('button', { name: 'Block', exact: true }).click();
    await b
      .getByRole('dialog', { name: /^Block / })
      .getByLabel(/Reason/)
      .fill('B was here');
    await b
      .getByRole('dialog', { name: /^Block / })
      .getByRole('button', { name: 'Block account' })
      .click();
    await sheetB.getByRole('button', { name: 'Unblock' }).click();
    await b
      .getByRole('dialog', { name: /^Unblock / })
      .getByRole('button', { name: 'Unblock account' })
      .click();
    await expect(sheetB.getByRole('button', { name: 'Block', exact: true })).toBeVisible();

    await sheetA.getByRole('button', { name: 'Block', exact: true }).click();
    const block = a.getByRole('dialog', { name: /^Block / });
    await block.getByLabel(/Reason/).fill('A, late');
    await block.getByRole('button', { name: 'Block account' }).click();
    await expect(block.getByText(/Someone changed this record/)).toBeVisible();
    await block.getByRole('button', { name: 'Reload' }).click();
    await expect(block).toHaveCount(0);
    await sheetA.getByRole('button', { name: 'Block', exact: true }).click();
    await a
      .getByRole('dialog', { name: /^Block / })
      .getByLabel(/Reason/)
      .fill('A, after reload');
    await a
      .getByRole('dialog', { name: /^Block / })
      .getByRole('button', { name: 'Block account' })
      .click();
    await expect(sheetA.getByText(/A, after reload/)).toBeVisible();
    expect(
      sql("select account_status || '|' || block_reason from users where email = 'so-a1@two-worlds.test'"),
    ).toBe('2|A, after reload');
    await sheetA.getByRole('button', { name: 'Unblock' }).click();
    await a
      .getByRole('dialog', { name: /^Unblock / })
      .getByRole('button', { name: 'Unblock account' })
      .click();
    await expect(sheetA.getByRole('button', { name: 'Block', exact: true })).toBeVisible();
  });

  test('U3 Change email: the same email in another case is refused before any call, a taken one says so, one click of two goes', async () => {
    const writes = recordWrites(a, /\/email$/);
    await ownersTab(a, 'so-a3@');
    await ownerRow(a, 'so-a3@').click();
    const sheet = a.getByRole('dialog').first();
    await sheet.getByRole('button', { name: 'Change email' }).click();
    const dialog = a.getByRole('dialog', { name: 'Change email' });
    await dialog.getByLabel(/New email/).fill('  SO-A3@Two-Worlds.test ');
    await dialog.getByRole('button', { name: 'Change email' }).click();
    await expect(dialog.getByText('Enter a different email.')).toBeVisible();
    expect(writes).toEqual([]);

    await dialog.getByLabel(/New email/).fill('so-a1@two-worlds.test');
    await dialog.getByRole('button', { name: 'Change email' }).click();
    await expect(dialog.getByText('This email already belongs to another person.')).toBeVisible();

    await dialog.getByLabel(/New email/).fill('qa-so-a3@two-worlds.test');
    await dialog.getByRole('button', { name: 'Change email' }).dblclick();
    await expect(sheet.getByText('qa-so-a3@two-worlds.test')).toBeVisible();
    await a.waitForTimeout(500);
    console.log('U3 writes:', writes.join(', '));
    expect(writes.map((w) => w.replace(/[0-9a-f-]{36}/g, ':id'))).toEqual([
      'PUT /platform/users/:id/email 409',
      'PUT /platform/users/:id/email 200',
    ]);
  });

  test('U4 changing the email of an Owner found by that email: the sheet and the URL after the row leaves the search', async () => {
    await ownersTab(a, 'so-b1@');
    await ownerRow(a, 'so-b1@').click();
    const sheet = a.getByRole('dialog').first();
    await sheet.getByRole('button', { name: 'Change email' }).click();
    const dialog = a.getByRole('dialog', { name: 'Change email' });
    await dialog.getByLabel(/New email/).fill('qa-moved-b1@two-worlds.test');
    await dialog.getByRole('button', { name: 'Change email' }).click();
    await expect(a.getByText('Email changed')).toBeVisible();
    await a.waitForTimeout(800);
    const state = {
      dialogs: await a.getByRole('dialog').count(),
      url: a.url().replace(/[0-9a-f-]{36}/g, ':id'),
      focus: await focused(a),
      rows: await a.getByRole('row').filter({ hasText: 'two-worlds.test' }).count(),
    };
    console.log('U4 after the row left the search:', JSON.stringify(state));
    // Clearing the search brings the row back.
    await a.getByLabel('Search Owners').fill('');
    await a.waitForTimeout(800);
    const reopened = await a.getByRole('dialog').count();
    console.log('U4 after clearing the search, dialogs open:', reopened);
    expect(sql("select count(*) from users where email = 'qa-moved-b1@two-worlds.test'")).toBe('1');
    // D2: the sheet went with the row, but the URL kept the person, so focus fell to the body and the sheet
    // came back on its own when the search was cleared.
    expect.soft(state.url, 'the URL should let go of a person no longer listed').not.toContain('person=');
    expect.soft(state.focus, 'focus should land in the list, not on the body').not.toBe('body');
    expect.soft(reopened, 'clearing the search should not reopen a sheet nobody asked for').toBe(0);
  });

  test('U5 acting on your own account is refused with plain copy, and nothing changes', async () => {
    const before = sql("select version from users where email = 'sa1@two-worlds.test'");
    await a.goto('/users/');
    await a.getByRole('row').filter({ hasText: 'sa1@two-worlds.test' }).getByRole('button').first().click();
    const sheet = a.getByRole('dialog').first();
    const self = "You can't do this to your own account.";
    const seen: string[] = [];

    await sheet.getByRole('button', { name: 'Block', exact: true }).click();
    let dialog = a.getByRole('dialog', { name: /^Block / });
    await dialog.getByLabel(/Reason/).fill('self');
    await dialog.getByRole('button', { name: 'Block account' }).click();
    await expect(dialog.getByText(self)).toBeVisible();
    seen.push('block');
    await dialog.getByRole('button', { name: 'Cancel' }).click();

    await sheet.getByRole('button', { name: 'Change email' }).click();
    dialog = a.getByRole('dialog', { name: 'Change email' });
    await dialog.getByLabel(/New email/).fill('sa1-new@two-worlds.test');
    await dialog.getByRole('button', { name: 'Change email' }).click();
    await expect(dialog.getByText(self)).toBeVisible();
    seen.push('email');
    await dialog.getByRole('button', { name: 'Cancel' }).click();

    await sheet.getByRole('button', { name: 'Reset authenticator' }).click();
    dialog = a.getByRole('dialog', { name: /^Reset the authenticator/ });
    await dialog.getByRole('button', { name: 'Reset authenticator' }).click();
    await expect(dialog.getByText(self)).toBeVisible();
    seen.push('reset');
    await dialog.getByRole('button', { name: 'Cancel' }).click();

    await sheet.getByRole('button', { name: 'Remove Super Admin' }).click();
    dialog = a.getByRole('dialog', { name: /as Super Admin\?/ });
    await dialog.getByRole('button', { name: 'Remove Super Admin' }).click();
    await expect(dialog.getByText(self)).toBeVisible();
    seen.push('remove');
    await dialog.getByRole('button', { name: 'Cancel' }).click();

    console.log('U5 refused with the self copy:', seen.join(', '));
    expect(sql("select version from users where email = 'sa1@two-worlds.test'")).toBe(before);
  });

  test('U6 focus: Cancel and Esc go back to the action, Esc closes only the top layer, closing the sheet returns to the row', async () => {
    await a.goto('/users/');
    const row = a.getByRole('row').filter({ hasText: 'sa2@two-worlds.test' }).getByRole('button').first();
    await row.focus();
    await a.keyboard.press('Enter');
    const sheet = a.getByRole('dialog').first();
    await sheet.getByRole('button', { name: 'Change email' }).click();
    await expect(a.getByRole('dialog', { name: 'Change email' })).toBeVisible();
    await a.keyboard.press('Escape');
    await expect(a.getByRole('dialog', { name: 'Change email' })).toHaveCount(0);
    await expect(sheet).toBeVisible();
    const afterEsc = await focused(a);

    await sheet.getByRole('button', { name: 'Unlock sign-in' }).click();
    await a
      .getByRole('dialog', { name: /^Unlock sign-in/ })
      .getByRole('button', { name: 'Cancel' })
      .click();
    const afterCancel = await focused(a);

    await a.keyboard.press('Escape');
    await expect(a.getByRole('dialog')).toHaveCount(0);
    const afterSheet = await focused(a);
    console.log('U6 focus:', JSON.stringify({ afterEsc, afterCancel, afterSheet }));
    expect(afterEsc).toMatch(/Change email/);
    expect(afterCancel).toMatch(/Unlock sign-in/);
    expect(afterSheet).toMatch(/sa2@two-worlds\.test/);
  });

  test('U7 the reason: blank and 501 characters are refused before any call', async () => {
    const writes = recordWrites(a, /block/);
    await a.goto('/users/');
    await a.getByRole('row').filter({ hasText: 'sa2@two-worlds.test' }).getByRole('button').first().click();
    await a.getByRole('dialog').first().getByRole('button', { name: 'Block', exact: true }).click();
    const dialog = a.getByRole('dialog', { name: /^Block / });
    await dialog.getByLabel(/Reason/).fill('    ');
    await dialog.getByRole('button', { name: 'Block account' }).click();
    await expect(dialog.getByText(/Say why/)).toBeVisible();
    await dialog.getByLabel(/Reason/).fill(` ${'x'.repeat(501)} `);
    await dialog.getByRole('button', { name: 'Block account' }).click();
    await expect(dialog.getByText('Use at most 500 characters.')).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    expect(writes).toEqual([]);
  });

  test('U8 Add Super Admin by double click adds one, the third seat disables Add, and Remove frees it', async () => {
    const writes = recordWrites(a, /super-admins/);
    await a.goto('/users/');
    await a.getByRole('button', { name: 'Add Super Admin' }).click();
    const add = a.getByRole('dialog', { name: 'Add Super Admin' });
    await add.getByLabel(/Email/).fill('sa4-candidate@two-worlds.test');
    await add.getByRole('button', { name: 'Add Super Admin' }).dblclick();
    await expect(a.getByText('3 of 3 Super Admins')).toBeVisible();
    await expect(a.getByRole('button', { name: 'Add Super Admin' })).toBeDisabled();

    await a.getByRole('row').filter({ hasText: 'sa4-candidate@' }).getByRole('button').first().click();
    const sheet = a.getByRole('dialog').first();
    await expect(sheet.getByRole('button', { name: 'Reset authenticator' })).toHaveCount(0);
    await sheet.getByRole('button', { name: 'Remove Super Admin' }).click();
    await a
      .getByRole('dialog', { name: /as Super Admin\?/ })
      .getByRole('button', { name: 'Remove Super Admin' })
      .dblclick();
    await expect(a.getByText('2 of 3 Super Admins')).toBeVisible();
    await expect(a.getByRole('dialog')).toHaveCount(0);
    await a.waitForTimeout(500);
    const focus = await focused(a);
    console.log('U8 writes:', writes.join(', '), '| focus after Remove:', focus);
    expect(writes.map((w) => w.replace(/[0-9a-f-]{36}/g, ':id'))).toEqual([
      'POST /platform/super-admins 201',
      'DELETE /platform/super-admins/:id 200',
    ]);
    // D1: the removed person's row was the sheet's way back, and it is gone.
    expect.soft(focus, 'focus should land in the list, not on the body').toMatch(/^div Super Admins/);
  });

  test('U9 Unlock lifts a real lock once; a locked authenticator is not reset until unlocked; Reset by double click resets once', async () => {
    const writes = recordWrites(a, /unlock|mfa$/);
    sql(
      "update users set locked_until = now() + interval '30 minutes' where email = 'so-a1@two-worlds.test'",
    );
    await ownersTab(a, 'so-a1@');
    await ownerRow(a, 'so-a1@').click();
    let sheet = a.getByRole('dialog').first();
    await sheet.getByRole('button', { name: 'Unlock sign-in' }).click();
    let unlock = a.getByRole('dialog', { name: /^Unlock sign-in/ });
    await unlock.getByLabel(/Reason/).fill('Called the office');
    await unlock.getByRole('button', { name: 'Unlock sign-in' }).dblclick();
    await expect(a.getByText('Sign-in unlocked')).toBeVisible();
    expect(
      sql(
        "select locked_until is null or locked_until <= now() from users where email = 'so-a1@two-worlds.test'",
      ),
    ).toBe('t');

    sql(
      "update user_totp_factors set locked_until = now() + interval '1 day' where user_id = (select id from users where email = 'sa2@two-worlds.test')",
    );
    await a.goto('/users/');
    await a.getByRole('row').filter({ hasText: 'sa2@two-worlds.test' }).getByRole('button').first().click();
    sheet = a.getByRole('dialog').first();
    await sheet.getByRole('button', { name: 'Reset authenticator' }).click();
    const reset = a.getByRole('dialog', { name: /^Reset the authenticator/ });
    await reset.getByRole('button', { name: 'Reset authenticator' }).click();
    await expect(reset.getByText(/Unlock their sign-in first/)).toBeVisible();
    await reset.getByRole('button', { name: 'Cancel' }).click();
    await sheet.getByRole('button', { name: 'Unlock sign-in' }).click();
    unlock = a.getByRole('dialog', { name: /^Unlock sign-in/ });
    await unlock.getByLabel(/Reason/).fill('Lost phone');
    await unlock.getByRole('button', { name: 'Unlock sign-in' }).click();
    await expect(unlock).toHaveCount(0);
    await sheet.getByRole('button', { name: 'Reset authenticator' }).click();
    await a
      .getByRole('dialog', { name: /^Reset the authenticator/ })
      .getByRole('button', { name: 'Reset authenticator' })
      .dblclick();
    await expect(a.getByText('Authenticator reset')).toBeVisible();
    await expect(sheet.getByRole('button', { name: 'Reset authenticator' })).toHaveCount(0);
    await a.waitForTimeout(500);
    console.log('U9 writes:', writes.join(', '));
    expect(writes.map((w) => w.replace(/[0-9a-f-]{36}/g, ':id'))).toEqual([
      'POST /platform/users/:id/unlock 200',
      'DELETE /platform/users/:id/mfa 409',
      'POST /platform/users/:id/unlock 200',
      'DELETE /platform/users/:id/mfa 200',
    ]);
    // Operator B's session ended with the reset.
    await b.goto('/users/');
    await expect(b).toHaveURL(/\/login\//, { timeout: 15_000 });
  });

  test('U10 Owner seats: a blocked person is refused, a full Society offers no Add, Remove by double click removes once and focus stays in Owners', async () => {
    const writes = recordWrites(a, /owners/);
    await a.goto(`/societies/workspace/?id=${SOCIETY_B}&tab=owners`);
    await a.getByRole('button', { name: 'Add an Owner' }).first().click();
    const add = a.getByRole('dialog', { name: 'Add Owner' });
    await add.getByLabel(/Email/).fill('edge-blocked@two-worlds.test');
    await add.getByRole('button', { name: 'Add Owner' }).click();
    await expect(add.getByText('This person’s account is blocked. Unblock it first.')).toBeVisible();
    await add.getByRole('button', { name: 'Cancel' }).click();

    await a.goto('/societies/workspace/?id=00000000-0000-7000-8000-000000001001&tab=owners');
    await expect(a.getByText('3 of 3 Owners')).toBeVisible();
    await expect(a.getByRole('button', { name: 'Add an Owner' })).toHaveCount(0);

    await a.goto(`/societies/workspace/?id=${SOCIETY_B}&tab=owners`);
    const removeButtons = a.getByRole('button', { name: /^Remove / });
    await removeButtons.last().click();
    await a.getByRole('dialog').getByRole('button', { name: 'Remove Owner' }).dblclick();
    await expect(a.getByText('1 of 3 Owners')).toBeVisible();
    await a.waitForTimeout(500);
    const focus = await focused(a);
    console.log('U10 writes:', writes.join(', '), '| focus after Remove:', focus);
    expect(writes.map((w) => w.replace(/[0-9a-f-]{36}/g, ':id'))).toEqual([
      'POST /platform/societies/:id/owners 409',
      'DELETE /platform/societies/:id/owners/:id 200',
    ]);
    expect(focus).toMatch(/^div Owners/);
  });
});
