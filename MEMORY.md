# Project memory

## What this is

A fully client-side analyzer for the Trade Republic transaction export. The CSV
never leaves the browser: no backend, no runtime network call, no CDN. The
promise is verifiable by anyone from the browser's Network tab, and it is what
keeps the host out of GDPR controller territory.

## Non-negotiable constraints

- The real export never enters the repository and never appears in a log or an
  error message: a row carries the account holder's name and IBAN. CI runs on
  synthetic fixtures only.
- `src/core/` is pure and DOM-free. `src/ui/` holds no calculation logic.
- localStorage is for preferences only, never for report data.
- Code, comments, docs and commits in English. UI in Italian and English.

## The one detail that decides correctness

`src/core/money.ts` sets `Decimal.set({ precision: 28, rounding: ROUND_HALF_EVEN })`
to match Python's `decimal` default context. decimal.js defaults to precision 20.
Unit cost is computed by division, so the narrower precision silently shifts
cents across ~2000 rows. Getting this wrong is exactly the "a few cents off"
symptom, and it is not a `number` vs `Decimal` bug — it is a context bug.

## Export traps the engine must keep handling

- `amount` is never enough on its own: `TAX_OPTIMIZATION` carries its value only
  in `tax`, `CARD_ORDERING_FEE` only in `fee`. Both are collected from every row
  before any `continue`. Missing them loses 569.03 of taxes and 5.00 of costs.
- `shares` on a `DIVIDEND` row is the position that produced the coupon, not
  units received. Summing them adds 3517 phantom units.
- `BONUS_ISSUE_CANCELLED` is not a sale: it releases zero-cost lots, most recent
  first. Treating it as a sale invents a loss.
- `MIGRATION` rows pair to zero and are ignored entirely.
- `date` and `datetime` diverge: FIFO orders by `datetime`, time aggregations
  group by `date`.
- One order is often split across two rows sharing a timestamp (76 such
  timestamps in the reference file).
- The export mixes three `datetime` formats (`.000Z`, `.000000Z`, bare `Z`).
  Python sorts them as strings, so the port does too. Both sorts are stable.

## Local-only workflow (gitignored `.local/`)

- `.local/specs/2026-08-31-trade-republic-analyzer-design.md` — approved spec.
- `.local/verify-reference.ts` — acceptance check against the real file. Prints
  aggregates only, never a row. `npx vite-node .local/verify-reference.ts`.
- `.local/inspect-shape.ts` — structural probe of the real file: column names,
  value counts, string patterns, never a field value. The synthetic fixture is
  modelled on its output.

## Decisions taken

- MIT license; GitHub Pages, no custom domain; README screenshots only from
  synthetic data.
- The monthly histogram counts BUY and SELL **rows**, and the chart label must
  say so: split orders make it exceed the number of orders placed.
- An unknown operation type is recorded in `report.unclassified` and its amount
  is deliberately kept OUT of the profit, so `reconcile` reports the gap instead
  of absorbing it. The reference Python raises here; the web build must be noisy
  but not fatal (spec §9).
- `WindowSummary.empty` means "nothing moved the profit", not "no rows". Windows
  are anchored to the last date in the file, so the smallest window always
  contains at least one row — the "no rows" reading would be dead code.
- Sections are reached from a collapsible left rail (`src/ui/rail.ts`), not the
  old horizontal strip. It reads the rendered `.section[id]` nodes rather than a
  hand-kept list, so a section that declines to render leaves no dead link, and
  toggling it mutates `data-open` in place: re-rendering would discard the scroll
  position the rail exists to protect. Its 14 glyphs are drawn in
  `src/ui/icons.ts` because an icon CDN would break the no-network promise.

## The privacy claim is enforced from three sides

1. `tests/ui/guards.test.ts` — source sweep: no `fetch`/`sendBeacon`/… in
   `src/ui`. Catches our own code.
2. `scripts/check-bundle.mjs` (runs at the end of `npm run build`) — no
   absolute `http(s)://` in `dist/` outside an exact-match allowlist. Catches a
   dependency. The allowlist currently holds three entries: the SVG namespace,
   and the papaparse and decimal.js licence banners. Matching is exact so a new
   path on an allowed host is a new human decision.
3. `e2e/no-network.spec.ts` — Playwright over `vite preview`: load, feed the
   fixture, switch language and theme, assert the request list stays at
   `/`, `/assets/index.css`, `/assets/index.js`.

