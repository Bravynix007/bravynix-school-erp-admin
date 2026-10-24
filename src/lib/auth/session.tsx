'use client';

import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '@/lib/api/client';
import { ApiError } from '@/lib/api/api-error';
import { authApi } from './auth-api';
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
  /** The refresh could not reach the API; the cookie may still be good. */
  | { status: 'unreachable' }
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

export function reasonOf(error: ApiError): SessionEndReason {
  const reason = error.details.reason;
  if (typeof reason === 'string' && reason in REASONS) return REASONS[reason]!;
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
 * Holds the console session. On load it asks for a fresh access token with
 * the HttpOnly refresh cookie; a 12-hour console session cannot be extended
 * (API design 6.1), so expiry ends in the "Session ended" card. Whenever the
 * session ends, every cached query is dropped so the next operator in this
 * tab sees nothing of the last one.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<SessionState>({ status: 'checking' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    api.setSessionEndedHandler((error) => {
      queryClient.clear();
      setState({ status: 'ended', reason: reasonOf(error) });
    });
    return () => api.setSessionEndedHandler(undefined);
  }, [queryClient]);

  useEffect(() => {
    let active = true;
    api.refresh().then(
      (result) => {
        if (active) setState(result.ok ? { status: 'signed-in' } : { status: 'signed-out' });
      },
      () => {
        if (active) setState({ status: 'unreachable' });
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
