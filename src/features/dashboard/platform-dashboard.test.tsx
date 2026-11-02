import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/api-error';
import { dashboardFigures, dueLine } from '@/test/dues';
import { renderScreen } from '@/test/render';
import { PlatformDashboardView } from './platform-dashboard';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

const dashboard = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('./dashboard-api', () => ({ dashboardApi: dashboard }));
const dues = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock('@/features/billing/dues-api', () => ({ duesApi: dues }));

const page = (items: ReturnType<typeof dueLine>[], totalItems = items.length) => ({
  items,
  meta: { page: 1, limit: 5, totalItems, totalPages: 1 },
});

beforeEach(() => {
  dashboard.get.mockReset().mockResolvedValue(dashboardFigures());
  dues.list.mockReset().mockResolvedValue(page([dueLine()], 12));
});

describe('PlatformDashboardView', () => {
  it('shows the figures of PLT-01, with the exact amount behind a compact one', async () => {
    renderScreen(<PlatformDashboardView />);
    const figures = await screen.findByRole('region', { name: 'Platform figures' });
    expect(within(figures).getByText('Societies').closest('a')).toHaveAttribute('href', '/societies');
    expect(within(figures).getByText('3')).toBeInTheDocument();
    expect(within(figures).getByText('5')).toBeInTheDocument();
    expect(within(figures).getByText('₹2,40,000.00')).toHaveClass('sr-only');
    expect(within(figures).getByText('₹80,000.00')).toHaveClass('sr-only');
    expect(within(figures).getByRole('link', { name: /Dues outstanding/ })).toHaveAttribute('href', '/dues');
  });

  it('says "Not available yet" for the figures that do not exist, and never a zero', async () => {
    renderScreen(<PlatformDashboardView />);
    const figures = await screen.findByRole('region', { name: 'Platform figures' });
    expect(within(figures).getAllByText('Not available yet')).toHaveLength(2);
    expect(within(figures).queryByText('0')).not.toBeInTheDocument();
  });

  it('shows the figures once they exist', async () => {
    dashboard.get.mockResolvedValue(dashboardFigures({ activeStudents: 15236, openAiReports: 5 }));
    renderScreen(<PlatformDashboardView />);
    const figures = await screen.findByRole('region', { name: 'Platform figures' });
    expect(within(figures).getByText('15,236')).toBeInTheDocument();
    expect(within(figures).queryByText('Not available yet')).not.toBeInTheDocument();
    expect(within(figures).getByText('Open AI reports').closest('a')).toHaveAttribute('href', '/ai-reports');
  });

  it("shows last month's amount under this month's, in full for a screen reader", async () => {
    dashboard.get.mockResolvedValue(
      dashboardFigures({
        duesCollectedThisMonthAmount: '118000.00',
        duesCollectedLastMonthAmount: '260000.00',
      }),
    );
    const view = renderScreen(<PlatformDashboardView />);
    const tile = (await screen.findByText('Collected this month')).closest('div')!;
    expect(tile).toHaveTextContent('₹2.6 L');
    expect(tile).toHaveTextContent('last month');
    expect(within(tile).getByText('₹2,60,000.00', { selector: '.sr-only' })).toBeInTheDocument();
    view.unmount();
    dashboard.get.mockResolvedValue(dashboardFigures({ duesCollectedLastMonthAmount: '0.00' }));
    renderScreen(<PlatformDashboardView />);
    const empty = (await screen.findByText('Collected this month')).closest('div')!;
    expect(within(empty).getByText('₹0.00', { selector: '.sr-only' })).toBeInTheDocument();
    expect(empty).toHaveTextContent('last month');
  });

  it('lists the open dues that fall due first, each opening in the ledger, and links to all of them', async () => {
    dues.list.mockResolvedValue(
      page([dueLine(), dueLine({ id: 'd2', invoiceNo: 'BNX/FY2026-27/0008', dueDate: '2020-01-01' })], 12),
    );
    renderScreen(<PlatformDashboardView />);
    const queue = await screen.findByRole('region', { name: 'Open dues' });
    expect(await within(queue).findByText('12 open')).toBeInTheDocument();
    expect(dues.list).toHaveBeenCalledWith(
      expect.objectContaining({ sort: 'dueDate', status: 'due', limit: 5 }),
    );
    const rows = within(queue).getAllByRole('link', { name: /BNX/ });
    expect(rows[0]).toHaveAttribute('href', '/dues?due=d1');
    expect(rows[0]).toHaveTextContent('₹80,000.00');
    expect(rows[0]).toHaveTextContent('Pay by 15-11-2026');
    expect(rows[1]).toHaveTextContent('Past due');
    expect(within(queue).getByRole('link', { name: 'All dues' })).toHaveAttribute('href', '/dues');
  });

  it('says when nothing is waiting for payment', async () => {
    dues.list.mockResolvedValue(page([]));
    renderScreen(<PlatformDashboardView />);
    expect(await screen.findByText('No dues are waiting for payment.')).toBeInTheDocument();
  });

  it('keeps the figures when the open dues cannot be loaded, and offers Try again', async () => {
    dues.list.mockRejectedValueOnce(new ApiError(500, 'INTERNAL_ERROR', 'x', 'r'));
    renderScreen(<PlatformDashboardView />);
    expect(await screen.findByText(/The open dues could not be loaded/)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Platform figures' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('BNX/FY2026-27/0007')).toBeInTheDocument();
  });

  it('shows a loading state, then an error with the code and Try again', async () => {
    dashboard.get.mockRejectedValueOnce(new ApiError(500, 'INTERNAL_ERROR', 'x', 'req-9'));
    renderScreen(<PlatformDashboardView />);
    expect(screen.getByRole('status', { name: 'Loading the figures' })).toBeInTheDocument();
    expect(await screen.findByText('INTERNAL_ERROR')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('region', { name: 'Platform figures' })).toBeInTheDocument();
  });

  it('shows a 403 as the access panel', async () => {
    dashboard.get.mockRejectedValue(new ApiError(403, 'FORBIDDEN', 'x', 'req-4'));
    renderScreen(<PlatformDashboardView />);
    expect(await screen.findByText("You don't have access to this")).toBeInTheDocument();
  });

  it('offers to onboard a Society', async () => {
    renderScreen(<PlatformDashboardView />);
    expect(await screen.findByRole('link', { name: 'Onboard Society' })).toHaveAttribute(
      'href',
      '/societies/new',
    );
  });
});
