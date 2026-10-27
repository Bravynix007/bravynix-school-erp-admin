import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type * as SocietiesApiModule from './societies-api';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/api-error';
import { renderScreen } from '@/test/render';
import { society } from '@/test/societies';
import { EditSociety } from './edit-society';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => ({ get: () => id }),
}));
let id: string | null = 's1';

const api = vi.hoisted(() => ({ get: vi.fn(), update: vi.fn() }));
vi.mock('./societies-api', async (original) => ({
  ...(await original<typeof SocietiesApiModule>()),
  societiesApi: api,
}));

beforeEach(() => {
  id = 's1';
  api.get.mockReset().mockResolvedValue(society());
  api.update.mockReset();
  push.mockReset();
});

const save = () => userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

describe('EditSociety', () => {
  it.each([null, ''])('shows not found for the ID %j, and does not ask the API', async (missing) => {
    id = missing;
    renderScreen(<EditSociety />);
    expect(await screen.findByText(/no longer exists/)).toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
  });

  it('starts from what is stored and shows the code read-only', async () => {
    renderScreen(<EditSociety />);
    expect(await screen.findByLabelText(/Society name/)).toHaveValue('Sri Vidya Educational Society');
    expect(screen.getByLabelText('Code')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Email')).toHaveValue('office@svs.example.org');
  });

  it('says so when nothing changed, and sends nothing', async () => {
    renderScreen(<EditSociety />);
    await screen.findByLabelText(/Society name/);
    await save();
    expect(screen.getByText(/nothing to save/)).toBeInTheDocument();
    expect(api.update).not.toHaveBeenCalled();
  });

  it('sends the version and only the changed field, then returns to the Society', async () => {
    api.update.mockResolvedValue(society());
    renderScreen(<EditSociety />);
    const name = await screen.findByLabelText(/Society name/);
    await userEvent.clear(name);
    await userEvent.type(name, 'Sri Vidya Trust');
    await save();
    await waitFor(() => expect(push).toHaveBeenCalledWith('/societies/workspace?id=s1'));
    expect(api.update).toHaveBeenCalledWith('s1', { version: 3, name: 'Sri Vidya Trust' });
  });

  it('clears an optional field with null', async () => {
    api.update.mockResolvedValue(society());
    renderScreen(<EditSociety />);
    await userEvent.clear(await screen.findByLabelText('Email'));
    await save();
    await waitFor(() => expect(api.update).toHaveBeenCalledWith('s1', { version: 3, email: null }));
  });

  it('puts the API’s field error on its field', async () => {
    api.update.mockRejectedValue(
      new ApiError(400, 'VALIDATION_FAILED', 'x', 'r', [
        { field: 'email', code: 'INVALID_FORMAT', message: 'Not an email' },
      ]),
    );
    renderScreen(<EditSociety />);
    const email = await screen.findByLabelText('Email');
    await userEvent.clear(email);
    await userEvent.type(email, 'nope');
    await save();
    expect(await screen.findByText('Not an email')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('offers Reload after a version conflict and starts again from the stored values', async () => {
    api.update.mockRejectedValue(new ApiError(409, 'VERSION_CONFLICT', 'x', 'r'));
    renderScreen(<EditSociety />);
    const name = await screen.findByLabelText(/Society name/);
    await userEvent.type(name, ' X');
    await save();
    api.get.mockResolvedValue(society({ version: 4, name: 'Changed elsewhere' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Reload' }));
    expect(await screen.findByDisplayValue('Changed elsewhere')).toBeInTheDocument();
  });

  it('does not offer a form for a deactivated Society', async () => {
    api.get.mockResolvedValue(society({ status: 0 }));
    renderScreen(<EditSociety />);
    expect(await screen.findByText(/deactivated and can no longer be edited/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
  });
});