Both gates were falsified before being trusted: an injected `fetch` fails (3),
a URL reaching the bundle fails (2). Two things (3) cannot see, measured not
assumed: a call on a timer longer than its 2 s quiet windows, and a
`sendBeacon` on `pagehide` — Chromium reports that to neither `request` nor
`route`. (2) is what covers them.

`pages.yml` repeats both. It and `ci.yml` start from the same push and neither
waits for the other, so a CI-only gate would not stop a bad deploy.

## Current state

Live at <https://schengatto.github.io/trade-republic-analyzer/>, deployed from
`main` by `pages.yml`. 349 tests across 17 files. The whole gate — `lint`,
`typecheck`, `test`, `build` (which ends in `check:bundle`) and `test:e2e` —
is green locally and in both workflows.

Node floor is **24.15.0**, written once in `engines.node` and repeated verbatim
in the two workflows and the two docs. It is a test-toolchain floor, not an app
one: the built page is static. jsdom 30 declares
`^22.22.2 || ^24.15.0 || >=26.0.0`, and the workflows pin the floor rather than
"latest 24" so the version claimed is the version exercised. Confirmed on the
runner, not assumed: both workflow logs for `473549c` read
`Attempting to download 24.15.0` → `node: v24.15.0`, so setup-node resolves the
exact pin and no fallback to the `24` line was needed.

`scripts/check-node-version.mjs` is what keeps those five numbers equal. It runs
from `tests/build/check-node-version.test.ts`, so drift fails `npm test` in both
workflows. A file matching nothing is a failure rather than a pass, which is how
it catches the other realistic edit: loosening a pin to `node-version: 24`,
legitimate in itself but making "the floor is the version exercised" false until
the docs change too. It lives in a test rather than at the end of `npm run build`
because it reads source, not build output; `check:bundle` is in `build` because
it reads `dist/`. It was falsified both ways — synthetically per file, and by
editing the real README to 24.16.0 and watching `npm test` fail.

A sixth copy lives in `package-lock.json`, at `packages[""].engines`, and it had
already drifted: `473549c` moved `engines.node` to `>=24.15.0` and left the
lockfile at `>=22.22.2`, where it sat until an unrelated `npm install` repaired
it in `c1e717a`. Nothing noticed, because nothing looks — `npm ci` checks the
root entry's name, version and dependencies against `package.json` and ignores
its `engines`; proved by drifting a copy of the real pair and watching `npm ci`
report "added 192 packages" and exit 0. `engines` is the one root field npm ci
does not verify, which is why guarding it is worth ten lines.

It is checked in the same script but not as a sixth `DECLARATIONS` row, because
it is a different relation: the five are independent statements that must agree
with each other and are fixed by editing them; the lockfile is a projection of
`package.json` that can never legitimately differ and is fixed by `npm install`.
Listing it would make the guard advise hand-editing a generated file. The check
reads `packages[""]` as JSON and compares the range as written — a regex was
never an option, since the lockfile has 241 entries of which 158 declare
`engines.node` across 51 distinct ranges. Falsified against the real lockfile,
not a synthetic one: the root reset to `>=22.22.2` fails, the root deleted fails
(`41e24ed`'s actual state), and rewriting all 157 dependency floors to
`>=99.0.0` still passes.

That guard proves the five numbers agree; it has no opinion on whether the
number they agree on is right. `scripts/check-jsdom-floor.mjs` covers that,
reading `node_modules/jsdom` and failing unless CONTRIBUTING.md names the
installed major, quotes the declared range verbatim, and `engines.node`
satisfies it — the third being the one that bites, because when jsdom raises
its own floor every other gate stays green while the promised Node stops
working. Range satisfaction uses `semver`, now an explicit devDependency
rather than a hoisted one; hand-rolling a `||`-and-caret evaluator to validate
a semver range is how the validator becomes the bug.

The quote check matches the whole code span, backticks included. Bare
containment looked right and was not: `^24.15.0 || >=26.0.0` is a substring of
`^22.22.2 || ^24.15.0 || >=26.0.0`, so jsdom dropping its oldest supported line
would have passed against the stale sentence. The test caught it, and that
narrowing is the case used to falsify the guard against the real doc.

All 11 acceptance figures reproduce exactly against the real export. They live
in `.local/verify-reference.ts`, which is gitignored and prints aggregates
only; there is no `docs/acceptance.md` and there should not be one.

One spec figure needed refining: the spec cites 200 closed positions
(168 + 32). The real count is **202** — 168 wins, 32 losses and 2 break-even.
`winRate` exposes `breakEven` rather than reshaping the definition to fit.
