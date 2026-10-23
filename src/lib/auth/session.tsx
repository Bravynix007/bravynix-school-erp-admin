'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '@/lib/api/client';
import type { ApiError } from '@/lib/api/api-error';
import { authApi } from './auth-api';
import { tokenStore } from './token-store';

export type SessionEndReason = 'expired' | 'signed_out_elsewhere' | 'blocked' | 'unknown';

export type SessionState =
  | { status: 'checking' }
  | { status: 'signed-in' }
  | { status: 'signed-out' }
  | { status: 'ended'; reason: SessionEndReason };

interface SessionContextValue {
  state: SessionState;
  /** Called by the login flow once it holds an access token. */
  signedIn(accessToken: string): void;
  signOut(options?: { everywhere?: boolean }): Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

function reasonOf(error: ApiError): SessionEndReason {
  const reason = error.details.reason;
  if (reason === 'expired' || error.code === 'TOKEN_EXPIRED') return 'expired';
  if (reason === 'blocked' || error.code === 'ACCOUNT_BLOCKED') return 'blocked';
  if (reason === 'logout_all' || reason === 'revoked' || error.code === 'REFRESH_TOKEN_REUSED') {
    return 'signed_out_elsewhere';
  }
  return 'unknown';
}

/**
 * Holds the console session. On load it asks for a fresh access token with
 * the HttpOnly refresh cookie; a 12-hour console session cannot be extended
 * (API design 6.1), so expiry ends in the "Session ended" card.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: 'checking' });

  useEffect(() => {
    api.setSessionEndedHandler((error) => setState({ status: 'ended', reason: reasonOf(error) }));
    let active = true;
    void api.refresh().then((ok) => {
      if (active) setState(ok ? { status: 'signed-in' } : { status: 'signed-out' });
    });
    return () => {
      active = false;
      api.setSessionEndedHandler(undefined);
    };
  }, []);

  const signedIn = useCallback((accessToken: string) => {
    tokenStore.set(accessToken);
    setState({ status: 'signed-in' });
  }, []);

  const signOut = useCallback(async ({ everywhere = false } = {}) => {
    try {
      await (everywhere ? authApi.logoutAll() : authApi.logout());
    } finally {
      tokenStore.clear();
      setState({ status: 'signed-out' });
    }
  }, []);

  const value = useMemo(() => ({ state, signedIn, signOut }), [state, signedIn, signOut]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside <SessionProvider>');
  return value;
}
