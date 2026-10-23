import { z } from 'zod';

const schema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.url().default('http://localhost:3000/v1'),
  NEXT_PUBLIC_APP_ENV: z.enum(['local', 'staging', 'production']).default('local'),
});

/**
 * Build-time configuration. Next inlines `NEXT_PUBLIC_*` values when it
 * builds, so each must be read by its full name here.
 */
export const env = schema.parse({
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
});
