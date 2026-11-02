import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type * as InstitutionsApiModule from '@/features/institutions/institutions-api';
import type * as DuesApiModule from './dues-api';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/api-error';
import { dashboardFigures, due, dueLine, quote } from '@/test/dues';
import { institution } from '@/test/blocks';
import { renderScreen } from '@/test/render';
import { DuesLedger, type LedgerScope } from './dues-ledger';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

const api = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  quote: vi.fn(),
  raise: vi.fn(),
  edit: vi.fn(),
  markPaid: vi.fn(),
  cancel: vi.fn(),
}));
vi.mock('./dues-api', async (original) => ({
  ...(await original<typeof DuesApiModule>()),
  duesApi: api,
}));
const dashboard = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/features/dashboard/dashboard-api', () => ({ dashboardApi: dashboard }));
const institutions = vi.hoisted(() => ({ list: vi.fn(), get: vi.fn() }));
vi.mock('@/features/institutions/institutions-api', async (original) => ({
  ...(await original<typeof InstitutionsApiModule>()),
  institutionsApi: institutions,
}));

const page = (items: ReturnType<typeof dueLine>[], totalItems = items.length) => ({
  items,
  meta: { page: 1, limit: 20, totalItems, totalPages: 1 },
});

const scope = (changes: Partial<LedgerScope> = {}): LedgerScope => ({
  institution: { id: 'i1', name: 'Sri Vidya High School', societyName: 'Sri Vidya Educational Society' },
  canRaise: true,
  ...changes,
});

beforeEach(() => {
  for (const fn of [...Object.values(api), dashboard.get, ...Object.values(institutions)]) fn.mockReset();
  api.list.mockResolvedValue(page([dueLine()]));
  dashboard.get.mockResolvedValue(dashboardFigures());
  institutions.list.mockResolvedValue({
    items: [institution()],
    meta: { page: 1, limit: 8, totalItems: 1, totalPages: 1 },
  });
  window.history.replaceState(null, '', '/dues/');
});

