# Elsewhere

**A little planning. A lot of possibility.**

A private travel budget planner that answers **“can this trip fit my budget?”** Enter local prices, account for nights and people, leave a buffer for surprises, and compare an extra night before committing. No account, paid service, or API key required.

## Run

Requires **Node.js 24+** and npm. Use the existing checkout; each cloud task is already isolated.

```sh
cd /workspace/codex-api-experiment # or your local clone
npm ci
npm run dev
```

The development server uses port **5173**. Both the frontend and rate endpoint start with this command. Use the address printed by Vite in your own development environment.

For production:

```sh
npm run build
npm start
```

The Node server serves the built app and `/api/rates/:currency` on port **3000**. Set `PORT` and optionally `HOST` to change the listener. Deploy this server with the `dist` directory: a static-only deployment cannot provide the rate endpoint. No database or environment file is needed. `npm run preview` runs a built-app preview with the API on port **4173**.

## Features

- Mixed-currency planning in 42 fiat currencies, with daily reference rates.
- One-off, nightly, and daily costs, shared or per traveler.
- Booked and estimated costs; a 0–30% buffer applies only to estimates.
- Group, per-person, and per-day totals; category breakdown and remaining budget.
- Reversible “what if” comparisons for stay length and group size.
- Multiple plans, duplication, cost editing, removal with undo, and category filters.
- CSV reports and portable JSON backups; imports preserve existing plans.
- Browser-local persistence, explicit storage-failure recovery, and saved-rate fallback.
- Responsive layout, keyboard-operated dialogs, reduced-motion support, self-hosted fonts, and original SVG artwork.

The initial Lisbon trip is explicitly an **example**. Its prices are illustrative estimates, not quotes from a booking service. “Start fresh” creates your own empty plan.

## APIs and product choice

I evaluated **19 API candidates** across finance, calendars, weather, environment, books, food, geography, science, and transport. See [the comparison and connectivity evidence](docs/api-research.md).

The app uses [Currency API by fawazahmed0](https://github.com/fawazahmed0/exchange-api), listed as **Currency-api** in [public-apis/public-apis](https://github.com/public-apis/public-apis#currency-exchange). It needs no key and publishes daily reference rates and historical dated endpoints. The app selects fiat currencies from the provider's larger set, which also includes crypto and metals.

```text
Primary:  https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/{base}.json
Fallback: https://latest.currency-api.pages.dev/v1/currencies/{base}.json
```

The backend validates responses, coalesces concurrent requests, and caches successful results for 15 minutes. The browser caches validated rates for six hours before refreshing. Failed refreshes keep saved rates with a warning. Provider dates older than three days are marked clearly. Missing required rates suppress the total and CSV export; the app never invents a 1:1 conversion.

Allow HTTPS to `cdn.jsdelivr.net` for normal operation. The provider's Cloudflare fallback is implemented and unit-tested, but its host is blocked by this workspace's proxy, so live fallback availability is **unverified here**. The primary works end-to-end. Commands use Node's supported `--use-env-proxy` behavior, preserving existing HTTPS proxy settings and TLS verification. No certificate checks are disabled.

## Calculation rules

1. Nights are UTC calendar-day differences; travel days equal nights + 1. A same-day trip has 0 nights and 1 day.
2. Each line is unit price × frequency × travelers, when per-person is selected.
3. Since the API gives `1 home currency = X local currency`, the app **divides** the local total by X and rounds once at the home-currency boundary.
4. Line totals are summed as integer minor units. JPY uses 0 decimals; KWD and BHD use 3.
5. The contingency is calculated from converted estimates, excluding booked costs. Remaining budget includes the contingency.

Changing home currency also converts the budget when rates are available; otherwise the form explicitly asks you to review the unchanged budget number. Changing the local default never relabels existing items. All recurring costs, including booked items, scale in scenarios. Fixed bookings may need manual repricing; availability is not checked. Reference rates do not include card fees, spreads, or future rate changes.

## Privacy and durability

Plans live only in this browser's `localStorage`. Destinations, amounts, names, and traveler details are never uploaded. The browser sends only the chosen currency to the rate endpoint. There is no tracking, account, database, or automatic sync. The rate provider receives ordinary server connection information and the requested base currency.

Clearing browser data, changing devices, or using another origin/port creates a separate workspace. **Download JSON backups to keep or share plans.** Unreadable saved data is preserved until a recovery backup is downloaded. Storage failures show a warning so in-memory work can be exported.

Imports are schema-validated and limited to 2 MB, 20 plans, and 200 costs per plan. CSV cells are escaped against spreadsheet formula injection. The production server restricts outbound requests to provider URLs and supported currencies, serves only built assets, and sets a restrictive Content Security Policy. For a public deployment, add request rate limiting at your hosting platform.

## Verify

```sh
npm test                 # deterministic domain and server tests
npm run build            # strict TypeScript + production bundle
npm run test:e2e         # desktop + mobile Chromium journeys
npm run verify:api       # real current/historical API calls; needs internet
npm run verify:app       # production-server + Chromium smoke test with live rates; build first
npm run check            # build + unit + browser tests
```

Tests use system Chromium at `/usr/bin/chromium` when available. Otherwise run `npx playwright install chromium` once, or set `CHROMIUM_PATH`. E2E tests start a preview server on port 4173. They use **synthetic fixed rates** for reproducible budget assertions. Real endpoint verification is separate and never substitutes fixture data when a request fails.

See [verification details and remaining limits](docs/verification.md).

## Technology and structure

React 19, TypeScript, Vite, a small Node HTTP backend, Lucide, self-hosted DM Sans and Instrument Serif, Vitest, Playwright, and axe-core. Node 24's native TypeScript support runs the production server.

```text
src/components/         Forms, dialogs, budget views, illustration
src/lib/                Money, dates, validated storage, rates, exports
server/                 Cached rate proxy and production server
tests/e2e/               Browser journeys and accessibility checks
scripts/verify-api.mjs   Non-mocked endpoint verification
docs/                   Research and verification evidence
```
