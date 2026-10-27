import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/api-error';
import { renderScreen } from '@/test/render';
import { owner, ownerPage, superAdmin } from '@/test/users';
import type * as UsersApiModule from './users-api';
import { UsersPage } from './users-page';

const api = vi.hoisted(() => ({
  superAdmins: vi.fn(),
  addSuperAdmin: vi.fn(),
  removeSuperAdmin: vi.fn(),
  owners: vi.fn(),
  block: vi.fn(),
  unblock: vi.fn(),
  changeEmail: vi.fn(),
  resetAuthenticator: vi.fn(),
  unlock: vi.fn(),
}));
vi.mock('./users-api', async (original) => ({
  ...(await original<typeof UsersApiModule>()),
  usersApi: api,
}));

beforeEach(() => {
  window.history.replaceState(null, '', '/users/');
  for (const fn of Object.values(api)) fn.mockReset();
  api.superAdmins.mockResolvedValue([
    superAdmin(),
    superAdmin({
      id: 'u2',
      displayName: 'Ravi Nair',
      email: 'ravi@bravynix.in',
      seatNo: 2,
      authenticatorSetUp: false,
    }),
  ]);
  api.owners.mockResolvedValue(ownerPage([owner()]));
});

async function openSuperAdmin(name: string) {
  await userEvent.click(await screen.findByRole('button', { name: new RegExp(name) }));
  return screen.findByRole('dialog', { name });
}

