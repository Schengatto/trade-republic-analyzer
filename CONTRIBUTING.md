# Contributing

Thanks for taking a look. Issues and pull requests are welcome.

## The one rule that is not negotiable

**No real data enters this repository.** Not a CSV, not a screenshot of one, not
a stack trace with a row in it, not a "sanitised" export with the names changed.
A Trade Republic export identifies its account holder, their IBAN and every
counterparty they traded with, and git makes a deletion largely cosmetic.

`.gitignore` refuses `*.csv` outright, with a single exception for
`tests/fixtures/*.csv` — those are synthetic, hand-written, and small enough to
read. Keep it that way: if you need a new case, write the rows by hand.

If you are debugging against your own export, keep it and any scratch script
outside the repository, or under `.local/`, which is ignored.

The same rule applies to the code. No error message, log line or UI string may
carry the content of a row: a malformed line is reported by its **line number**
only. See `errorMessage` in
[`src/ui/views/dropzone.ts`](src/ui/views/dropzone.ts) for the shape this takes.

## Getting started

Node 24.15.0 or newer, as declared in `engines.node`. The built page needs no
Node at all; the floor is jsdom 30, whose own `engines` are
`^22.22.2 || ^24.15.0 || >=26.0.0`. Below it, undici — which jsdom pulls in —
reaches for `worker_threads.markAsUncloneable` at load and every jsdom-backed
test throws while the run still reports its tests as passed. Both workflows pin
that exact version, so the floor is the version actually exercised.

That sentence is checked, not trusted:
[`scripts/check-jsdom-floor.mjs`](scripts/check-jsdom-floor.mjs) reads
`node_modules/jsdom` and fails if the major named above is not the one
installed, if the range quoted above is not the one declared, or if the floor
does not satisfy it. The last is the one that bites: when jsdom raises its own
floor, every other check here stays green while the version we promise stops
working.

That number appears in five files, and nothing but
[`scripts/check-node-version.mjs`](scripts/check-node-version.mjs) links them:
`engines.node`, the `setup-node` pin in `ci.yml` and `pages.yml`, and the
sentence above and its twin in the README. Change one, change all five — `npm
test` fails until they agree, and fails too if a pin is loosened to a major line
(`node-version: 24`), because then the version exercised is no longer the
version promised here.

`package-lock.json` holds a sixth copy, in `packages[""].engines`, and the same
script checks it — separately, because it is not a declaration to edit but npm's
own copy of `engines`, repaired by running `npm install`. It is checked because
nothing else does: `npm ci` compares the root entry's name, version and
dependencies against `package.json` and ignores its `engines`, so a lockfile
left behind installs cleanly and says nothing. That is exactly what happened at
`473549c`. The check reads the root entry as JSON rather than matching a
pattern, since 157 of this lockfile's dependencies declare a floor of their own.

```bash
npm install
npm run dev        # http://localhost:5173
```

Load `tests/fixtures/full-coverage.csv` to see a populated report without
touching your own data.

## Checks

Run these before opening a pull request. CI runs the same ones, in this order.

```bash
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm test           # vitest
npm run build      # type-checks, bundles, then scans the bundle
npm run test:e2e   # playwright, against the build in dist/
```

The last two are the privacy claim, automated. `npm run build` ends in
[`scripts/check-bundle.mjs`](scripts/check-bundle.mjs), which fails on any
absolute `http(s)://` URL in `dist/` that is not on its allowlist — a
dependency cannot introduce a CDN call without one.
[`e2e/no-network.spec.ts`](e2e/no-network.spec.ts) then serves that build,
loads the fixture CSV, works through the report, and fails if the browser
requested anything beyond the page's own three files.

New or changed behaviour needs a test. If you are fixing a bug, the pull
request should contain a test that fails before your change.

## How the code is arranged

```
src/core/   the calculation: CSV parsing, classification, FIFO, reconciliation,
            analytics. No DOM, no browser API.
src/ui/     rendering only. Calls src/core/ and formats what comes back.
tests/      mirrors the two, plus tests/ui/guards.test.ts.
```

The split is enforced, not just intended.
[`tests/ui/guards.test.ts`](tests/ui/guards.test.ts) sweeps every file under
`src/ui/` and fails the build on:

- **Arithmetic.** No `decimal.js` operation and no `new Decimal(...)` in a view.
  Every figure in the report is computed in `src/core/` and covered by its
  tests; a second, untested path in a view is how two numbers on one page start
  disagreeing. (Plain `Math.abs` on a plotted *coordinate* is layout, and is
  allowed.)
- **Network.** No `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`,
  `sendBeacon` or `importScripts`. The page must make no request after it has
  loaded — that is the privacy claim, and it is verifiable from the Network tab.
- **Markup from strings.** No `innerHTML`, `outerHTML`, `insertAdjacentHTML` or
  `document.write`. Nodes are built through `el()`, which sets `textContent`, so
  a security's name is text and never markup.
- **Storage.** Only `src/ui/preferences.ts` may name a storage API.
- **Colour literals.** Only `src/ui/chart/palette.ts` may name a hex colour;
  everything else uses a custom property, so the theme switch reaches it.

If a change genuinely needs one of those, the guard is the conversation — say
why in the pull request rather than working around it.

## Charts

Charts are hand-written inline SVG. There is no chart library, and adding one
would mean a dependency that can fetch at runtime, plus raster output where the
PDF wants vectors.

Three rules come from the report's job rather than from taste:

- **Never a second value axis.** Two scales on one plot make the crossings
  arbitrary and invent a correlation the data does not contain. Two measures →
  two charts.
- **Every chart carries an equivalent table.** `FigureSpec.table` is required by
  the type checker, so this cannot be forgotten. Colour is never the only
  encoding.
- **Colours are validated, not chosen by eye.** The palette is a
  colourblind-safe blue↔red diverging pair with a grey midpoint, checked with
  the `dataviz` validator rather than judged. Dark mode has its own steps
  validated against the dark surface — it is not an inversion of the light ones.

## Translations

One catalogue per language in [`src/ui/messages/`](src/ui/messages/), with
[`i18n.ts`](src/ui/i18n.ts) left as the machinery. Italian is the source:
`Messages` is `Record<keyof typeof it, string>`, so a key added there and
forgotten anywhere else does not compile. Tests add what the type cannot see —
no empty strings, the same `{placeholders}` in every language, the keys written
in the source order so a reviewer can read two files side by side, and no
byte-order mark.

**Italian and English are written and reviewed. German, Spanish, French, Dutch
and Portuguese are machine-assisted and have not been reviewed by a native
speaker.** The legal and methodological wording — `limits.*`, `footer.*`,
`print.legal`, `reconciliation.*` — was checked by hand against the Italian, but
the rest has not been. Corrections are welcome and are the easiest useful pull
request this project has: one string, one file, no build knowledge needed.

Adding a language means a file in `src/ui/messages/`, an entry in `LANGUAGES`
and `LANGUAGE_NAMES` (ordered by endonym, which is what the picker shows), and a
locale in `LOCALES` in [`format.ts`](src/ui/format.ts). The locale must be a
euro-area one, so `Intl` treats the euro as local rather than foreign — `pt-PT`,
not `pt-BR`.

Operation types from the export (`INTEREST_PAYMENT`, and so on) are lower-cased
for display but never translated: a reader may have to quote one in a bug
report.

## Commits

Conventional commits, written in English:

```
feat: add holding-duration breakdown by asset class
fix: keep the last x-axis label when ticks are dropped
docs: explain how to verify the privacy claim
```

## Code of conduct

By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).
