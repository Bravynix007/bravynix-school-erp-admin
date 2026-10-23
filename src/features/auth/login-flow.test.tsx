import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/api-error';
import type * as AuthApiModule from '@/lib/auth/auth-api';
import { LoginFlow } from './login-flow';

const replace = vi.fn();
const signedIn = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));
vi.mock('@/lib/auth/session', () => ({ useSession: () => ({ signedIn }) }));
vi.mock('qrcode.react', () => ({ QRCodeSVG: ({ title }: { title: string }) => <svg aria-label={title} /> }));

const authApi = vi.hoisted(() => ({
  requestOtp: vi.fn(),
  verifyOtp: vi.fn(),
  enrolMfa: vi.fn(),
  verifyMfa: vi.fn(),
}));
vi.mock('@/lib/auth/auth-api', async (importOriginal) => ({
  ...(await importOriginal<typeof AuthApiModule>()),
  authApi,
}));

const tokens = {
  accessToken: 'access-1',
  accessTokenExpiresAt: '2026-10-23T05:00:00.000Z',
  person: {
    id: 'p1',
    email: 'ananya.rao@bravynix.in',
    firstName: 'Ananya',
    lastName: 'Rao',
    preferredLanguage: 'en',
  },
};

function renderFlow() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<LoginFlow />, { wrapper });
}

async function reachCodeStep() {
  authApi.requestOtp.mockResolvedValue({ resendAfterSeconds: 60, expiresInSeconds: 600 });
  renderFlow();
  await userEvent.type(screen.getByLabelText('Email'), 'Ananya.Rao@bravynix.in');
  await userEvent.click(screen.getByRole('button', { name: 'Send code' }));
  await screen.findByText('Check your email');
}

async function typeCode(code: string) {
  await userEvent.click(screen.getAllByRole('textbox')[0]!);
  await userEvent.keyboard(code);
}

describe('LoginFlow', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects an invalid email before calling the API', async () => {
    renderFlow();
    await userEvent.type(screen.getByLabelText('Email'), 'ananya@');
    await userEvent.click(screen.getByRole('button', { name: 'Send code' }));
    expect(await screen.findByText(/Enter a valid email address/)).toBeInTheDocument();
    expect(authApi.requestOtp).not.toHaveBeenCalled();
  });

  it('sends a lower-cased email and shows the masked address with the resend timer', async () => {
    await reachCodeStep();
    expect(authApi.requestOtp).toHaveBeenCalledWith('ananya.rao@bravynix.in');
    expect(screen.getByText('a••••@bravynix.in')).toBeInTheDocument();
    expect(screen.getByText(/Resend code in 1:00|Resend code in 0:59/)).toBeInTheDocument();
  });

  it('shows attempts left after a wrong code', async () => {
    await reachCodeStep();
    authApi.verifyOtp.mockRejectedValue(new ApiError(401, 'OTP_INVALID', 'x', 'r', [], { attemptsLeft: 3 }));
    await typeCode('111111');
    expect(await screen.findByText('Incorrect code. 3 attempts left.')).toBeInTheDocument();
  });

  it('enrols the authenticator once on first login, then signs in', async () => {
    await reachCodeStep();
    authApi.verifyOtp.mockResolvedValue({ mfaRequired: true, mfaToken: 'mfa-1', mfaEnrolled: false });
    authApi.enrolMfa.mockResolvedValue({
      setupUri: 'otpauth://totp/BravyNix?secret=ABC',
      secret: 'JBSW Y3DP EHPK 3PXP',
    });
    authApi.verifyMfa.mockResolvedValue(tokens);

    await typeCode('482017');
    expect(await screen.findByText('Set up your authenticator app')).toBeInTheDocument();
    expect(await screen.findByText('JBSW Y3DP EHPK 3PXP')).toBeInTheDocument();
    expect(screen.getByText(/Shown only once/)).toBeInTheDocument();
    expect(authApi.enrolMfa).toHaveBeenCalledTimes(1);

    await typeCode('135790');
    await waitFor(() => expect(signedIn).toHaveBeenCalledWith('access-1'));
    expect(authApi.verifyMfa).toHaveBeenCalledWith('mfa-1', '135790');
    expect(replace).toHaveBeenCalledWith('/dashboard');
  });

  it('asks an enrolled Super Admin for the authenticator code only', async () => {
    await reachCodeStep();
    authApi.verifyOtp.mockResolvedValue({ mfaRequired: true, mfaToken: 'mfa-2', mfaEnrolled: true });
    await typeCode('482017');
    expect(await screen.findByText('Enter the code from your authenticator app')).toBeInTheDocument();
    expect(authApi.enrolMfa).not.toHaveBeenCalled();
  });

  it('tells a non-Super Admin to use the app', async () => {
    await reachCodeStep();
    authApi.verifyOtp.mockRejectedValue(new ApiError(403, 'CONSOLE_NOT_ALLOWED', 'x', 'r'));
    await typeCode('482017');
    expect(await screen.findByText(/for Super Admins only/)).toBeInTheDocument();
  });

  it('goes back to the email with "Use a different email"', async () => {
    await reachCodeStep();
    await userEvent.click(screen.getByRole('button', { name: 'Use a different email' }));
    expect(screen.getByLabelText('Email')).toHaveValue('ananya.rao@bravynix.in');
  });
});
