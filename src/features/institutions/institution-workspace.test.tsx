import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/api-error';
import { history, institutionDetail } from '@/test/pricing';
import { renderScreen } from '@/test/render';
import { InstitutionWorkspace } from './institution-workspace';

let id: string | null = 'i1';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => ({
    get: (key: string) => (key === 'id' ? id : new URLSearchParams(window.location.search).get(key)),
  }),
}));

const api = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('./institutions-api', () => ({ institutionsApi: api }));
const pricing = vi.hoisted(() => ({ history: vi.fn(), set: vi.fn() }));
vi.mock('@/features/billing/pricing-api', () => ({ pricingApi: pricing }));

beforeEach(() => {
  api.get.mockReset();
  pricing.history.mockReset().mockResolvedValue(history());
  id = 'i1';
  window.history.replaceState(null, '', '/institutions/workspace/?id=i1');
});

describe('InstitutionWorkspace', () => {
  it('shows the Institution with its Society in the breadcrumb, its profile and its stamps', async () => {
    api.get.mockResolvedValue(institutionDetail());
    renderScreen(<InstitutionWorkspace />);
    expect(
      await screen.findByRole('heading', { name: 'Sri Vidya High School', level: 1 }),
    ).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('i1');
    expect(screen.getByRole('link', { name: 'Sri Vidya Educational Society' })).toHaveAttribute(
      'href',
      '/societies/workspace?id=s1',
    );
    expect(screen.getByText('SVHS')).toBeInTheDocument();
    expect(screen.getByText(/ICSE · Whitefield/)).toBeInTheDocument();
    expect(screen.getByText('KA-089')).toBeInTheDocument();
    expect(screen.getByText('+91 9876543210')).toBeInTheDocument();
    expect(screen.getByText('12 Lake Road, 560066')).toBeInTheDocument();
    expect(screen.getByText(/Added by A. Rao/)).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('opens the Pricing tab, keeps it in the URL and reads the rates only then', async () => {
    api.get.mockResolvedValue(institutionDetail());
    renderScreen(<InstitutionWorkspace />);
    await screen.findByRole('heading', { level: 1 });
    expect(pricing.history).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('tab', { name: 'Pricing' }));
    expect(window.location.search).toBe('?id=i1&tab=pricing');
    expect(await screen.findByRole('region', { name: 'Rate in force' })).toBeInTheDocument();
    expect(pricing.history).toHaveBeenCalledWith('i1');
  });

  it('opens the Pricing tab from a shared link', async () => {
    window.history.replaceState(null, '', '/institutions/workspace/?id=i1&tab=pricing');
    api.get.mockResolvedValue(institutionDetail());
    renderScreen(<InstitutionWorkspace />);
    expect(await screen.findByRole('region', { name: 'Rate in force' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Pricing' })).toHaveAttribute('aria-selected', 'true');
  });

  it('shows what is blocked beside the status', async () => {
    api.get.mockResolvedValue(institutionDetail({ blockedSections: ['staff', 'students'] }));
    renderScreen(<InstitutionWorkspace />);
    await screen.findByRole('heading', { level: 1 });
    expect(screen.getByText('Staff blocked')).toBeInTheDocument();
    expect(screen.getByText('Students blocked')).toBeInTheDocument();
  });

  it('says a deactivated Institution takes no new rate, and offers no button for one', async () => {
    api.get.mockResolvedValue(institutionDetail({ status: 0 }));
    renderScreen(<InstitutionWorkspace />);
    expect(await screen.findByText(/deactivated by its Society.s Owners/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Pricing' }));
    await screen.findByRole('region', { name: 'Rate in force' });
    expect(screen.queryByRole('button', { name: 'Set new rate' })).not.toBeInTheDocument();
  });

  it('treats an active Institution of a deactivated Society as deactivated, and says why', async () => {
    api.get.mockResolvedValue(institutionDetail({ societyStatus: 0 }));
    renderScreen(<InstitutionWorkspace />);
    expect(await screen.findByText(/Its Society is deactivated\./)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Pricing' }));
    await screen.findByRole('region', { name: 'Rate in force' });
    expect(screen.queryByRole('button', { name: 'Set new rate' })).not.toBeInTheDocument();
  });

  it('shows dashes for what is not on file', async () => {
    api.get.mockResolvedValue(
      institutionDetail({ boardCode: null, place: null, email: null, phone: null, affiliationNumber: null }),
    );
    renderScreen(<InstitutionWorkspace />);
    await screen.findByRole('heading', { level: 1 });
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(5);
  });

  it('says the record is gone for a 404 and for a link without an ID', async () => {
    api.get.mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'x', 'r'));
    const view = renderScreen(<InstitutionWorkspace />);
    expect(await screen.findByText(/no longer exists/)).toBeInTheDocument();
    view.unmount();
    id = null;
    renderScreen(<InstitutionWorkspace />);
    expect(screen.getByText(/no longer exists/)).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it('shows a loading state, then an error with Try again', async () => {
    api.get.mockRejectedValueOnce(new ApiError(500, 'INTERNAL_ERROR', 'x', 'req-9'));
    api.get.mockResolvedValue(institutionDetail());
    renderScreen(<InstitutionWorkspace />);
    expect(screen.getByRole('status', { name: 'Loading the Institution' })).toBeInTheDocument();
    expect(await screen.findByText('INTERNAL_ERROR')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('shows a 403 as the access panel', async () => {
    api.get.mockRejectedValue(new ApiError(403, 'FORBIDDEN', 'x', 'r'));
    renderScreen(<InstitutionWorkspace />);
    expect(await screen.findByText("You don't have access to this")).toBeInTheDocument();
  });
});
