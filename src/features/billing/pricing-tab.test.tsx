import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/api-error';
import { history, rate } from '@/test/pricing';
import { renderScreen } from '@/test/render';
import { PricingTab } from './pricing-tab';

const api = vi.hoisted(() => ({ history: vi.fn(), set: vi.fn() }));
vi.mock('./pricing-api', () => ({ pricingApi: api }));

beforeEach(() => {
  api.history.mockReset();
  api.set.mockReset();
});

const show = (canChange = true) =>
  renderScreen(
    <PricingTab institutionId="i1" institutionName="Sri Vidya High School" canChange={canChange} />,
  );

describe('PricingTab', () => {
  it('shows the rate in force, what it means for dues, and the history with each rate’s dates and note', async () => {
    api.history.mockResolvedValue(history());
    show();
    const current = await screen.findByRole('region', { name: 'Rate in force' });
    expect(within(current).getByText(/₹50\.00/)).toBeInTheDocument();
    expect(within(current).getByText(/In force since/)).toHaveTextContent('In force since 01-06-2026');
    expect(screen.getByText(/Dues keep the rate in force on their period start date/)).toBeInTheDocument();

    const timeline = screen.getByRole('list', { name: 'Rate history' });
    const entries = within(timeline).getAllByRole('listitem');
    expect(entries).toHaveLength(3);
    expect(entries[0]).toHaveTextContent('₹55.00');
    expect(entries[0]).toHaveTextContent('Scheduled');
    expect(entries[0]).toHaveTextContent('Starts 01-04-2027');
    expect(entries[1]).toHaveTextContent('In force');
    expect(entries[1]).toHaveTextContent('01-06-2026 to 31-03-2027');
    expect(entries[1]).toHaveTextContent('Annual revision agreed in the renewal');
    expect(entries[1]).toHaveTextContent('A. Rao');
    expect(entries[2]).toHaveTextContent('Closed');
    expect(entries[2]).toHaveTextContent('01-06-2025 to 31-05-2026');
    expect(screen.getByText(/3 rates on file/)).toBeInTheDocument();
    // One rate per student: no billing cycle and no split by module (PRD decision 6).
    expect(screen.queryByText(/quarterly/i)).not.toBeInTheDocument();
  });

  it('says there is no rate in force while every rate is still to come', async () => {
    api.history.mockResolvedValue([rate({ id: 'a', effectiveFromDate: '2027-04-01', inForce: false })]);
    show();
    expect(await screen.findByText('None yet')).toBeInTheDocument();
    expect(
      screen.getByText(
        /A due cannot be raised for this Institution until the first rate starts on 01-04-2027/,
      ),
    ).toBeInTheDocument();
  });

  it('asks for the first rate when there is none, and offers the button only to an active Institution', async () => {
    api.history.mockResolvedValue([]);
    const view = show();
    expect(await screen.findByText('No rate set')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Set new rate' })).toBeInTheDocument();
    view.unmount();

    show(false);
    expect(await screen.findByText('No rate set')).toBeInTheDocument();
    expect(screen.getByText(/deactivated and has no rate/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Set new rate' })).not.toBeInTheDocument();
  });

  it('keeps the history readable but gives a deactivated Institution no button', async () => {
    api.history.mockResolvedValue(history());
    show(false);
    await screen.findByRole('region', { name: 'Rate in force' });
    expect(screen.queryByRole('button', { name: 'Set new rate' })).not.toBeInTheDocument();
  });

  it('sets a rate: two decimals, the date and the trimmed note, then closes with a confirmation', async () => {
    api.history.mockResolvedValue(history());
    api.set.mockResolvedValue(rate({ id: 'r9' }));
    show();
    await userEvent.click(await screen.findByRole('button', { name: 'Set new rate' }));
    const dialog = screen.getByRole('dialog', { name: 'Set a new rate for Sri Vidya High School' });
    await userEvent.type(within(dialog).getByLabelText(/Rate per student/), '60.5');
    await userEvent.type(within(dialog).getByLabelText(/In force from/), '2027-06-01');
    await userEvent.type(within(dialog).getByLabelText('Note'), '  Renewal ');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Set rate' }));
    await waitFor(() =>
      expect(api.set).toHaveBeenCalledWith('i1', {
        ratePerStudentAmount: '60.50',
        effectiveFromDate: '2027-06-01',
        note: 'Renewal',
      }),
    );
    expect(await screen.findByText('Rate set')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    // The history is read again.
    expect(api.history).toHaveBeenCalledTimes(2);
  });

  it('checks the form before it asks the API, and does not send an empty one', async () => {
    api.history.mockResolvedValue(history());
    show();
    await userEvent.click(await screen.findByRole('button', { name: 'Set new rate' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Set rate' }));
    expect(within(dialog).getByText('Enter the rate per student.')).toBeInTheDocument();
    expect(within(dialog).getByText('Choose the first day this rate applies.')).toBeInTheDocument();
    expect(api.set).not.toHaveBeenCalled();
  });

  it('shows the API’s refusal for a day that already has a rate, beside the date, and drops it when the date changes', async () => {
    api.history.mockResolvedValue(history());
    api.set.mockRejectedValue(
      new ApiError(409, 'DUPLICATE', 'x', 'req-1', [
        { field: 'effectiveFromDate', code: 'DUPLICATE', message: 'taken' },
      ]),
    );
    show();
    await userEvent.click(await screen.findByRole('button', { name: 'Set new rate' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText(/Rate per student/), '60');
    await userEvent.type(within(dialog).getByLabelText(/In force from/), '2026-06-01');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Set rate' }));
    expect(await within(dialog).findAllByText('taken')).not.toHaveLength(0);
    expect(
      within(dialog).getByText('A rate already starts on this date. Choose another day.'),
    ).toBeInTheDocument();
    await userEvent.clear(within(dialog).getByLabelText(/In force from/));
    expect(within(dialog).queryByText('taken')).not.toBeInTheDocument();
  });

  it('explains a deactivated Institution when the API refuses the rate for it', async () => {
    api.history.mockResolvedValue(history());
    api.set.mockRejectedValue(new ApiError(409, 'INVALID_STATE', 'x', 'req-2'));
    show();
    await userEvent.click(await screen.findByRole('button', { name: 'Set new rate' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText(/Rate per student/), '60');
    await userEvent.type(within(dialog).getByLabelText(/In force from/), '2027-06-01');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Set rate' }));
    expect(
      await within(dialog).findByText(
        'This Institution or its Society is deactivated, so it takes no new rate.',
      ),
    ).toBeInTheDocument();
    expect(within(dialog).getByText('INVALID_STATE')).toBeInTheDocument();
  });

  it('sends one request when Set rate is clicked twice', async () => {
    api.history.mockResolvedValue(history());
    api.set.mockImplementation(() => new Promise(() => {}));
    show();
    await userEvent.click(await screen.findByRole('button', { name: 'Set new rate' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText(/Rate per student/), '60');
    await userEvent.type(within(dialog).getByLabelText(/In force from/), '2027-06-01');
    const submit = within(dialog).getByRole('button', { name: 'Set rate' });
    await userEvent.dblClick(submit);
    expect(api.set).toHaveBeenCalledTimes(1);
  });

  it('shows a loading state, then an error with the code and Try again', async () => {
    api.history.mockRejectedValueOnce(new ApiError(500, 'INTERNAL_ERROR', 'x', 'req-9'));
    api.history.mockResolvedValue(history());
    show();
    expect(screen.getByRole('status', { name: 'Loading the rates' })).toBeInTheDocument();
    expect(await screen.findByText('INTERNAL_ERROR')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('region', { name: 'Rate in force' })).toBeInTheDocument();
  });

  it('shows a 403 as the access panel', async () => {
    api.history.mockRejectedValue(new ApiError(403, 'FORBIDDEN', 'x', 'req-4'));
    show();
    expect(await screen.findByText("You don't have access to this")).toBeInTheDocument();
  });
});
