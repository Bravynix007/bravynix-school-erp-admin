import { defineConfig, devices } from '@playwright/test';

/**
 * Browser checks against the static export AND a real API (`npm run test:e2e:live`).
 * It needs the backend on http://localhost:3000 with `CORS_ORIGINS=http://localhost:3001`
 * and `OTP_DEV_ECHO=true`, over a database seeded with the two-worlds scenario
 * (see README, "Live checks"). One worker: the checks share the seeded Super Admins.
 */
export default defineConfig({
  testDir: './e2e-live',
  workers: 1,
  reporter: 'list',
  use: { baseURL: 'http://localhost:3001', locale: 'en-IN', timezoneId: 'Asia/Kolkata' },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined },
      },
    },
  ],
  webServer: {
    command: 'npx serve out -l 3001 --no-clipboard',
    url: 'http://localhost:3001',
    reuseExistingServer: true,
  },
});
