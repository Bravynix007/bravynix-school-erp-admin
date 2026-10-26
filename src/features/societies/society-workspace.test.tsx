import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type * as SocietiesApiModule from './societies-api';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/api-error';
import { renderScreen } from '@/test/render';
import { pausedSociety, society } from '@/test/societies';
import { SocietyWorkspace } from './society-workspace';

const replace = vi.fn();
let id: string | null = 's1';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => ({ get: () => id }),
}));

const api = vi.hoisted(() => ({
  get: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  deactivate: vi.fn(),
}));
vi.mock('./societies-api', async (original) => ({
  ...(await original<typeof SocietiesApiModule>()),
  societiesApi: api,
}));

beforeEach(() => {
  for (const fn of Object.values(api)) fn.mockReset();
  replace.mockReset();
  id = 's1';
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
    expect(screen.getByRole('button', { name: 'Pause access' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute('href', '/societies/edit?id=s1');
    expect(screen.getByRole('link', { name: 'Add Institution' })).toHaveAttribute(
      'href',
      '/institutions/new?societyId=s1',
    );
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

  it('pauses with a required reason and the version it read', async () => {
    api.get.mockResolvedValue(society());
    api.pause.mockResolvedValue(pausedSociety());
    renderScreen(<SocietyWorkspace />);
    await userEvent.click(await screen.findByRole('button', { name: 'Pause access' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Pause access' }));
    expect(within(dialog).getByText('Give the reason for the pause.')).toBeInTheDocument();
    expect(api.pause).not.toHaveBeenCalled();

    await userEvent.type(within(dialog).getByLabelText(/Reason/), '  Non-payment since August ');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Pause access' }));
    await waitFor(() =>
      expect(api.pause).toHaveBeenCalledWith('s1', { reason: 'Non-payment since August', version: 3 }),
    );
  });

  it('shows who paused it and why, and offers Resume instead of Pause', async () => {
    api.get.mockResolvedValue(pausedSociety());
    api.resume.mockResolvedValue(society({ version: 5 }));
    renderScreen(<SocietyWorkspace />);
    expect(await screen.findByText(/Access paused since/)).toHaveTextContent('Non-payment');
    expect(screen.queryByRole('button', { name: 'Pause access' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Resume access' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Resume access' }));
    await waitFor(() => expect(api.resume).toHaveBeenCalledWith('s1', { version: 3 }));
  });

  it('offers Reload when someone else changed the Society first', async () => {
    api.get.mockResolvedValue(society());
    api.pause.mockRejectedValue(new ApiError(409, 'VERSION_CONFLICT', 'x', 'r', [], { currentVersion: 4 }));
    renderScreen(<SocietyWorkspace />);
    await userEvent.click(await screen.findByRole('button', { name: 'Pause access' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText(/Reason/), 'Late fees');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Pause access' }));
    expect(await within(dialog).findByText(/Someone changed this record/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Reload' }));
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
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
    expect(screen.queryByRole('button', { name: 'Pause access' })).not.toBeInTheDocument();
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
});
