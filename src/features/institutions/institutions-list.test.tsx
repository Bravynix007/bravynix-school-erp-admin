import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type * as BlocksApiModule from '@/features/blocks/blocks-api';
import type * as InstitutionsApiModule from './institutions-api';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/api-error';
import { institution } from '@/test/blocks';
import { renderScreen } from '@/test/render';
import { InstitutionsList } from './institutions-list';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

const api = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock('./institutions-api', async (original) => ({
  ...(await original<typeof InstitutionsApiModule>()),
  institutionsApi: api,
}));
const blocks = vi.hoisted(() => ({ block: vi.fn(), unblock: vi.fn() }));
vi.mock('@/features/blocks/blocks-api', async (original) => ({
  ...(await original<typeof BlocksApiModule>()),
  blocksApi: blocks,
}));

const page = (items: ReturnType<typeof institution>[], totalItems = items.length) => ({
  items,
  meta: { page: 1, limit: 20, totalItems, totalPages: 1 },
});

beforeEach(() => {
  api.list.mockReset();
  blocks.block.mockReset();
  blocks.unblock.mockReset();
  window.history.replaceState(null, '', '/institutions/');
});

describe('InstitutionsList', () => {
  it('lists the Institutions with their Society, status and blocked sections', async () => {
    api.list.mockResolvedValue(
      page([
        institution(),
        institution({ id: 'i2', code: 'NHS', name: 'Navodaya High', blockedSections: ['staff', 'students'] }),
      ]),
    );
    renderScreen(<InstitutionsList />);
    expect(await screen.findByText('Sri Vidya High School')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Sri Vidya Educational Society' })[0]).toHaveAttribute(
      'href',
      '/societies/workspace?id=s1',
    );
    expect(screen.getByText('Staff blocked')).toBeInTheDocument();
    expect(screen.getByText('Students blocked')).toBeInTheDocument();
    expect(screen.getAllByText('2 Institutions').length).toBeGreaterThan(0);
    expect(api.list).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      sort: 'name',
      q: '',
      status: '',
      blocked: '',
    });
  });

  it('has no way to add, edit or deactivate an Institution: Owners do that', async () => {
    api.list.mockResolvedValue(page([institution()]));
    renderScreen(<InstitutionsList />);
    await screen.findByText('SVHS');
    expect(screen.queryByRole('button', { name: /Add|Edit|Deactivate/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Add|Edit/ })).not.toBeInTheDocument();
  });

  it('filters by whether anything is blocked, and says nothing matches when no row does', async () => {
    api.list.mockResolvedValueOnce(page([institution()])).mockResolvedValue(page([]));
    renderScreen(<InstitutionsList />);
    await screen.findByText('SVHS');
    await userEvent.selectOptions(screen.getByLabelText('Access'), 'blocked');
    await waitFor(() =>
      expect(api.list).toHaveBeenLastCalledWith(expect.objectContaining({ blocked: 'blocked' })),
    );
    expect(await screen.findByText('No Institutions match')).toBeInTheDocument();
    expect(window.location.search).toContain('blocked=blocked');
  });

  it('blocks and unblocks a section from its row', async () => {
    api.list.mockResolvedValue(page([institution({ blockedSections: ['students'] })]));
    blocks.block.mockResolvedValue({});
    blocks.unblock.mockResolvedValue({ id: 'b1', status: 0 });
    renderScreen(<InstitutionsList />);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Block staff of Sri Vidya High School' }),
    );
    await userEvent.type(screen.getByLabelText(/Reason/), 'Fee unpaid');
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Block staff' }));
    await waitFor(() =>
      expect(blocks.block).toHaveBeenCalledWith({
        section: 'staff',
        societyId: 's1',
        institutionId: 'i1',
        reason: 'Fee unpaid',
      }),
    );
    // The list is read again after a block.
    await waitFor(() => expect(api.list.mock.calls.length).toBeGreaterThan(1));

    await userEvent.click(
      await screen.findByRole('button', { name: 'Unblock students of Sri Vidya High School' }),
    );
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Unblock students' }),
    );
    await waitFor(() =>
      expect(blocks.unblock).toHaveBeenCalledWith({
        section: 'students',
        societyId: 's1',
        institutionId: 'i1',
      }),
    );
  });

  it('moves focus to the list when the unblock takes the row out of a filtered list', async () => {
    window.history.replaceState(null, '', '/institutions/?blocked=blocked');
    api.list
      .mockResolvedValueOnce(page([institution({ blockedSections: ['students'] })]))
      .mockResolvedValue(page([]));
    blocks.unblock.mockResolvedValue({ id: 'b1', status: 0 });
    renderScreen(<InstitutionsList />);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Unblock students of Sri Vidya High School' }),
    );
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Unblock students' }),
    );

    expect(await screen.findByText('No Institutions match')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('group', { name: 'Institutions' })).toHaveFocus());
  });

  it('offers only Unblock on a deactivated Institution', async () => {
    api.list.mockResolvedValue(page([institution({ status: 0, blockedSections: ['staff'] })]));
    renderScreen(<InstitutionsList />);
    expect(
      await screen.findByRole('button', { name: 'Unblock staff of Sri Vidya High School' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Block / })).not.toBeInTheDocument();
  });

  it('reads the list again after a refused write, and keeps the refusal on screen when the row can no longer be blocked', async () => {
    api.list
      .mockResolvedValueOnce(page([institution()]))
      .mockResolvedValue(page([institution({ status: 0 })]));
    blocks.block.mockRejectedValue(new ApiError(409, 'INVALID_STATE', 'x', 'req-6'));
    renderScreen(<InstitutionsList />);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Block students of Sri Vidya High School' }),
    );
    await userEvent.type(screen.getByLabelText(/Reason/), 'Fee unpaid');
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Block students' }));
    await waitFor(() => expect(api.list.mock.calls.length).toBeGreaterThan(1));
    // The button is gone from the refreshed row; the dialog and its explanation stay.
    expect(
      await within(screen.getByRole('dialog')).findByText(
        'Sri Vidya High School or its Society is deactivated, so nothing can be blocked in it.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Block staff of Sri Vidya High School' })).toBeNull();

    // Closing the dialog leaves nothing to return focus to, so it goes to the list.
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.getByRole('group', { name: 'Institutions' })).toHaveFocus());
  });

  it('keeps the refusal on screen when the block was lifted elsewhere and the refresh drops the button', async () => {
    api.list
      .mockResolvedValueOnce(page([institution({ status: 0, blockedSections: ['students'] })]))
      .mockResolvedValue(page([institution({ status: 0 })]));
    blocks.unblock.mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'x', 'req-3'));
    renderScreen(<InstitutionsList />);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Unblock students of Sri Vidya High School' }),
    );
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Unblock students' }),
    );
    expect(await within(screen.getByRole('dialog')).findByText(/not blocked any more/)).toBeInTheDocument();
  });

  it('does not pull focus to the list when the row, and so its button, is still there after a write', async () => {
    api.list.mockResolvedValue(page([institution()]));
    blocks.block.mockResolvedValue({});
    renderScreen(<InstitutionsList />);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Block staff of Sri Vidya High School' }),
    );
    await userEvent.type(screen.getByLabelText(/Reason/), 'Fee unpaid');
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Block staff' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    // Let the check that looks for a vanished button run, then see that it did not take focus.
    await new Promise((resolve) => window.setTimeout(resolve, 10));
    expect(screen.getByRole('group', { name: 'Institutions' })).not.toHaveFocus();
  });

  it('shows the error with its retry when the list cannot load', async () => {
    api.list.mockRejectedValue(new ApiError(500, 'INTERNAL_ERROR', 'x', 'req-5'));
    renderScreen(<InstitutionsList />);
    expect(await screen.findByRole('button', { name: /Try again|Retry/ })).toBeInTheDocument();
  });

  it('shows the 403 panel for an operator who may not read the list', async () => {
    api.list.mockRejectedValue(new ApiError(403, 'FORBIDDEN', 'x', 'req-4'));
    renderScreen(<InstitutionsList />);
    expect(await screen.findByText(/don.t have access/i)).toBeInTheDocument();
  });

  it('shows the first-run empty state', async () => {
    api.list.mockResolvedValue(page([]));
    renderScreen(<InstitutionsList />);
    expect(await screen.findByText('No Institutions yet')).toBeInTheDocument();
  });
});
