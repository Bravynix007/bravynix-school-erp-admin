import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type * as BlocksApiModule from '@/features/blocks/blocks-api';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/api-error';
import { block } from '@/test/blocks';
import { renderScreen } from '@/test/render';
import { society } from '@/test/societies';
import { SocietyAccess } from './society-access';

const api = vi.hoisted(() => ({ list: vi.fn(), block: vi.fn(), unblock: vi.fn() }));
vi.mock('@/features/blocks/blocks-api', async (original) => ({
  ...(await original<typeof BlocksApiModule>()),
  blocksApi: api,
}));

const page = (items: ReturnType<typeof block>[]) => ({
  items,
  meta: { page: 1, limit: 100, totalItems: items.length, totalPages: 1 },
});

const institution = (blockedSections: ('staff' | 'students')[] = [], status = 1) => ({
  id: 'i1',
  code: 'SVHS',
  name: 'Sri Vidya High School',
  status,
  blockedSections,
});

beforeEach(() => {
  for (const fn of Object.values(api)) fn.mockReset();
  api.list.mockResolvedValue(page([]));
});

describe('SocietyAccess', () => {
  it('offers to block the Owners, and the staff and students of each Institution', async () => {
    renderScreen(<SocietyAccess society={society()} />);
    expect(
      await screen.findByRole('button', { name: 'Block Owners of Sri Vidya Educational Society' }),
    ).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Block staff of Sri Vidya High School' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Block students of Sri Vidya High School' })).toBeEnabled();
    expect(api.list).toHaveBeenCalledWith({ societyId: 's1', limit: 100 });
  });

  it('shows what is blocked with its reason and who blocked it, and offers to unblock it', async () => {
    api.list.mockResolvedValue(page([block()]));
    renderScreen(<SocietyAccess society={society({ institutions: [institution(['staff'])] })} />);
    expect(await screen.findByText(/Annual fee unpaid/)).toHaveTextContent('A. Rao');
    expect(screen.getByText('Staff blocked')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Unblock staff of Sri Vidya High School' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Block students of Sri Vidya High School' }),
    ).toBeInTheDocument();
  });

  it('blocks a section after a reason, and sends the Institution with it', async () => {
    api.block.mockResolvedValue(block());
    renderScreen(<SocietyAccess society={society()} />);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Block staff of Sri Vidya High School' }),
    );
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/Its Owners are not affected/)).toBeInTheDocument();
    await userEvent.type(within(dialog).getByLabelText(/Reason/), 'Annual fee unpaid');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Block staff' }));
    expect(api.block).toHaveBeenCalledWith({
      section: 'staff',
      societyId: 's1',
      institutionId: 'i1',
      reason: 'Annual fee unpaid',
    });
    expect(await screen.findByText('Staff of Sri Vidya High School blocked')).toBeInTheDocument();
  });

  it('blocks the Owners without an Institution', async () => {
    api.block.mockResolvedValue(block({ section: 'owners', institutionId: null }));
    renderScreen(<SocietyAccess society={society()} />);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Block Owners of Sri Vidya Educational Society' }),
    );
    await userEvent.type(screen.getByLabelText(/Reason/), 'Terms not accepted');
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Block Owners' }));
    expect(api.block).toHaveBeenCalledWith({
      section: 'owners',
      societyId: 's1',
      reason: 'Terms not accepted',
    });
  });

  it('asks for a reason before it blocks anything', async () => {
    renderScreen(<SocietyAccess society={society()} />);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Block students of Sri Vidya High School' }),
    );
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Block students' }));
    expect(screen.getByText(/Say why/)).toBeInTheDocument();
    expect(api.block).not.toHaveBeenCalled();
  });

  it('says so in the dialog when the section was blocked by someone else a moment ago', async () => {
    api.block.mockRejectedValue(new ApiError(409, 'DUPLICATE', 'x', 'req-9'));
    renderScreen(<SocietyAccess society={society()} />);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Block staff of Sri Vidya High School' }),
    );
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText(/Reason/), 'Fee');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Block staff' }));
    expect(await within(dialog).findByText(/already blocked/)).toBeInTheDocument();
    expect(within(dialog).getByText('DUPLICATE')).toBeInTheDocument();
  });

  it('unblocks after a confirmation', async () => {
    api.list.mockResolvedValue(page([block()]));
    api.unblock.mockResolvedValue({ id: 'b1', status: 0 });
    renderScreen(<SocietyAccess society={society({ institutions: [institution(['staff'])] })} />);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Unblock staff of Sri Vidya High School' }),
    );
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/work again on their next request/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Unblock staff' }));
    expect(api.unblock).toHaveBeenCalledWith({ section: 'staff', societyId: 's1', institutionId: 'i1' });
    expect(await screen.findByText('Staff of Sri Vidya High School unblocked')).toBeInTheDocument();
  });

  it('explains an unblock of a section that someone else already unblocked', async () => {
    api.list.mockResolvedValue(page([block()]));
    api.unblock.mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'x', 'req-8'));
    renderScreen(<SocietyAccess society={society({ institutions: [institution(['staff'])] })} />);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Unblock staff of Sri Vidya High School' }),
    );
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Unblock staff' }));
    expect(await within(dialog).findByText(/not blocked any more/)).toBeInTheDocument();
  });

  it('offers no new block on a deactivated Society or Institution, but still lets a block be lifted', async () => {
    api.list.mockResolvedValue(page([block()]));
    renderScreen(
      <SocietyAccess
        society={society({
          status: 0,
          blockedSections: ['owners'],
          institutions: [institution(['staff'], 0)],
        })}
      />,
    );
    await screen.findByText(/Annual fee unpaid/);
    expect(screen.queryByRole('button', { name: /^Block / })).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Unblock Owners of Sri Vidya Educational Society' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Unblock staff of Sri Vidya High School' }),
    ).toBeInTheDocument();
  });

  it('offers no block on an active Institution of a deactivated Society', async () => {
    renderScreen(<SocietyAccess society={society({ status: 0, institutions: [institution([], 1)] })} />);
    await screen.findByText('Owners of this Society');
    expect(screen.queryByRole('button', { name: /^Block / })).not.toBeInTheDocument();
  });

  it('shows each Institution its own reason, not another one’s for the same section', async () => {
    api.list.mockResolvedValue(
      page([
        block({ id: 'b1', institutionId: 'i1', reason: 'Fee unpaid at the High School' }),
        block({ id: 'b2', institutionId: 'i2', reason: 'Audit pending at the Primary' }),
      ]),
    );
    renderScreen(
      <SocietyAccess
        society={society({
          institutions: [
            institution(['staff']),
            { id: 'i2', code: 'SVPS', name: 'Sri Vidya Primary', status: 1, blockedSections: ['staff'] },
          ],
        })}
      />,
    );
    const high = (await screen.findByText(/Fee unpaid at the High School/)).closest('li')!;
    expect(within(high).queryByText(/Audit pending/)).not.toBeInTheDocument();
    const primary = screen.getByText(/Audit pending at the Primary/).closest('li')!;
    expect(within(primary).queryByText(/Fee unpaid/)).not.toBeInTheDocument();
  });

  it('shows a refusal in the dialog and not the one before it, after the dialog is reopened', async () => {
    api.block.mockRejectedValue(new ApiError(409, 'DUPLICATE', 'x', 'req-9'));
    renderScreen(<SocietyAccess society={society()} />);
    const open = () => screen.findByRole('button', { name: 'Block staff of Sri Vidya High School' });
    await userEvent.click(await open());
    await userEvent.type(screen.getByLabelText(/Reason/), 'Fee');
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Block staff' }));
    await within(screen.getByRole('dialog')).findByText(/already blocked/);
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    await userEvent.click(await open());
    expect(within(screen.getByRole('dialog')).queryByText(/already blocked/)).not.toBeInTheDocument();
  });

  it('keeps the buttons when the reasons cannot be loaded', async () => {
    api.list.mockRejectedValue(new ApiError(500, 'INTERNAL_ERROR', 'x', 'req-7'));
    renderScreen(<SocietyAccess society={society({ institutions: [institution(['staff'])] })} />);
    expect(await screen.findByText(/reasons for the blocks could not be loaded/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Unblock staff of Sri Vidya High School' }),
    ).toBeInTheDocument();
  });
});
