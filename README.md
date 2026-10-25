# bravynix-school-erp-admin

The BravyNix School ERP **Super Admin console**: onboarding Societies and Institutions, platform
dues and pricing, access pause, AI reports and the audit log. Only Super Admins (at most three)
sign in here; everyone else uses the Flutter app.

Built with Next.js 16 (App Router, TypeScript) and **statically exported**: `npm run build`
writes plain HTML, CSS and JS to `out/`, which is served from S3 behind CloudFront (system
design 6.1, ADR-14). There is no Node server in production.

## Quick start

```bash
nvm use                 # Node 24 (.nvmrc)
npm ci
cp .env.example .env.local
npm run dev             # http://localhost:3001, expects the API on http://localhost:3000/v1
```

Run the backend (`bravynix-school-erp-backend`) with `docker compose up -d && npm run start:dev`
to sign in for real. The seeded Super Admin's email is in the backend's two-worlds seed; the
code arrives in Mailpit at http://localhost:8025.

| Script                 | What it does                                                                             |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| `npm run dev`          | Dev server on port 3001 (Turbopack)                                                      |
| `npm run build`        | Static export to `out/`; needs `NEXT_PUBLIC_APP_ENV` set (see Configuration)             |
| `npm run build:local`  | The same, with `.env.development`: a local build for the e2e tests                       |
| `npm start`            | Serves `out/` on port 3001                                                               |
| `npm run lint`         | ESLint (Next core web vitals, TypeScript, project rules)                                 |
| `npm run typecheck`    | Generates typed routes, then `tsc --noEmit`                                              |
| `npm test`             | Vitest unit and component tests (jsdom)                                                  |
| `npm run test:e2e`     | Playwright in Chromium, Firefox and WebKit against `out/` from `build:local`, API mocked |
| `npm run format:check` | Prettier, with Tailwind class sorting                                                    |

`npx playwright install chromium firefox webkit` fetches the browsers once. Where only Chromium
is installed (as in Claude Code cloud sessions), point Playwright at it and run that project:
`PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run test:e2e -- --project=chromium`. CI
runs all three.

## Configuration

Read at build time and inlined into the bundle, so each environment gets its own build.

| Variable                   | Example                          | Notes                                                                                                                                                                       |
| -------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL` | `https://api.bravynix.in/v1`     | Must include `/v1`. Required and `https` (never a local host) for staging and production builds, which fail otherwise; a local build defaults to `http://localhost:3000/v1` |
| `NEXT_PUBLIC_APP_ENV`      | `local`, `staging`, `production` | Required for every build, which fails without it. Shows an environment badge unless `production`                                                                            |

`npm run dev` and `npm run build:local` read both from `.env.development`; `npm run build`
does not, so a deploy that forgets them fails instead of shipping a local build. Nothing secret
belongs here: everything `NEXT_PUBLIC_*` ends up in the browser.

### Supported browsers

The current and previous major versions of Chrome, Edge, Firefox and Safari (Safari 16.4 or
later, the oldest Next.js 16 supports). All of them have Web Locks and BroadcastChannel, which
keep tabs from refreshing at once and sign every tab out together.

## Layout

```
src/
  app/                    Routes only (App Router). (auth) = sign-in card, (console) = shell
  features/<module>/      Screens, forms and hooks for one module (auth today)
  components/ui/          Design-system primitives: Button, fields (TextField, Select, MoneyField...),
                          DataTable, FilterBar, Tabs, KpiTile, Timeline, StatusChip... Shown on /gallery
                          (local and staging builds only)
  components/shell/       Sidebar, top bar, page header, session-ended, placeholders
  lib/api/                The API client, envelope types, ApiError
  lib/auth/               Session provider, in-memory token store, auth calls
  lib/format/             Money (₹1,24,500.00, ₹6.8 L) and IST dates (DD-MM-YYYY HH:mm)
  config/navigation.ts    The sidebar's 8 destinations
e2e/                      Playwright specs and API mocks
```

## Rules every change follows

- **Static export only.** No middleware or proxy, server actions, cookies(), headers(),
  rewrites, or route handlers that need a server. Dynamic records use query parameters
  (`/societies/workspace/?id=...`) rather than `[id]` segments.
- **The API is the security boundary.** The console's route guard is a convenience; every call
  is authorised by the API's role policy.
- **Tokens stay in memory.** The access token lives in `lib/auth/token-store.ts`; the refresh
  token is an HttpOnly cookie the script never sees. ESLint blocks `localStorage` and
  `sessionStorage`.
- **All API calls go through `lib/api/client.ts`** (ESLint blocks bare `fetch`). It unwraps the
  envelope, maps errors to `ApiError`, refreshes once on `TOKEN_EXPIRED`, and sets the request
  id. Branch on `error.code`, never on `message`.
- **Input outlines use `border-field` (`#80878D`, 3.7:1 on white; WCAG 1.4.11 asks for 3:1), not the
  decorative `border-default` the DESIGN.md components table lists (about 1.4:1).** Raise with the design
  owner if DESIGN.md should change.
- **Design tokens only** (DESIGN.md, "Quiet Ledger"). Colours, type sizes, radius and shadows
  come from `src/app/globals.css`; no hex values in components. One primary button per view.
  Status chips use the fixed `statusTone` mapping.
- **Money is a decimal string** from the API and is formatted without floating point. Dates and
  times are shown in IST.
- **No passwords anywhere.** Login is email code, then authenticator code.
- Comments cite the doc section they implement, e.g. "API design 6.2".

## Design references

- `school_erp_project/design/super-admin-console/DESIGN.md`: tokens, components, states
- `school_erp_project/design/super-admin-console/STITCH_PROMPT.md`: screen-by-screen layouts
- `school_erp_project/docs/API_DESIGN.md`: endpoints, envelope, error codes
