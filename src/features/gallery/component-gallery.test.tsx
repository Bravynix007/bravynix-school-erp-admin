import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.resetModules();
  vi.doUnmock('@/lib/env');
});

describe('ComponentGallery', () => {
  it('renders an empty state instead of the gallery in a production build', async () => {
    vi.doMock('@/lib/env', () => ({ env: { NEXT_PUBLIC_APP_ENV: 'production' } }));
    const { ComponentGallery } = await import('./component-gallery');
    const { ToastProvider } = await import('@/components/ui/toast');
    render(
      <ToastProvider>
        <ComponentGallery />
      </ToastProvider>,
    );
    expect(screen.getByText('Not available')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'KPI tiles' })).toBeNull();
  });

  it('renders the gallery in a local build', async () => {
    vi.doMock('@/lib/env', () => ({ env: { NEXT_PUBLIC_APP_ENV: 'local' } }));
    const { ComponentGallery } = await import('./component-gallery');
    const { ToastProvider } = await import('@/components/ui/toast');
    render(
      <ToastProvider>
        <ComponentGallery />
      </ToastProvider>,
    );
    expect(screen.getByRole('heading', { name: 'KPI tiles' })).toBeInTheDocument();
  });
});
