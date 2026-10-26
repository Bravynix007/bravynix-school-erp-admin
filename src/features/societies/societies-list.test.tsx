import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type * as SocietiesApiModule from './societies-api';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/api-error';
import { renderScreen } from '@/test/render';
import { summary } from '@/test/societies';
import { SocietiesList } from './societies-list';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const api = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock('./societies-api', async (original) => ({
  ...(await original<typeof SocietiesApiModule>()),
  societiesApi: api,
}));

const page = (items: ReturnType<typeof summary>[], totalItems = items.length) => ({
  items,
  meta: { page: 1, limit: 20, totalItems, totalPages: 1 },
});

beforeEach(() => {
  api.list.mockReset();
  push.mockReset();
});

describe('SocietiesList', () => {
  it('lists the Societies with code, institution count and status, and opens one on click', async () => {
    api.list.mockResolvedValue(
      page([summary(), summary({ id: 's2', code: 'NSS', name: 'Navodaya', status: 0, institutionCount: 0 })]),
    );
    renderScreen(<SocietiesList />);
    expect(await screen.findByText('Sri Vidya Educational Society')).toBeInTheDocument();
    expect(screen.getByText('SVES')).toBeInTheDocument();
    expect(screen.getAllByText('Inactive').length).toBeGreaterThan(0);
    expect(screen.getAllByText('2 Societies').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /Onboard Society/ })).toHaveAttribute('href', '/societies/new');

    await userEvent.click(screen.getByText('Sri Vidya Educational Society'));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/societies/workspace?id=s1'));
  });

  it('asks for the first page, sorted by name', async () => {
    api.list.mockResolvedValue(page([summary()]));
    renderScreen(<SocietiesList />);
    await screen.findByText('SVES');
    expect(api.list).toHaveBeenCalledWith({ page: 1, limit: 20, sort: 'name', q: '', status: '' });
  });

  it('searches once typing pauses, and filters by status', async () => {
    api.list.mockResolvedValue(page([summary()]));
    renderScreen(<SocietiesList />);
    await screen.findByText('SVES');

    await userEvent.type(screen.getByLabelText('Search Societies'), 'sun');
    await waitFor(() => expect(api.list).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'sun' })));
    const searched = api.list.mock.calls.filter(([query]) => query.q !== '' && query.q !== 'sun');
    expect(searched).toHaveLength(0);
  });

  it('shows the first-run empty state with a way to onboard', async () => {
    api.list.mockResolvedValue(page([]));
    renderScreen(<SocietiesList />);
    expect(await screen.findByText('No Societies yet')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Onboard Society' }).length).toBeGreaterThan(0);
  });

  it('says nothing matches, rather than "no Societies yet", when a search finds none', async () => {
    api.list.mockResolvedValueOnce(page([summary()])).mockResolvedValue(page([]));
    renderScreen(<SocietiesList />);
    await screen.findByText('SVES');
    await userEvent.type(screen.getByLabelText('Search Societies'), 'zzz');
    expect(await screen.findByText('No Societies match')).toBeInTheDocument();
  });

  it('shows the error with its code and Try again, and loads again on retry', async () => {
    api.list
      .mockRejectedValueOnce(new ApiError(500, 'INTERNAL_ERROR', 'x', 'req-9'))
      .mockResolvedValue(page([summary()]));
    renderScreen(<SocietiesList />);
    expect(await screen.findByText('INTERNAL_ERROR')).toBeInTheDocument();
    expect(screen.getByText('req-9')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('SVES')).toBeInTheDocument();
  });

  it('shows the 403 panel when the API refuses the Super Admin', async () => {
    api.list.mockRejectedValue(new ApiError(403, 'FORBIDDEN', 'x', 'r'));
    renderScreen(<SocietiesList />);
    expect(await screen.findByText("You don't have access to this")).toBeInTheDocument();
  });
});