describe('Super Admins', () => {
  it('lists the Super Admins by seat and counts them', async () => {
    renderScreen(<UsersPage />);
    expect(await screen.findByText('Ananya Rao')).toBeInTheDocument();
    expect(screen.getByText('2 of 3 Super Admins')).toBeInTheDocument();
    expect(screen.getByText('ravi@bravynix.in')).toBeInTheDocument();
  });

  it('cannot add a fourth Super Admin', async () => {
    api.superAdmins.mockResolvedValue(
      [1, 2, 3].map((n) => superAdmin({ id: `u${n}`, displayName: `Admin ${n}`, seatNo: n })),
    );
    renderScreen(<UsersPage />);
    await screen.findByText('Admin 3');
    expect(screen.getByRole('button', { name: 'Add Super Admin' })).toBeDisabled();
  });

  it('checks the email before calling the API, then adds with a lower-cased email', async () => {
    api.addSuperAdmin.mockResolvedValue(superAdmin({ id: 'u3', displayName: 'Meena Iyer' }));
    renderScreen(<UsersPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Add Super Admin' }));
    const dialog = screen.getByRole('dialog', { name: 'Add Super Admin' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add Super Admin' }));
    expect(await within(dialog).findByText('Enter the person’s email.')).toBeInTheDocument();
    expect(api.addSuperAdmin).not.toHaveBeenCalled();

    await userEvent.type(within(dialog).getByLabelText(/Email/), 'Meena@Bravynix.in');
    await userEvent.type(within(dialog).getByLabelText('First name'), 'Meena');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add Super Admin' }));
    await waitFor(() =>
      expect(api.addSuperAdmin).toHaveBeenCalledWith({ email: 'meena@bravynix.in', firstName: 'Meena' }),
    );
    expect(await screen.findByText('Meena Iyer added as Super Admin')).toBeInTheDocument();
  });

  it('explains a refused seat in the dialog', async () => {
    api.addSuperAdmin.mockRejectedValue(new ApiError(409, 'SEAT_LIMIT_REACHED', 'x', 'req-9'));
    renderScreen(<UsersPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Add Super Admin' }));
    const dialog = screen.getByRole('dialog', { name: 'Add Super Admin' });
    await userEvent.type(within(dialog).getByLabelText(/Email/), 'meena@bravynix.in');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add Super Admin' }));
    expect(
      await within(dialog).findByText('There are already three Super Admins. Remove one first.'),
    ).toBeInTheDocument();
    expect(within(dialog).getByText('SEAT_LIMIT_REACHED')).toBeInTheDocument();
  });

  it('blocks with a reason, sending the version the list showed', async () => {
    api.block.mockResolvedValue(superAdmin({ accountStatus: 2 }));
    renderScreen(<UsersPage />);
    const sheet = await openSuperAdmin('Ananya Rao');
    await userEvent.click(within(sheet).getByRole('button', { name: 'Block' }));
    const dialog = screen.getByRole('dialog', { name: 'Block Ananya Rao?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Block account' }));
    expect(await within(dialog).findByText(/Say why/)).toBeInTheDocument();
    expect(api.block).not.toHaveBeenCalled();

    await userEvent.type(within(dialog).getByLabelText(/Reason/), 'Left the company');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Block account' }));
    await waitFor(() =>
      expect(api.block).toHaveBeenCalledWith('u1', { reason: 'Left the company', version: 4 }),
    );
    expect(await screen.findByText('Ananya Rao blocked')).toBeInTheDocument();
  });

  it('offers Reload after a version conflict and shows the latest account', async () => {
    api.block.mockRejectedValue(new ApiError(409, 'VERSION_CONFLICT', 'x', 'req-4'));
    renderScreen(<UsersPage />);
    const sheet = await openSuperAdmin('Ananya Rao');
    await userEvent.click(within(sheet).getByRole('button', { name: 'Block' }));
    const dialog = screen.getByRole('dialog', { name: 'Block Ananya Rao?' });
    await userEvent.type(within(dialog).getByLabelText(/Reason/), 'Left the company');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Block account' }));
    api.superAdmins.mockClear();
    await userEvent.click(await within(dialog).findByRole('button', { name: 'Reload' }));
    await waitFor(() => expect(api.superAdmins).toHaveBeenCalled());
    expect(screen.queryByRole('dialog', { name: 'Block Ananya Rao?' })).not.toBeInTheDocument();
  });

  it('shows why a blocked account is blocked, and unblocks it', async () => {
    api.superAdmins.mockResolvedValue([
      superAdmin({
        accountStatus: 2,
        blockedAt: '2026-10-20T04:30:00.000Z',
        blockReason: 'Left the company',
      }),
    ]);
    api.unblock.mockResolvedValue(superAdmin());
    renderScreen(<UsersPage />);
    const sheet = await openSuperAdmin('Ananya Rao');
    expect(within(sheet).getByText(/Left the company/)).toBeInTheDocument();
    expect(within(sheet).queryByRole('button', { name: 'Block' })).not.toBeInTheDocument();
    await userEvent.click(within(sheet).getByRole('button', { name: 'Unblock' }));
    await userEvent.click(
      within(screen.getByRole('dialog', { name: 'Unblock Ananya Rao?' })).getByRole('button', {
        name: 'Unblock account',
      }),
    );
    await waitFor(() => expect(api.unblock).toHaveBeenCalledWith('u1', { version: 4 }));
  });

  it('changes the email, lower-cased, with the version', async () => {
    api.changeEmail.mockResolvedValue(superAdmin());
    renderScreen(<UsersPage />);
    const sheet = await openSuperAdmin('Ananya Rao');
    await userEvent.click(within(sheet).getByRole('button', { name: 'Change email' }));
    const dialog = screen.getByRole('dialog', { name: 'Change email' });
    const field = within(dialog).getByLabelText(/New email/);
    await userEvent.clear(field);
    await userEvent.type(field, 'New.Address@Bravynix.in');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Change email' }));
    await waitFor(() =>
      expect(api.changeEmail).toHaveBeenCalledWith('u1', { email: 'new.address@bravynix.in', version: 4 }),
    );
  });

  it('says the email belongs to someone else', async () => {
    api.changeEmail.mockRejectedValue(new ApiError(409, 'EMAIL_IN_USE', 'x', 'req-5'));
    renderScreen(<UsersPage />);
    const sheet = await openSuperAdmin('Ananya Rao');
    await userEvent.click(within(sheet).getByRole('button', { name: 'Change email' }));
    const dialog = screen.getByRole('dialog', { name: 'Change email' });
    const field = within(dialog).getByLabelText(/New email/);
    await userEvent.clear(field);
    await userEvent.type(field, 'x');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Change email' }));
    expect(await within(dialog).findByText('Enter a valid email address.')).toBeInTheDocument();
    await userEvent.type(field, '@b.co');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Change email' }));
    expect(
      await within(dialog).findByText('This email already belongs to another person.'),
    ).toBeInTheDocument();
  });

  it('does not send an email that is the same as the current one', async () => {
    renderScreen(<UsersPage />);
    const sheet = await openSuperAdmin('Ananya Rao');
    await userEvent.click(within(sheet).getByRole('button', { name: 'Change email' }));
    const dialog = screen.getByRole('dialog', { name: 'Change email' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Change email' }));
    expect(await within(dialog).findByText('Enter a different email.')).toBeInTheDocument();
    expect(api.changeEmail).not.toHaveBeenCalled();
  });

  it('drops the API’s message about a field as soon as the field is edited', async () => {
    api.changeEmail.mockRejectedValue(
      new ApiError(409, 'DUPLICATE', 'x', 'req-6', [
        { field: 'email', code: 'DUPLICATE', message: 'Already used here' },
      ]),
    );
    renderScreen(<UsersPage />);
    const sheet = await openSuperAdmin('Ananya Rao');
    await userEvent.click(within(sheet).getByRole('button', { name: 'Change email' }));
    const dialog = screen.getByRole('dialog', { name: 'Change email' });
    const field = within(dialog).getByLabelText(/New email/);
    await userEvent.clear(field);
    await userEvent.type(field, 'taken@bravynix.in');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Change email' }));
    expect(await within(dialog).findByText('Already used here')).toBeInTheDocument();

    await userEvent.type(field, 'x');
    expect(within(dialog).queryByText('Already used here')).not.toBeInTheDocument();
  });

  it('sends a block once when the button is clicked twice before the dialog shows it is busy', async () => {
    api.block.mockImplementation(() => new Promise(() => {}));
    renderScreen(<UsersPage />);
    const sheet = await openSuperAdmin('Ananya Rao');
    await userEvent.click(within(sheet).getByRole('button', { name: 'Block' }));
    const dialog = screen.getByRole('dialog', { name: 'Block Ananya Rao?' });
    await userEvent.type(within(dialog).getByLabelText(/Reason/), 'Left');
    const submit = within(dialog).getByRole('button', { name: 'Block account' });
    act(() => {
      submit.click();
      submit.click();
    });
    await waitFor(() => expect(api.block).toHaveBeenCalledTimes(1));
  });

  it('unlocks sign-in with a reason, and says when there is nothing to unlock', async () => {
    api.unlock.mockRejectedValue(new ApiError(409, 'NOT_LOCKED', 'x', 'req-6'));
    renderScreen(<UsersPage />);
    const sheet = await openSuperAdmin('Ananya Rao');
    await userEvent.click(within(sheet).getByRole('button', { name: 'Unlock sign-in' }));
    const dialog = screen.getByRole('dialog', { name: /Unlock sign-in for Ananya Rao/ });
    await userEvent.type(within(dialog).getByLabelText(/Reason/), 'Phone lost');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Unlock sign-in' }));
    expect(api.unlock).toHaveBeenCalledWith('u1', { reason: 'Phone lost' });
    expect(
      await within(dialog).findByText('This person is not locked out, so there is nothing to unlock.'),
    ).toBeInTheDocument();
  });

  it('resets an authenticator only where one is set up, and explains a lock', async () => {
    api.resetAuthenticator.mockRejectedValue(new ApiError(409, 'AUTHENTICATOR_LOCKED', 'x', 'req-7'));
    renderScreen(<UsersPage />);
    const second = await openSuperAdmin('Ravi Nair');
    expect(within(second).queryByRole('button', { name: 'Reset authenticator' })).not.toBeInTheDocument();
    expect(within(second).getByText(/Not set up yet/)).toBeInTheDocument();
    await userEvent.click(within(second).getByRole('button', { name: 'Close' }));

    const first = await openSuperAdmin('Ananya Rao');
    await userEvent.click(within(first).getByRole('button', { name: 'Reset authenticator' }));
    const dialog = screen.getByRole('dialog', { name: /Reset the authenticator of Ananya Rao/ });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Reset authenticator' }));
    expect(await within(dialog).findByText(/Unlock their sign-in first/)).toBeInTheDocument();
  });

  it('removes a Super Admin after a confirmation that says what happens', async () => {
    api.removeSuperAdmin.mockResolvedValue({ id: 'u2', status: 0 });
    renderScreen(<UsersPage />);
    const sheet = await openSuperAdmin('Ravi Nair');
    await userEvent.click(within(sheet).getByRole('button', { name: 'Remove Super Admin' }));
    const dialog = screen.getByRole('dialog', { name: /Remove Ravi Nair as Super Admin/ });
    expect(within(dialog).getByText(/account is not deleted/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Remove Super Admin' }));
    await waitFor(() => expect(api.removeSuperAdmin).toHaveBeenCalledWith('u2'));
  });

  it('after a removal, lets go of the person in the URL and puts focus on the list, since their row is gone', async () => {
    api.removeSuperAdmin.mockImplementation(() => {
      api.superAdmins.mockResolvedValue([superAdmin()]);
      return Promise.resolve({ id: 'u2', status: 0 });
    });
    renderScreen(<UsersPage />);
    const sheet = await openSuperAdmin('Ravi Nair');
    await userEvent.click(within(sheet).getByRole('button', { name: 'Remove Super Admin' }));
    const dialog = screen.getByRole('dialog', { name: /Remove Ravi Nair as Super Admin/ });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Remove Super Admin' }));
    await waitFor(() => expect(screen.getByRole('group', { name: 'Super Admins' })).toHaveFocus());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(window.location.search).not.toContain('person=');
  });

  it('shows the error banner with a retry when the list cannot load', async () => {
    api.superAdmins.mockRejectedValue(new ApiError(500, 'INTERNAL_ERROR', 'x', 'req-8'));
    renderScreen(<UsersPage />);
    expect(await screen.findByText('INTERNAL_ERROR')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});

describe('Society Owners', () => {
  async function openOwners() {
    renderScreen(<UsersPage />);
    await userEvent.click(await screen.findByRole('tab', { name: 'Society Owners' }));
    return screen.findByText('asha@example.org');
  }

  it('lists the Owners with their Society and searches by name or email', async () => {
    await openOwners();
    expect(screen.getByText('Sri Vidya Educational Society')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Search Owners'), 'ash');
    await waitFor(() => expect(api.owners).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'ash' })));
  });

  it('opens an Owner with their Society and the account actions, without Super Admin ones', async () => {
    await openOwners();
    await userEvent.click(screen.getByRole('button', { name: /Asha Rao/ }));
    const sheet = await screen.findByRole('dialog', { name: 'Asha Rao' });
    expect(within(sheet).getByRole('link', { name: 'Sri Vidya Educational Society' })).toHaveAttribute(
      'href',
      '/societies/workspace?id=s1',
    );
    expect(within(sheet).getByRole('button', { name: 'Block' })).toBeInTheDocument();
    expect(within(sheet).queryByRole('button', { name: 'Remove Super Admin' })).not.toBeInTheDocument();
    expect(within(sheet).queryByRole('button', { name: 'Reset authenticator' })).not.toBeInTheDocument();
  });

  it('says no Owners match a search that finds nothing', async () => {
    api.owners.mockResolvedValue(ownerPage([]));
    renderScreen(<UsersPage />);
    await userEvent.click(await screen.findByRole('tab', { name: 'Society Owners' }));
    expect(await screen.findByText('No Owners yet')).toBeInTheDocument();
  });

  it('keeps the tab and the open person in the URL, and opens them again from a shared link', async () => {
    const first = renderScreen(<UsersPage />);
    await userEvent.click(await screen.findByRole('tab', { name: 'Society Owners' }));
    expect(window.location.search).toBe('?tab=owners');
    await userEvent.click(await screen.findByRole('button', { name: /Asha Rao/ }));
    expect(window.location.search).toBe('?tab=owners&person=o1&society=s1');
    await userEvent.click(
      within(screen.getByRole('dialog', { name: 'Asha Rao' })).getByRole('button', { name: 'Close' }),
    );
    expect(window.location.search).toBe('?tab=owners');
    await userEvent.click(screen.getByRole('tab', { name: 'Super Admins' }));
    expect(window.location.search).toBe('');
    first.unmount();

    window.history.replaceState(null, '', '/users/?tab=owners&person=o1&society=s1');
    renderScreen(<UsersPage />);
    expect(await screen.findByRole('dialog', { name: 'Asha Rao' })).toBeInTheDocument();
  });

  it('tells apart one person who owns two Societies: a row, a URL and a sheet for each', async () => {
    api.owners.mockResolvedValue(
      ownerPage([
        owner(),
        owner({ seatNo: 2, society: { id: 's2', code: 'NSS', name: 'Navodaya Society' } }),
      ]),
    );
    const first = renderScreen(<UsersPage />);
    await userEvent.click(await screen.findByRole('tab', { name: 'Society Owners' }));
    const rows = await screen.findAllByRole('button', { name: /Asha Rao/ });
    expect(rows).toHaveLength(2);

    await userEvent.click(rows[1]!);
    expect(window.location.search).toBe('?tab=owners&person=o1&society=s2');
    const sheet = await screen.findByRole('dialog', { name: 'Asha Rao' });
    expect(within(sheet).getByRole('link', { name: 'Navodaya Society' })).toBeInTheDocument();
    expect(within(sheet).getByText('Seat 2')).toBeInTheDocument();
    first.unmount();

    window.history.replaceState(null, '', '/users/?tab=owners&person=o1&society=s2');
    renderScreen(<UsersPage />);
    expect(await screen.findByRole('link', { name: 'Navodaya Society' })).toBeInTheDocument();
  });

  it('closes for good when an email change takes the Owner out of the search', async () => {
    window.history.replaceState(null, '', '/users/?tab=owners&q=asha&person=o1&society=s1');
    api.owners.mockImplementation(({ q }: { q?: string }) =>
      Promise.resolve(ownerPage(q === 'asha' && api.changeEmail.mock.calls.length > 0 ? [] : [owner()])),
    );
    api.changeEmail.mockResolvedValue(owner({ email: 'new@example.org', version: 3 }));
    renderScreen(<UsersPage />);
    const sheet = await screen.findByRole('dialog', { name: 'Asha Rao' });
    await userEvent.click(within(sheet).getByRole('button', { name: 'Change email' }));
    const dialog = screen.getByRole('dialog', { name: 'Change email' });
    await userEvent.clear(within(dialog).getByLabelText(/New email/));
    await userEvent.type(within(dialog).getByLabelText(/New email/), 'new@example.org');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Change email' }));
    await waitFor(() => expect(screen.getByRole('group', { name: 'Society Owners' })).toHaveFocus());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(window.location.search).not.toContain('person=');
  });

  it('opens nothing for a person who is not in the list, such as a stale link', async () => {
    window.history.replaceState(null, '', '/users/?person=gone');
    renderScreen(<UsersPage />);
    await screen.findByText('Ananya Rao');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // A link that was never shown is not "lost": the URL keeps it and focus is not moved to the list.
    expect(window.location.search).toContain('person=gone');
    expect(document.body).toHaveFocus();
  });
});
