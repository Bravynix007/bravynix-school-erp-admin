import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Unit and component tests: src/**/*.test.ts(x), jsdom. Browser flows live in e2e/ (Playwright).
export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
    env: {
      NEXT_PUBLIC_API_BASE_URL: 'http://api.test/v1',
      NEXT_PUBLIC_APP_ENV: 'local',
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/app/**/page.tsx'],
    },
  },
});
