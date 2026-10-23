/**
 * The access token lives in memory only: never in localStorage, cookies the
 * script can read, or the URL (API design 6.1). The refresh token is an
 * HttpOnly cookie scoped to /v1/auth that this code never sees. A reload
 * therefore starts with no access token and asks /auth/refresh for one.
 */
let accessToken: string | null = null;
const listeners = new Set<(token: string | null) => void>();

export const tokenStore = {
  get(): string | null {
    return accessToken;
  },
  set(token: string | null): void {
    accessToken = token;
    for (const listener of listeners) listener(token);
  },
  clear(): void {
    tokenStore.set(null);
  },
  subscribe(listener: (token: string | null) => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
