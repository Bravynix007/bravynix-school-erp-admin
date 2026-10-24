@AGENTS.md

# Notes for AI assistants working in this repo

Read `README.md` first; its "Rules every change follows" section is binding.

- Next.js 16 differs from older versions. Check `node_modules/next/dist/docs/` before using an
  API you have not used here yet, and remember the app is a static export (`output: 'export'`).
- Typed routes are on: hrefs are written without the trailing slash (`/societies`); Next adds
  it because `trailingSlash` is true. New pages need `npm run typecheck` to regenerate types.
- New screen checklist: route file in `src/app/(console)/...` that only composes a feature
  component; feature code in `src/features/<module>/`; data via TanStack Query hooks calling
  `api`; copy for every error code the endpoint can return; loading, empty, error and 403 states
  (DESIGN.md 16); a component test and, for a full flow, a Playwright spec with mocked API.
- Never commit secrets, real personal data or seeded credentials.
- Before pushing: `npm run format:check && npm run lint && npm run typecheck && npm test &&
npm run build:local && npm run test:e2e`.
