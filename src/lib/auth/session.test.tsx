import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/api-error';
import type * as AuthApiModule from './auth-api';
import { reasonOf, SessionProvider, useSession } from './session';
import { SESSION_CHANNEL } from './session-channel';
import { tokenStore } from './token-store';

const api = vi.hoisted(() => ({
  refresh: vi.fn(),
  setSessionEndedHandler: vi.fn(),
}));
vi.mock('@/lib/api/client', () => ({ api }));

const authApi = vi.hoisted(() => ({ logout: vi.fn(), logoutAll: vi.fn() }));
vi.mock('./auth-api', async (importOriginal) => ({
  ...(await importOriginal<typeof AuthApiModule>()),
  authApi,
}));

function Probe() {
  const { state, signOut, retry } = useSession();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <p>{state.status}</p>
      {error ? <p>failed: {error}</p> : null}
      <button onClick={() => signOut().catch((e: ApiError) => setError(e.code))}>Sign out</button>
      <button onClick={retry}>Retry</button>
    </>
  );
}

function renderSession() {
  const queryClient = new QueryClient();
  queryClient.setQueryData(['platform', 'societies'], ['Sri Vidya Educational Society']);
  render(
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <Probe />
      </SessionProvider>
    </QueryClientProvider>,
  );
  return queryClient;
}

const networkError = () => ApiError.network(new TypeError('Failed to fetch'));

describe('SessionProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tokenStore.clear();
  });

  it('starts signed in when the refresh works', async () => {
    api.refresh.mockResolvedValue({ ok: true });
    renderSession();
    expect(await screen.findByText('signed-in')).toBeInTheDocument();
  });

  it('says the server is unreachable, not signed out, when the refresh cannot connect (review C1)', async () => {
    api.refresh.mockRejectedValueOnce(networkError()).mockResolvedValueOnce({ ok: true });
    renderSession();
    expect(await screen.findByText('unreachable')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('signed-in')).toBeInTheDocument();
    expect(api.refresh).toHaveBeenCalledTimes(2);
  });

  it('clears the query cache on sign-out (review C2)', async () => {
    api.refresh.mockResolvedValue({ ok: true });
    authApi.logout.mockResolvedValue(null);
    const queryClient = renderSession();
    await screen.findByText('signed-in');
    tokenStore.set('access-1');

    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(await screen.findByText('signed-out')).toBeInTheDocument();
    expect(queryClient.getQueryData(['platform', 'societies'])).toBeUndefined();
    expect(tokenStore.get()).toBeNull();
  });

  it('stays signed in when the logout call fails, and rejects (review C3)', async () => {
    api.refresh.mockResolvedValue({ ok: true });
    authApi.logout.mockRejectedValue(networkError());
    renderSession();
    await screen.findByText('signed-in');
    tokenStore.set('access-1');

    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(await screen.findByText('failed: NETWORK_ERROR')).toBeInTheDocument();
    expect(screen.getByText('signed-in')).toBeInTheDocument();
    expect(tokenStore.get()).toBe('access-1');
  });

  it('treats a 401 from logout as already signed out', async () => {
    api.refresh.mockResolvedValue({ ok: true });
    authApi.logout.mockRejectedValue(new ApiError(401, 'SESSION_ENDED', 'Ended', null));
    renderSession();
    await screen.findByText('signed-in');
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(await screen.findByText('signed-out')).toBeInTheDocument();
  });

  it('clears the query cache when the session ends (review C2)', async () => {
    api.refresh.mockResolvedValue({ ok: true });
    const queryClient = renderSession();
    await screen.findByText('signed-in');
    const onEnded = api.setSessionEndedHandler.mock.calls.at(-1)?.[0] as (error: ApiError) => void;

    act(() => onEnded(new ApiError(401, 'SESSION_ENDED', 'Ended', null, [], { reason: 'admin_revoked' })));
    await waitFor(() => expect(screen.getByText('ended')).toBeInTheDocument());
    expect(queryClient.getQueryData(['platform', 'societies'])).toBeUndefined();
  });
});

