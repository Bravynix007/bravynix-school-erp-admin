import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ServerUnreachable } from './server-unreachable';

const retry = vi.fn();
vi.mock('@/lib/auth/session', () => ({ useSession: () => ({ retry }) }));

describe('ServerUnreachable', () => {
  it('offers Try again without claiming the operator is still signed in (re-review R-C9)', async () => {
    render(<ServerUnreachable retryAfterSeconds={null} />);
    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't check your sign-in.");
    expect(screen.queryByText(/still signed in/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('waits out Retry-After before Try again (re-review R-C3)', () => {
    render(<ServerUnreachable retryAfterSeconds={30} />);
    expect(screen.getByRole('button', { name: 'Try again in 0:30' })).toBeDisabled();
  });
});
