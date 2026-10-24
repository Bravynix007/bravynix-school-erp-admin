import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    rules: {
      // UI code reads the API through src/lib/api only (API design 8.2).
      'no-restricted-globals': [
        'error',
        {
          name: 'localStorage',
          message: 'Tokens and session data never go in web storage (API design 6.1).',
        },
        {
          name: 'sessionStorage',
          message: 'Tokens and session data never go in web storage (API design 6.1).',
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.name='fetch']",
          message:
            'Call the API through src/lib/api/client.ts so the envelope, refresh and request ids apply.',
        },
      ],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['src/lib/api/client.ts', '**/*.test.ts', '**/*.test.tsx', 'e2e/**'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
    'next-env.d.ts',
  ]),
]);