describe('SessionProvider across tabs (re-review R-C2)', () => {
  let otherTab: BroadcastChannel;
  let heard: unknown[];

  beforeEach(() => {
    vi.clearAllMocks();
    tokenStore.clear();
    heard = [];
    otherTab = new BroadcastChannel(SESSION_CHANNEL);
    otherTab.onmessage = (event: MessageEvent) => heard.push(event.data);
  });
  afterEach(() => otherTab.close());

  it('tells the other tabs when it signs out', async () => {
    api.refresh.mockResolvedValue({ ok: true });
    authApi.logout.mockResolvedValue(null);
    renderSession();
    await screen.findByText('signed-in');
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(heard).toContainEqual({ type: 'signed-out' }));
  });

  it('tells the other tabs when the session ends, with the reason', async () => {
    api.refresh.mockResolvedValue({ ok: true });
    renderSession();
    await screen.findByText('signed-in');
    const onEnded = api.setSessionEndedHandler.mock.calls.at(-1)?.[0] as (error: ApiError) => void;
    act(() => onEnded(new ApiError(401, 'SESSION_ENDED', 'Ended', null, [], { reason: 'blocked' })));
    await waitFor(() => expect(heard).toContainEqual({ type: 'ended', reason: 'blocked' }));
  });

  it('drops the token and cached data when another tab signs out', async () => {
    api.refresh.mockResolvedValue({ ok: true });
    const queryClient = renderSession();
    await screen.findByText('signed-in');
    tokenStore.set('access-1');

    otherTab.postMessage({ type: 'signed-out' });
    expect(await screen.findByText('signed-out')).toBeInTheDocument();
    expect(tokenStore.get()).toBeNull();
    expect(queryClient.getQueryData(['platform', 'societies'])).toBeUndefined();
  });

  it('shows "Session ended" when it ends in another tab', async () => {
    api.refresh.mockResolvedValue({ ok: true });
    const queryClient = renderSession();
    await screen.findByText('signed-in');
    tokenStore.set('access-1');

    otherTab.postMessage({ type: 'ended', reason: 'admin_revoked' });
    expect(await screen.findByText('ended')).toBeInTheDocument();
    expect(tokenStore.get()).toBeNull();
    expect(queryClient.getQueryData(['platform', 'societies'])).toBeUndefined();
  });

  it('checks the cookie again when someone signs in in another tab', async () => {
    api.refresh.mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce({ ok: true });
    renderSession();
    await screen.findByText('signed-out');

    otherTab.postMessage({ type: 'signed-in' });
    expect(await screen.findByText('signed-in')).toBeInTheDocument();
    expect(api.refresh).toHaveBeenCalledTimes(2);
  });

  it('ignores messages it does not understand', async () => {
    api.refresh.mockResolvedValue({ ok: true });
    renderSession();
    await screen.findByText('signed-in');
    otherTab.postMessage({ type: 'ended' });
    otherTab.postMessage('signed-out');
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.getByText('signed-in')).toBeInTheDocument();
  });
});

describe('reasonOf (API design 6.4, QA C3)', () => {
  it.each([
    ['expired', 'expired'],
    ['logout', 'signed_out'],
    ['logout_all', 'signed_out_elsewhere'],
    ['token_reused', 'signed_out_elsewhere'],
    ['blocked', 'blocked'],
    ['admin_revoked', 'admin_revoked'],
    ['email_changed', 'email_changed'],
    ['something_new', 'unknown'],
    ['constructor', 'unknown'],
    ['toString', 'unknown'],
  ])('maps reason %s to %s', (reason, expected) => {
    expect(reasonOf(new ApiError(401, 'SESSION_ENDED', '', null, [], { reason }))).toBe(expected);
  });

  it.each([
    ['REFRESH_TOKEN_INVALID', 'expired'],
    ['REFRESH_TOKEN_REUSED', 'signed_out_elsewhere'],
    ['ACCOUNT_BLOCKED', 'blocked'],
  ])('maps code %s to %s', (code, expected) => {
    expect(reasonOf(new ApiError(401, code, '', null))).toBe(expected);
  });
});
