'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { ApiError } from '@/lib/api/api-error';
import { SessionProvider } from '@/lib/auth/session';

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        // Retry reads only when the API says it may help: 429, 503, offline;
        // at most twice (API design 8.2).
        retry: (failureCount, error) => failureCount < 2 && error instanceof ApiError && error.isRetryable,
        retryDelay: (attempt, error) =>
          error instanceof ApiError && error.retryAfterSeconds
            ? error.retryAfterSeconds * 1000
            : Math.min(1000 * 2 ** attempt, 8000),
      },
      // Writes are never retried automatically; a repeat must reuse its Idempotency-Key.
      mutations: { retry: false },
    },
  });
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>{children}</SessionProvider>
    </QueryClientProvider>
  );
}