describe('DuesLedger', () => {
  it('lists the dues with their Institution, period, total and status, and the totals above', async () => {
    api.list.mockResolvedValue(
      page([
        dueLine(),
        dueLine({
          id: 'd2',
          invoiceNo: 'BNX/FY2026-27/0008',
          dueStatus: 2,
          paidDate: '2026-11-01',
          totalAmount: '1000.00',
        }),
        dueLine({ id: 'd3', invoiceNo: 'BNX/FY2026-27/0009', dueDate: '2020-01-01' }),
      ]),
    );
    renderScreen(<DuesLedger />);
    expect(await screen.findByRole('heading', { name: 'Dues and pricing', level: 1 })).toBeInTheDocument();
    const table = await screen.findByRole('table', { name: 'Dues' });
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(4);
    expect(rows[1]).toHaveTextContent('BNX/FY2026-27/0007');
    expect(rows[1]).toHaveTextContent('Sri Vidya High School');
    expect(rows[1]).toHaveTextContent('Sri Vidya Educational Society');
    expect(rows[1]).toHaveTextContent('01-10-2026 to 31-12-2026');
    expect(rows[1]).toHaveTextContent('15-11-2026');
    expect(rows[1]).toHaveTextContent('₹80,000.00');
    expect(rows[2]).toHaveTextContent('Paid');
    expect(rows[3]).toHaveTextContent('Past due');
    expect(rows[1]).not.toHaveTextContent('Past due');
    expect(screen.getByText('₹2,40,000.00')).toBeInTheDocument();
    expect(screen.getByText('₹80,000.00', { selector: '.sr-only' })).toBeInTheDocument();
    expect(screen.getByText('Outstanding')).toBeInTheDocument();
    expect(screen.getByText('Collected this month')).toBeInTheDocument();
  });

  it('keeps the ledger when the totals cannot be loaded, and says so', async () => {
    dashboard.get.mockRejectedValue(new ApiError(500, 'INTERNAL_ERROR', 'x', 'r'));
    renderScreen(<DuesLedger />);
    expect(await screen.findByText(/The totals could not be loaded/)).toBeInTheDocument();
    expect(await screen.findByText('BNX/FY2026-27/0007')).toBeInTheDocument();
  });

  it('searches by invoice number and filters by status, from page 1', async () => {
    renderScreen(<DuesLedger />);
    await screen.findByText('BNX/FY2026-27/0007');
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search dues' }), '0007');
    await waitFor(() => expect(api.list).toHaveBeenLastCalledWith(expect.objectContaining({ q: '0007' })));
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'Paid');
    await waitFor(() =>
      expect(api.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ q: '0007', status: 'paid', page: 1 }),
      ),
    );
    expect(window.location.search).toContain('status=paid');
  });

  it('opens a due in the sheet, keeps it in the URL, and opens it again after a refresh', async () => {
    api.get.mockResolvedValue(due());
    const view = renderScreen(<DuesLedger />);
    await userEvent.click(await screen.findByRole('button', { name: /BNX\/FY2026-27\/0007/ }));
    expect(await screen.findByRole('dialog', { name: 'BNX/FY2026-27/0007' })).toBeInTheDocument();
    expect(window.location.search).toBe('?due=d1');
    view.unmount();
    renderScreen(<DuesLedger />);
    expect(await screen.findByRole('dialog', { name: 'BNX/FY2026-27/0007' })).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('d1');
  });

  it('says there are no dues yet, or none that match', async () => {
    api.list.mockResolvedValue(page([]));
    renderScreen(<DuesLedger />);
    expect(await screen.findByText('No dues yet')).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'Due');
    expect(await screen.findByText('No dues match')).toBeInTheDocument();
  });

  it('shows an error with Try again', async () => {
    // The open-dues tile asks for the list too; only the table's own read (20 a page) fails first.
    let failed = false;
    api.list.mockImplementation(async (query: { limit: number }) => {
      if (query.limit === 20 && !failed) {
        failed = true;
        throw new ApiError(500, 'INTERNAL_ERROR', 'x', 'req-9');
      }
      return page([dueLine()]);
    });
    renderScreen(<DuesLedger />);
    expect(await screen.findByText('INTERNAL_ERROR')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('BNX/FY2026-27/0007')).toBeInTheDocument();
  });

  it('shows a 403 as the access panel', async () => {
    api.list.mockRejectedValue(new ApiError(403, 'FORBIDDEN', 'x', 'req-4'));
    renderScreen(<DuesLedger />);
    expect(await screen.findByText("You don't have access to this")).toBeInTheDocument();
  });

  describe('inside an Institution', () => {
    it('lists only its dues, without the Institution column or the totals', async () => {
      renderScreen(<DuesLedger scope={scope()} />);
      await screen.findByText('BNX/FY2026-27/0007');
      expect(api.list).toHaveBeenCalledWith(expect.objectContaining({ institutionId: 'i1' }));
      expect(screen.queryByRole('columnheader', { name: 'Institution' })).not.toBeInTheDocument();
      expect(screen.queryByText('Outstanding')).not.toBeInTheDocument();
      expect(dashboard.get).not.toHaveBeenCalled();
      expect(screen.getByText('1 due for Sri Vidya High School')).toBeInTheDocument();
    });

    it('offers no new due for a deactivated Institution', async () => {
      renderScreen(<DuesLedger scope={scope({ canRaise: false })} />);
      await screen.findByText('BNX/FY2026-27/0007');
      expect(screen.queryByRole('button', { name: 'Raise a due' })).not.toBeInTheDocument();
    });
  });
});

