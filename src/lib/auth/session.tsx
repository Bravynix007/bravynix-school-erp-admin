'use client';

import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { api } from '@/lib/api/client';
import { ApiError } from '@/lib/api/api-error';
import { authApi } from './auth-api';
import { openSessionChannel, type SessionChannel } from './session-channel';
import { tokenStore } from './token-store';

export type SessionEndReason =
  | 'expired'
  | 'signed_out'
  | 'signed_out_elsewhere'
  | 'blocked'
  | 'admin_revoked'
  | 'email_changed'
  | 'unknown';

export type SessionState =
  | { status: 'checking' }
  | { status: 'signed-in' }
  | { status: 'signed-out' }
  /**
   * The refresh got no usable answer (offline, timeout, 5xx or 429); the
   * cookie may still be good. `retryAfterSeconds` comes from a 429 or 503.
   */
  | { status: 'unreachable'; retryAfterSeconds: number | null }
  | { status: 'ended'; reason: SessionEndReason };

interface SessionContextValue {
  state: SessionState;
  /** Called by the login flow once it holds an access token. */
  signedIn(accessToken: string): void;
  /**
   * Ends the session on the server first. If the API cannot be reached the
   * operator stays signed in and this rejects, so a shared PC is never left
   * with a live refresh cookie behind a signed-out screen.
   */
  signOut(options?: { everywhere?: boolean }): Promise<void>;
  /** Tries the refresh again after `unreachable`. */
  retry(): void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

/** `reason` values from API design 6.4, and the refresh codes from 10.3. */
const REASONS: Record<string, SessionEndReason> = {
  expired: 'expired',
  logout: 'signed_out',
  logout_all: 'signed_out_elsewhere',
  token_reused: 'signed_out_elsewhere',
  blocked: 'blocked',
  admin_revoked: 'admin_revoked',
  email_changed: 'email_changed',
};

function isReason(value: string): value is SessionEndReason {
  return Object.values(REASONS).includes(value as SessionEndReason) || value === 'unknown';
}

export function reasonOf(error: ApiError): SessionEndReason {
  const reason = error.details.reason;
  // Object.hasOwn, so `constructor` or `toString` never match (re-review R-C6).
  if (typeof reason === 'string' && Object.hasOwn(REASONS, reason)) return REASONS[reason]!;
  switch (error.code) {
    case 'TOKEN_EXPIRED':
    case 'REFRESH_TOKEN_INVALID':
      return 'expired';
    case 'REFRESH_TOKEN_REUSED':
      return 'signed_out_elsewhere';
    case 'ACCOUNT_BLOCKED':
      return 'blocked';
    default:
      return 'unknown';
  }
}

/**
 * The state after another tab reports the session over. Only a signed-in tab
 * shows "Session ended"; a tab on the sign-in page stays there, and one still
 * checking gets its own answer from the API.
 */
export function endedElsewhere(current: SessionState, reason: SessionEndReason): SessionState {
  switch (current.status) {
    case 'signed-in':
      return { status: 'ended', reason };
    case 'checking':
    case 'ended':
      return current;
    default:
      return { status: 'signed-out' };
  }
}

/**
 * Holds the console session. On load it asks for a fresh access token with
 * the HttpOnly refresh cookie; a 12-hour console session cannot be extended
 * (API design 6.1), so expiry ends in the "Session ended" card. Whenever the
 * session ends, every cached query is dropped so the next operator sees
 * nothing of the last one, in this tab and, through the session channel, in
 * every other open tab.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<SessionState>({ status: 'checking' });
  const [attempt, setAttempt] = useState(0);
  const channel = useRef<SessionChannel | null>(null);

  useEffect(() => {
    const opened = openSessionChannel((message) => {
      tokenStore.clear();
      queryClient.clear();
      if (message.type === 'signed-out') {
        setState({ status: 'signed-out' });
      } else if (message.type === 'ended') {
        const reason = isReason(message.reason) ? message.reason : 'unknown';
        setState((current) => endedElsewhere(current, reason));
      } else {
        // Someone signed in elsewhere: check whose session the cookie holds now.
        setState({ status: 'checking' });
        setAttempt((n) => n + 1);
      }
    });
    channel.current = opened;
    return () => {
      opened.close();
      channel.current = null;
    };
  }, [queryClient]);

  useEffect(() => {
    api.setSessionEndedHandler((error) => {
      const reason = reasonOf(error);
      queryClient.clear();
      setState({ status: 'ended', reason });
      channel.current?.post({ type: 'ended', reason });
    });
    return () => api.setSessionEndedHandler(undefined);
  }, [queryClient]);

  useEffect(() => {
    let active = true;
    api.refresh().then(
      (result) => {
        if (!active) return;
        if (result.ok) {
          setState({ status: 'signed-in' });
          return;
        }
        setState({ status: 'signed-out' });
        // Every tab shares the refused cookie, so the session is over in all of them.
        channel.current?.post({ type: 'ended', reason: reasonOf(result.error) });
      },
      (error: unknown) => {
        const retryAfterSeconds = error instanceof ApiError ? error.retryAfterSeconds : null;
        if (active) setState({ status: 'unreachable', retryAfterSeconds });
      },
    );
    return () => {
      active = false;
    };
  }, [attempt]);

  const signedIn = useCallback(
    (accessToken: string) => {
      queryClient.clear();
      tokenStore.set(accessToken);
      setState({ status: 'signed-in' });
      channel.current?.post({ type: 'signed-in' });
    },
    [queryClient],
  );

  const signOut = useCallback(
    async ({ everywhere = false } = {}) => {
      try {
        await (everywhere ? authApi.logoutAll() : authApi.logout());
      } catch (error) {
        // A 401 means the server has already ended this session.
        if (!(error instanceof ApiError && error.status === 401)) throw error;
      }
      tokenStore.clear();
      queryClient.clear();
      setState({ status: 'signed-out' });
      channel.current?.post({ type: 'signed-out' });
    },
    [queryClient],
  );

  const retry = useCallback(() => {
    setState({ status: 'checking' });
    setAttempt((n) => n + 1);
  }, []);

  const value = useMemo(() => ({ state, signedIn, signOut, retry }), [state, signedIn, signOut, retry]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside <SessionProvider>');
  return value;
}
