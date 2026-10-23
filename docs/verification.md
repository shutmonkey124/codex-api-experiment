# Verification

Checked in the actual cloud workspace on **23 October 2026** using Node 24.19.0, npm 11.9.0, and system Chromium. These are completed checks, not suggested future steps.

## Reproducible install and build

- `npm ci --no-audit`: passed from the repository lockfile.
- `npm run build`: strict TypeScript checking and the Vite production build passed.
- The production JavaScript bundle is approximately 280 KB (88 KB gzip). Fonts and the original SVG illustration are served locally.
- `git diff --check`: passed. Dependency output, production builds, browser traces, and reports are ignored by Git.

## Automated checks

`npm run check` passed with **40 unit/server tests and 30 Chromium browser tests**, with no skipped tests.

The domain/server suite checks daily/nightly and per-traveler math, booked-cost exclusion from the buffer, daylight-saving and leap-day date arithmetic, same-day trips, missing and mismatched currency data, cent rounding, JPY/KWD precision, unsafe-integer limits, schema validation, invalid dates, duplicate IDs, CSV formula escaping, API response validation, abort behavior, server caching, concurrent request coalescing, and the provider fallback.

The browser suite runs 15 checks on desktop and the same 15 in phone-size Chromium emulation:

- Full example budget and explicit sample-price labeling.
- Trip creation, recurring mixed-currency costs, booking status, and persistence after reload.
- Editing, deletion, and undo.
- Previewing, canceling, and applying an extra-night scenario.
- Home-currency changes with conversion of the budget itself.
- Filtering and useful empty states.
- Actual CSV and JSON downloads; importing the downloaded backup.
- Malformed import rejection without losing existing plans.
- API failure, suppression of incomplete totals, and recovery.
- Saved-rate use during an outage with an explicit warning.
- Preservation and recovery of unreadable local storage.
- Keyboard dialog focus and Escape handling.
- Plan duplication and deletion without losing the original.
- Import behavior and private-data request boundaries.
- axe-core WCAG 2 A/AA and WCAG 2.1 AA checks on the main view and trip form: **zero detected violations** on desktop and mobile.

Browser tests intentionally use synthetic fixed exchange rates. Server fallback/failure tests also use explicit test responses. These deterministic checks establish arithmetic and recovery behavior; they do not establish upstream availability.

## Real network and production checks

`npm run verify:api` made real HTTPS requests to the current currency list, USD and EUR tables, and a historical USD table dated **2025-01-15**. All passed, with no fixtures or mocked requests. It verified HTTP 200, CORS headers, reference dates, identity rates, positive rates for all 42 supported currencies, and same-date USD/EUR reciprocal consistency.

Observed provider date: **2026-10-23**. The raw table contained **339** entries. Observed references: `1 USD = 0.89177251 EUR`, `1 EUR = 1.12136222 USD`.

`npm run verify:app` started the actual standalone production server and opened its built frontend in Chromium, without intercepting or mocking requests. It passed:

- Production startup and HTML delivery.
- Content Security Policy header.
- Unsupported-currency rejection, HTTP method restriction, and path-traversal rejection.
- Successful live rate response through the real server.
- Browser example total **$1,369.02**, independently checked against the actual upstream EUR rate and documented sample costs.
- Editing a trip and retaining the edit after reload.
- No horizontal page overflow at **360, 390, 768, and 1440 px**.
- No browser JavaScript errors.

The development server was also started and its HTML and `/api/rates/usd` were checked. TLS, artifact integrity, and proxy certificate verification stayed enabled throughout installation and final verification. The original direct-browser TLS failure was fixed by using Node's existing trusted proxy configuration, not by bypassing certificate checks.

## Remaining limits

- The provider's documented `latest.currency-api.pages.dev` fallback is blocked by this environment's outbound proxy. Its behavior is unit-tested; its live availability is unverified. Normal operation uses the verified jsDelivr primary.
- Safari, Firefox, physical phones, and assistive-technology users were not tested. Chromium phone emulation and automated accessibility checks do not replace those checks.
- There is no hosted deployment or load test. The production server was verified locally. Public hosting should provide HTTPS and request rate limiting.
- Rates are daily planning references, not card/bank quotes. No booking prices, actual availability, tax obligations, or future exchange rates are verified.
- Storage is local to the browser and origin. There is no account, automatic cross-device sync, or collaborative editing. JSON backups provide manual portability.
- Reusable `install_script` and `start_skill` were saved to the environment configuration draft. Saving a draft does not publish it or prove restoration into a new task. Publication and fresh-task restoration remain unverified.