describe('raising a due', () => {
  async function openForm(scoped = true) {
    renderScreen(<DuesLedger scope={scoped ? scope() : undefined} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Raise a due' }));
    return screen.getByRole('dialog', { name: 'Raise a due' });
  }
  async function fillPeriod(dialog: HTMLElement) {
    await userEvent.type(within(dialog).getByLabelText(/Period starts/), '2026-10-01');
    await userEvent.type(within(dialog).getByLabelText(/Period ends/), '2026-12-31');
  }

  it('cannot change the Institution it was opened from', async () => {
    const dialog = await openForm();
    expect(within(dialog).getByText('Sri Vidya High School')).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /Change Institution/ })).not.toBeInTheDocument();
  });

  it('finds an Institution by search when opened from the ledger', async () => {
    api.quote.mockResolvedValue(quote());
    const dialog = await openForm(false);
    await userEvent.type(within(dialog).getByLabelText(/^Institution/), 'sri');
    await userEvent.click(await within(dialog).findByRole('button', { name: /Sri Vidya High School/ }));
    expect(institutions.list).toHaveBeenCalledWith(expect.objectContaining({ q: 'sri', status: 'active' }));
    expect(within(dialog).getByRole('button', { name: /Change Institution/ })).toBeInTheDocument();
  });

  it('asks the system for the count and the rate once the period is known, and previews the total', async () => {
    api.quote.mockResolvedValue(quote({ studentCountAuto: 1650, baseAmount: '82500.00' }));
    const dialog = await openForm();
    await fillPeriod(dialog);
    await waitFor(() => expect(api.quote).toHaveBeenCalledWith('i1', '2026-10-01', '2026-12-31'));
    await waitFor(() => expect(within(dialog).getByLabelText(/Students/)).toHaveValue('1650'));
    const preview = await within(dialog).findByLabelText('Amount of this due');
    expect(within(preview).getByText('1,650 students × ₹50.00')).toBeInTheDocument();
    expect(within(preview).getAllByText('₹82,500.00')).toHaveLength(2);
    await userEvent.type(within(dialog).getByLabelText(/^Adjustment/), '-2500');
    expect(await within(dialog).findByText('₹80,000.00')).toBeInTheDocument();
  });

  it('does not prefill a count of zero, and then asks where the typed count comes from', async () => {
    api.quote.mockResolvedValue(quote());
    const dialog = await openForm();
    await fillPeriod(dialog);
    await within(dialog).findByLabelText(/Where the count comes from/);
    await waitFor(() => expect(api.quote).toHaveBeenCalled());
    expect(within(dialog).getByLabelText(/Students/)).toHaveValue('');
    await userEvent.type(within(dialog).getByLabelText(/Students/), '1650');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Raise due' }));
    expect(within(dialog).getByText(/Say where this count comes from/)).toBeInTheDocument();
    expect(api.raise).not.toHaveBeenCalled();
  });

  it('requires a note for an adjustment, and says the Owners see it', async () => {
    api.quote.mockResolvedValue(quote({ studentCountAuto: 100 }));
    const dialog = await openForm();
    await fillPeriod(dialog);
    await waitFor(() => expect(within(dialog).getByLabelText(/Students/)).toHaveValue('100'));
    await userEvent.type(within(dialog).getByLabelText(/^Adjustment/), '-500');
    expect(within(dialog).getByText(/Shown to the Society’s Owners/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Raise due' }));
    expect(within(dialog).getByText('Say why. The Society’s Owners see this note.')).toBeInTheDocument();
    expect(api.raise).not.toHaveBeenCalled();
  });

  it('says when no rate is in force, links to Pricing, and does not send', async () => {
    api.quote.mockResolvedValue(
      quote({ priceRateId: null, ratePerStudentAmount: null, rateEffectiveFromDate: null, baseAmount: null }),
    );
    const dialog = await openForm();
    await fillPeriod(dialog);
    expect(await within(dialog).findByText(/No rate is in force on 01-10-2026/)).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'Open Pricing' })).toHaveAttribute(
      'href',
      '/institutions/workspace?id=i1&tab=pricing',
    );
    await userEvent.type(within(dialog).getByLabelText(/Students/), '10');
    await userEvent.type(within(dialog).getByLabelText(/Where the count comes from/), 'Register');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Raise due' }));
    expect(within(dialog).getByText('No rate is in force on this day.')).toBeInTheDocument();
    expect(api.raise).not.toHaveBeenCalled();
  });

  it('refuses a deduction that takes the total below zero', async () => {
    api.quote.mockResolvedValue(quote({ studentCountAuto: 10 }));
    const dialog = await openForm();
    await fillPeriod(dialog);
    await waitFor(() => expect(within(dialog).getByLabelText(/Students/)).toHaveValue('10'));
    await userEvent.type(within(dialog).getByLabelText(/^Adjustment/), '-501');
    await userEvent.type(within(dialog).getByLabelText(/Note for the Owners/), 'Rebate');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Raise due' }));
    expect(within(dialog).getByText(/The total cannot be below ₹0.00/)).toBeInTheDocument();
    expect(api.raise).not.toHaveBeenCalled();
  });

  it('raises the due, opens it, and says which invoice was raised', async () => {
    api.quote.mockResolvedValue(quote());
    api.raise.mockResolvedValue(due());
    api.get.mockResolvedValue(due());
    const dialog = await openForm();
    await fillPeriod(dialog);
    await within(dialog).findByLabelText(/Where the count comes from/);
    await waitFor(() => expect(api.quote).toHaveBeenCalled());
    await userEvent.type(within(dialog).getByLabelText(/Students/), '1650');
    await userEvent.type(
      within(dialog).getByLabelText(/Where the count comes from/),
      'Counted from the register',
    );
    await userEvent.type(within(dialog).getByLabelText(/^Adjustment/), '-2500');
    await userEvent.type(within(dialog).getByLabelText(/Note for the Owners/), 'Festive discount');
    await userEvent.type(within(dialog).getByLabelText(/Pay by/), '2026-11-15');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Raise due' }));
    await waitFor(() => expect(api.raise).toHaveBeenCalledTimes(1));
    const [body, key] = api.raise.mock.calls[0]!;
    expect(body).toEqual({
      institutionId: 'i1',
      periodStartDate: '2026-10-01',
      periodEndDate: '2026-12-31',
      studentCount: 1650,
      studentCountNote: 'Counted from the register',
      adjustmentAmount: '-2500.00',
      adjustmentNote: 'Festive discount',
      dueDate: '2026-11-15',
    });
    expect(key).toMatch(/^[0-9a-f-]{36}$/);
    expect(await screen.findByRole('dialog', { name: 'BNX/FY2026-27/0007' })).toBeInTheDocument();
    expect(screen.getByText('Raised BNX/FY2026-27/0007')).toBeInTheDocument();
    expect(window.location.search).toBe('?due=d1');
  });

  it('keeps the key after an answer that never came or a 5xx, even when the details change', async () => {
    api.quote.mockResolvedValue(quote({ studentCountAuto: 100 }));
    api.raise.mockRejectedValue(new ApiError(500, 'INTERNAL_ERROR', 'x', 'req-3'));
    const dialog = await openForm();
    await fillPeriod(dialog);
    await waitFor(() => expect(within(dialog).getByLabelText(/Students/)).toHaveValue('100'));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Raise due' }));
    await within(dialog).findByText('INTERNAL_ERROR');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Raise due' }));
    await waitFor(() => expect(api.raise).toHaveBeenCalledTimes(2));
    expect(api.raise.mock.calls[1]![1]).toBe(api.raise.mock.calls[0]![1]);

    // The outcome is still unknown, so changed details keep the key: the API decides.
    await userEvent.type(within(dialog).getByLabelText(/Pay by/), '2026-11-15');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Raise due' }));
    await waitFor(() => expect(api.raise).toHaveBeenCalledTimes(3));
    expect(api.raise.mock.calls[2]![1]).toBe(api.raise.mock.calls[0]![1]);
  });

  it('takes a new key for changed details only after a definite refusal', async () => {
    api.quote.mockResolvedValue(quote({ studentCountAuto: 100 }));
    api.raise.mockRejectedValueOnce(ApiError.network(new Error('reset')));
    api.raise.mockRejectedValue(new ApiError(409, 'INVALID_STATE', 'x', 'req-4'));
    const dialog = await openForm();
    await fillPeriod(dialog);
    await waitFor(() => expect(within(dialog).getByLabelText(/Students/)).toHaveValue('100'));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Raise due' }));
    await within(dialog).findByText('NETWORK_ERROR');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Raise due' }));
    await within(dialog).findByText('INVALID_STATE');
    expect(api.raise.mock.calls[1]![1]).toBe(api.raise.mock.calls[0]![1]);
    await userEvent.type(within(dialog).getByLabelText(/Pay by/), '2026-11-15');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Raise due' }));
    await waitFor(() => expect(api.raise).toHaveBeenCalledTimes(3));
    expect(api.raise.mock.calls[2]![1]).not.toBe(api.raise.mock.calls[0]![1]);
  });

  it('shows the API’s refusal for a missing rate, and for a deactivated Institution', async () => {
    api.quote.mockResolvedValue(quote({ studentCountAuto: 100 }));
    api.raise.mockRejectedValueOnce(new ApiError(422, 'NO_RATE_IN_FORCE', 'x', 'req-1'));
    api.raise.mockRejectedValueOnce(new ApiError(409, 'INVALID_STATE', 'x', 'req-2'));
    const dialog = await openForm();
    await fillPeriod(dialog);
    await waitFor(() => expect(within(dialog).getByLabelText(/Students/)).toHaveValue('100'));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Raise due' }));
    expect(
      await within(dialog).findByText(/Set a rate in the Institution’s Pricing tab first/),
    ).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Raise due' }));
    expect(await within(dialog).findByText(/is deactivated, so no due can be raised/)).toBeInTheDocument();
  });

  it('drops the refusal when a field is edited', async () => {
    api.quote.mockResolvedValue(quote({ studentCountAuto: 100 }));
    api.raise.mockRejectedValue(new ApiError(422, 'NO_RATE_IN_FORCE', 'x', 'req-1'));
    const dialog = await openForm();
    await fillPeriod(dialog);
    await waitFor(() => expect(within(dialog).getByLabelText(/Students/)).toHaveValue('100'));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Raise due' }));
    await within(dialog).findByText('NO_RATE_IN_FORCE');
    await userEvent.type(within(dialog).getByLabelText(/Pay by/), '2026-11-15');
    expect(within(dialog).queryByText('NO_RATE_IN_FORCE')).not.toBeInTheDocument();
  });

  it('sends one request when Raise due is clicked twice', async () => {
    api.quote.mockResolvedValue(quote({ studentCountAuto: 100 }));
    api.raise.mockImplementation(() => new Promise(() => {}));
    const dialog = await openForm();
    await fillPeriod(dialog);
    await waitFor(() => expect(within(dialog).getByLabelText(/Students/)).toHaveValue('100'));
    await userEvent.dblClick(within(dialog).getByRole('button', { name: 'Raise due' }));
    expect(api.raise).toHaveBeenCalledTimes(1);
  });
});
