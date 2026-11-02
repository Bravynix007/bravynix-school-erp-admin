import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/api-error';
import { due } from '@/test/dues';
import { renderScreen } from '@/test/render';
import { DueSheet } from './due-sheet';

const api = vi.hoisted(() => ({
  get: vi.fn(),
  edit: vi.fn(),
  markPaid: vi.fn(),
  cancel: vi.fn(),
}));
vi.mock('./dues-api', () => ({ duesApi: api }));

const onClose = vi.fn();
/** The dialog of an action; the sheet behind it is a dialog too. */
const formDialog = () => screen.getByRole('dialog', { name: /^(Edit|Mark|Cancel) / });
const show = () => renderScreen(<DueSheet id="d1" onClose={onClose} />);

/** Today is 10 Nov 2026 in India. */
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-10T06:00:00Z'));
});
afterEach(() => vi.useRealTimers());

beforeEach(() => {
  for (const fn of Object.values(api)) fn.mockReset();
  onClose.mockReset();
  api.get.mockResolvedValue(due());
});

describe('DueSheet', () => {
  it('shows how the total was reached, the notes, the dates and who added it', async () => {
    show();
    expect(await screen.findByRole('heading', { name: 'BNX/FY2026-27/0007' })).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('d1');
    const breakdown = screen.getByLabelText('How the total was reached');
    expect(within(breakdown).getByText('1,650 students × ₹50.00')).toBeInTheDocument();
    expect(within(breakdown).getByText('₹82,500.00')).toBeInTheDocument();
    expect(within(breakdown).getByText('Counted from the register')).toBeInTheDocument();
    expect(within(breakdown).getByText('Adjustment')).toBeInTheDocument();
    expect(within(breakdown).getByText('Festive discount')).toBeInTheDocument();
    expect(within(breakdown).getByText('₹80,000.00')).toBeInTheDocument();
    expect(screen.getByText('01-10-2026 to 31-12-2026')).toBeInTheDocument();
    expect(screen.getByText('15-11-2026')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sri Vidya High School' })).toHaveAttribute(
      'href',
      '/institutions/workspace?id=i1',
    );
    expect(screen.getByRole('link', { name: 'Sri Vidya Educational Society' })).toHaveAttribute(
      'href',
      '/societies/workspace?id=s1',
    );
    expect(screen.getByText(/Added by A. Rao/)).toBeInTheDocument();
  });

  it('leaves the adjustment out when there is none', async () => {
    api.get.mockResolvedValue(due({ adjustmentAmount: '0.00', adjustmentNote: null }));
    show();
    const breakdown = await screen.findByLabelText('How the total was reached');
    expect(within(breakdown).queryByText('Adjustment')).not.toBeInTheDocument();
  });

  it('offers Edit, Mark as paid and Cancel due only while the due is open', async () => {
    api.get.mockResolvedValue(
      due({ dueStatus: 2, paidDate: '2026-11-01', paymentMode: 3, paymentReference: 'UTR 2291' }),
    );
    show();
    expect(await screen.findByText('Paid on')).toBeInTheDocument();
    expect(screen.getByText('01-11-2026')).toBeInTheDocument();
    expect(screen.getByText('UPI')).toBeInTheDocument();
    expect(screen.getByText('UTR 2291')).toBeInTheDocument();
    for (const name of ['Edit', 'Mark as paid', 'Cancel due']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    }
  });

  it('shows who cancelled a due, and why', async () => {
    api.get.mockResolvedValue(
      due({
        dueStatus: 0,
        cancelledAt: '2026-11-01T05:00:00.000Z',
        cancelledBy: { id: 'p1', displayName: 'A. Rao', roleName: 'Super Admin' },
        cancelReason: 'Raised twice',
      }),
    );
    show();
    expect(await screen.findByText(/Cancelled .* by A. Rao: Raised twice/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mark as paid' })).not.toBeInTheDocument();
  });

  it('marks a due as paid with the date, the mode and a reference, and shows the result', async () => {
    api.markPaid.mockResolvedValue(due({ dueStatus: 2, version: 2, paidDate: '2026-11-01', paymentMode: 2 }));
    show();
    await userEvent.click(await screen.findByRole('button', { name: 'Mark as paid' }));
    const dialog = screen.getByRole('dialog', { name: 'Mark BNX/FY2026-27/0007 as paid' });
    expect(within(dialog).getByText(/cannot be changed or cancelled afterwards/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Mark as paid' }));
    expect(within(dialog).getByText('Choose how it was paid.')).toBeInTheDocument();
    expect(api.markPaid).not.toHaveBeenCalled();

    await userEvent.selectOptions(within(dialog).getByLabelText(/Paid by/), 'Bank transfer');
    await userEvent.clear(within(dialog).getByLabelText(/Paid on/));
    await userEvent.type(within(dialog).getByLabelText(/Paid on/), '2026-11-01');
    await userEvent.type(within(dialog).getByLabelText('Reference'), ' UTR 2291 ');
    api.get.mockResolvedValue(
      due({ dueStatus: 2, version: 2, paidDate: '2026-11-01', paymentMode: 2, paymentReference: 'UTR 2291' }),
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'Mark as paid' }));
    await waitFor(() =>
      expect(api.markPaid).toHaveBeenCalledWith('d1', {
        version: 1,
        paidDate: '2026-11-01',
        paymentMode: 2,
        paymentReference: 'UTR 2291',
      }),
    );
    expect(await screen.findByText('Paid on')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mark as paid' })).not.toBeInTheDocument();
  });

  it('refuses a day after today without asking the API', async () => {
    show();
    await userEvent.click(await screen.findByRole('button', { name: 'Mark as paid' }));
    const dialog = formDialog();
    await userEvent.clear(within(dialog).getByLabelText(/Paid on/));
    await userEvent.type(within(dialog).getByLabelText(/Paid on/), '2099-01-01');
    await userEvent.selectOptions(within(dialog).getByLabelText(/Paid by/), 'Cash');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Mark as paid' }));
    expect(within(dialog).getByText(/It cannot be after today/)).toBeInTheDocument();
    expect(api.markPaid).not.toHaveBeenCalled();
  });

  it('cancels a due with a reason of at least five characters', async () => {
    api.cancel.mockResolvedValue(due({ dueStatus: 0, version: 2 }));
    show();
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel due' }));
    const dialog = screen.getByRole('dialog', { name: 'Cancel BNX/FY2026-27/0007' });
    expect(within(dialog).getByText(/cannot be undone/)).toBeInTheDocument();
    await userEvent.type(within(dialog).getByLabelText(/Reason/), 'Oops');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel this due' }));
    expect(within(dialog).getByText('Say why, in at least 5 characters.')).toBeInTheDocument();
    expect(api.cancel).not.toHaveBeenCalled();

    await userEvent.clear(within(dialog).getByLabelText(/Reason/));
    await userEvent.type(within(dialog).getByLabelText(/Reason/), ' Raised twice ');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel this due' }));
    await waitFor(() =>
      expect(api.cancel).toHaveBeenCalledWith('d1', { version: 1, reason: 'Raised twice' }),
    );
  });

  it('keeps the due when the cancel dialog is dismissed', async () => {
    show();
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel due' }));
    await userEvent.click(screen.getByRole('button', { name: 'Keep the due' }));
    expect(screen.queryByRole('dialog', { name: /^Cancel / })).not.toBeInTheDocument();
    expect(api.cancel).not.toHaveBeenCalled();
  });

  it('sends only what an edit changed, with the version, and says when nothing changed', async () => {
    api.edit.mockResolvedValue(due({ version: 2, studentCount: 1700 }));
    show();
    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit BNX/FY2026-27/0007' });
    expect(within(dialog).getByLabelText(/Students/)).toHaveValue('1650');
    expect(within(dialog).getByLabelText(/^Adjustment/)).toHaveValue('-2500.00');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(within(dialog).getByText('Nothing has changed yet.')).toBeInTheDocument();
    expect(api.edit).not.toHaveBeenCalled();

    await userEvent.clear(within(dialog).getByLabelText(/Students/));
    await userEvent.type(within(dialog).getByLabelText(/Students/), '1700');
    expect(within(dialog).getByText('₹85,000.00')).toBeInTheDocument();
    expect(within(dialog).getByText('₹82,500.00')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(api.edit).toHaveBeenCalledWith('d1', { version: 1, studentCount: 1700 }));
  });

  it('asks for a note when the edited count differs from the automatic one, and for the adjustment', async () => {
    show();
    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    const dialog = formDialog();
    await userEvent.clear(within(dialog).getByLabelText(/Where the count comes from/));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(within(dialog).getByText(/Say where this count comes from/)).toBeInTheDocument();
    expect(api.edit).not.toHaveBeenCalled();
  });

  it('swaps the total preview for a note once the period starts on another day', async () => {
    show();
    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    const dialog = formDialog();
    expect(within(dialog).getByLabelText('Amount of this due')).toBeInTheDocument();
    await userEvent.clear(within(dialog).getByLabelText(/Period starts/));
    await userEvent.type(within(dialog).getByLabelText(/Period starts/), '2026-10-05');
    expect(within(dialog).queryByLabelText('Amount of this due')).not.toBeInTheDocument();
    expect(within(dialog).getByText(/starts on a different day/)).toBeInTheDocument();
  });

  it('says the automatic count is used when the count is cleared, not that the period moved', async () => {
    show();
    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    const dialog = formDialog();
    await userEvent.clear(within(dialog).getByLabelText(/Students/));
    expect(within(dialog).getByText(/the automatic count is used/i)).toBeInTheDocument();
    expect(within(dialog).queryByText(/starts on a different day/)).not.toBeInTheDocument();
  });

  it('refuses a deduction that takes the total below zero before asking the API', async () => {
    show();
    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    const dialog = formDialog();
    await userEvent.clear(within(dialog).getByLabelText(/^Adjustment/));
    await userEvent.type(within(dialog).getByLabelText(/^Adjustment/), '-90000');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(within(dialog).getByText(/The total cannot be below ₹0.00/)).toBeInTheDocument();
    expect(api.edit).not.toHaveBeenCalled();
  });

  it('offers Reload after a version conflict and shows the latest due', async () => {
    api.edit.mockRejectedValue(new ApiError(409, 'VERSION_CONFLICT', 'x', 'req-5'));
    show();
    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    const dialog = formDialog();
    await userEvent.clear(within(dialog).getByLabelText(/Students/));
    await userEvent.type(within(dialog).getByLabelText(/Students/), '1700');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(await within(dialog).findByText('VERSION_CONFLICT')).toBeInTheDocument();
    api.get.mockResolvedValue(due({ version: 2, studentCount: 1660 }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Reload' }));
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('dialog', { name: /^Edit / })).not.toBeInTheDocument();
  });

  it('says a due that was paid meanwhile can no longer be changed', async () => {
    api.cancel.mockRejectedValue(new ApiError(409, 'INVALID_STATE', 'x', 'req-6'));
    show();
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel due' }));
    const dialog = formDialog();
    await userEvent.type(within(dialog).getByLabelText(/Reason/), 'Raised twice');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel this due' }));
    expect(await within(dialog).findByText(/already paid or cancelled/)).toBeInTheDocument();
  });

  it('sends one request when Mark as paid is clicked twice', async () => {
    api.markPaid.mockImplementation(() => new Promise(() => {}));
    show();
    await userEvent.click(await screen.findByRole('button', { name: 'Mark as paid' }));
    const dialog = formDialog();
    await userEvent.selectOptions(within(dialog).getByLabelText(/Paid by/), 'Cash');
    const submit = within(dialog).getByRole('button', { name: 'Mark as paid' });
    // Both clicks land before React renders the busy button, so only the guard can stop the second.
    await act(async () => {
      fireEvent.click(submit);
      fireEvent.click(submit);
    });
    expect(api.markPaid).toHaveBeenCalledTimes(1);
  });

  it('shows a loading state, then an error with the code and Try again', async () => {
    api.get.mockRejectedValueOnce(new ApiError(500, 'INTERNAL_ERROR', 'x', 'req-9'));
    api.get.mockResolvedValue(due());
    show();
    expect(screen.getByRole('status', { name: 'Loading the due' })).toBeInTheDocument();
    expect(await screen.findByText('INTERNAL_ERROR')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'BNX/FY2026-27/0007' })).toBeInTheDocument();
  });

  it('says a due that is gone is gone, and a 403 is the access panel', async () => {
    api.get.mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'x', 'r'));
    const view = show();
    expect(await screen.findByText(/no longer exists/)).toBeInTheDocument();
    view.unmount();
    api.get.mockRejectedValue(new ApiError(403, 'FORBIDDEN', 'x', 'req-4'));
    show();
    expect(await screen.findByText("You don't have access to this")).toBeInTheDocument();
  });

  it('closes from the Close button', async () => {
    show();
    await screen.findByRole('heading', { name: 'BNX/FY2026-27/0007' });
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });
});
