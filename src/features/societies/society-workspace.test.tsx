import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type * as SocietiesApiModule from './societies-api';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/api-error';
import { renderScreen } from '@/test/render';
import { society } from '@/test/societies';
import { SocietyWorkspace } from './society-workspace';

const replace = vi.fn();
let id: string | null = 's1';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => ({
    get: (key: string) => (key === 'id' ? id : new URLSearchParams(window.location.search).get(key)),
  }),
}));

const api = vi.hoisted(() => ({
  get: vi.fn(),
  deactivate: vi.fn(),
  addOwner: vi.fn(),
  removeOwner: vi.fn(),
}));
vi.mock('./societies-api', async (original) => ({
  ...(await original<typeof SocietiesApiModule>()),
  societiesApi: api,
}));

beforeEach(() => {
  for (const fn of Object.values(api)) fn.mockReset();
  replace.mockReset();
  id = 's1';
  window.history.replaceState(null, '', '/societies/workspace/?id=s1');
});

describe('SocietyWorkspace', () => {
  it('shows the profile, the stamps and the actions of an active Society', async () => {
    api.get.mockResolvedValue(society());
    renderScreen(<SocietyWorkspace />);
    expect(
      await screen.findByRole('heading', { name: 'Sri Vidya Educational Society', level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText('office@svs.example.org')).toBeInTheDocument();
    expect(screen.getByText('+91 9876543210')).toBeInTheDocument();
    expect(screen.getByText(/Founded 01-06-1998/)).toBeInTheDocument();
    expect(screen.getByText(/Added by A. Rao/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Deactivate' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Add Institution' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute('href', '/societies/edit?id=s1');
  });

  it('lists the Owners with a seat count and the Institutions on their own tabs', async () => {
    api.get.mockResolvedValue(society());
    renderScreen(<SocietyWorkspace />);
    await screen.findByRole('heading', { level: 1 });
    await userEvent.click(screen.getByRole('tab', { name: /Owners/ }));
    expect(screen.getByText('Asha Rao')).toBeInTheDocument();
    expect(screen.getByText('1 of 3 Owners')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: /Institutions/ }));
    expect(screen.getByText('Sri Vidya High School')).toBeInTheDocument();
  });

  it('keeps the open tab in the URL, and opens it again from a shared link', async () => {
    api.get.mockResolvedValue(society());
    const first = renderScreen(<SocietyWorkspace />);
    await screen.findByRole('heading', { level: 1 });
    await userEvent.click(screen.getByRole('tab', { name: /Owners/ }));
    expect(window.location.search).toBe('?id=s1&tab=owners');
    await userEvent.click(screen.getByRole('tab', { name: 'Overview' }));
    expect(window.location.search).toBe('?id=s1');
    first.unmount();

    window.history.replaceState(null, '', '/societies/workspace/?id=s1&tab=institutions');
    renderScreen(<SocietyWorkspace />);
    expect(await screen.findByText('Sri Vidya High School')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Institutions/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('ignores a tab name it does not know', async () => {
    window.history.replaceState(null, '', '/societies/workspace/?id=s1&tab=nonsense');
    api.get.mockResolvedValue(society());
    renderScreen(<SocietyWorkspace />);
    await screen.findByRole('heading', { level: 1 });
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
  });

  it('shows the error inside the confirmation when the API refuses, and keeps the Society', async () => {
    api.get.mockResolvedValue(society());
    api.deactivate.mockRejectedValue(new ApiError(409, 'INVALID_STATE', 'x', 'req-3'));
    renderScreen(<SocietyWorkspace />);
    await userEvent.click(await screen.findByRole('button', { name: 'Deactivate' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Deactivate Society' }));
    expect(await within(dialog).findByText('INVALID_STATE')).toBeInTheDocument();
    // The copy says "Reload", so the dialog offers it.
    expect(within(dialog).getByRole('button', { name: 'Reload' })).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('deactivates after a confirmation that says what happens, then returns to the list', async () => {
    api.get.mockResolvedValue(society());
    api.deactivate.mockResolvedValue({ id: 's1', status: 0 });
    renderScreen(<SocietyWorkspace />);
    await userEvent.click(await screen.findByRole('button', { name: 'Deactivate' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/signed out/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Deactivate Society' }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/societies'));
    expect(api.deactivate).toHaveBeenCalledWith('s1');
  });

  it('shows a deactivated Society without actions', async () => {
    api.get.mockResolvedValue(society({ status: 0 }));
    renderScreen(<SocietyWorkspace />);
    expect(await screen.findByText(/This Society is deactivated/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Deactivate' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument();
  });

  it('says the record is gone for a 404 and for a link without an ID', async () => {
    api.get.mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'x', 'r'));
    const view = renderScreen(<SocietyWorkspace />);
    expect(await screen.findByText(/no longer exists/)).toBeInTheDocument();
    view.unmount();
    id = null;
    renderScreen(<SocietyWorkspace />);
    expect(screen.getByText(/no longer exists/)).toBeInTheDocument();
  });

  it('adds an Owner from the Owners tab and shows the seat limit when the API refuses', async () => {
    api.get.mockResolvedValue(society());
    api.addOwner.mockRejectedValueOnce(new ApiError(409, 'SEAT_LIMIT_REACHED', 'x', 'req-5'));
    renderScreen(<SocietyWorkspace />);
    await screen.findByRole('heading', { level: 1 });
    await userEvent.click(screen.getByRole('tab', { name: /Owners/ }));
    await userEvent.click(screen.getAllByRole('button', { name: 'Add an Owner' })[0]!);
    const dialog = screen.getByRole('dialog', { name: 'Add Owner' });
    await userEvent.type(within(dialog).getByLabelText(/Email/), 'Meena@Example.org');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add Owner' }));
    expect(
      await within(dialog).findByText('This Society already has 3 Owners. Remove one first.'),
    ).toBeInTheDocument();
    expect(api.addOwner).toHaveBeenCalledWith('s1', { email: 'meena@example.org' });
  });

  it('removes an Owner after a confirmation, and explains the last-Owner rule', async () => {
    api.get.mockResolvedValue(society());
    api.removeOwner.mockRejectedValue(new ApiError(409, 'LAST_OWNER', 'x', 'req-6'));
    renderScreen(<SocietyWorkspace />);
    await screen.findByRole('heading', { level: 1 });
    await userEvent.click(screen.getByRole('tab', { name: /Owners/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Remove Asha Rao' }));
    const dialog = screen.getByRole('dialog', { name: /Remove Asha Rao as Owner/ });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Remove Owner' }));
    expect(api.removeOwner).toHaveBeenCalledWith('s1', 'o1');
    expect(await within(dialog).findByText(/must keep at least one Owner/)).toBeInTheDocument();
  });

  it('offers no Owner changes on a deactivated Society', async () => {
    api.get.mockResolvedValue(society({ status: 0 }));
    renderScreen(<SocietyWorkspace />);
    await screen.findByRole('heading', { level: 1 });
    await userEvent.click(screen.getByRole('tab', { name: /Owners/ }));
    expect(screen.queryByRole('button', { name: 'Add an Owner' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove Asha Rao' })).not.toBeInTheDocument();
  });
});
