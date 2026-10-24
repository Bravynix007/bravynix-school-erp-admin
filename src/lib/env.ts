import { z } from 'zod';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
const LOCAL_API = 'http://localhost:3000/v1';

const schema = z.object({
  NEXT_PUBLIC_APP_ENV: z.enum(['local', 'staging', 'production']).default('local'),
  NEXT_PUBLIC_API_BASE_URL: z.url().optional(),
});

export interface ConsoleEnv {
  NEXT_PUBLIC_APP_ENV: 'local' | 'staging' | 'production';
  NEXT_PUBLIC_API_BASE_URL: string;
}

/**
 * A local build may default to the local API over HTTP. A staging or
 * production build must name its API, over HTTPS, and never a local one, so
 * a build made without settings cannot ship pointing at localhost.
 */
export function parseEnv(raw: Record<string, string | undefined>): ConsoleEnv {
  const parsed = schema.parse(raw);
  const appEnv = parsed.NEXT_PUBLIC_APP_ENV;
  const apiBaseUrl = parsed.NEXT_PUBLIC_API_BASE_URL ?? (appEnv === 'local' ? LOCAL_API : undefined);
  if (!apiBaseUrl) {
    throw new Error(`NEXT_PUBLIC_API_BASE_URL is required for a ${appEnv} build`);
  }
  const url = new URL(apiBaseUrl);
  const local = LOCAL_HOSTS.has(url.hostname);
  if (appEnv === 'local' ? !local && url.protocol !== 'https:' : local || url.protocol !== 'https:') {
    throw new Error(
      appEnv === 'local'
        ? 'NEXT_PUBLIC_API_BASE_URL must be https unless it is a local API'
        : `NEXT_PUBLIC_API_BASE_URL for a ${appEnv} build must be an https URL that is not local`,
    );
  }
  return { NEXT_PUBLIC_APP_ENV: appEnv, NEXT_PUBLIC_API_BASE_URL: apiBaseUrl };
}

/**
 * Build-time configuration. Next inlines `NEXT_PUBLIC_*` values when it
 * builds, so each must be read by its full name here.
 */
export const env = parseEnv({
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
});
