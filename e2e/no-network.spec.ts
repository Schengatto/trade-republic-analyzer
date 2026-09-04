/**
 * The privacy claim, checked by a machine.
 *
 * The landing screen tells the reader to open their Network tab and see for
 * themselves that nothing leaves the browser. This test is that same check,
 * run on every push: load the built page, feed it a CSV, work through the
 * report, and assert the browser asked for nothing beyond the three files the
 * page is made of.
 *
 * It counts failed requests too — `request` fires on the attempt — so a CDN
 * that merely happens to be unreachable from CI cannot pass as innocent.
 *
 * Two things it cannot see, both measured rather than assumed: a call on a
 * timer longer than the quiet windows below, and a `sendBeacon` fired from
 * `pagehide` — Chromium reports the latter to neither `request` nor `route`, so
 * asserting on it here would be a check that always passes. Those are covered
 * from the other side: `npm run check:bundle` fails the build on an absolute
 * URL existing in the bundle at all, and the source guards in
 * `tests/ui/guards.test.ts` forbid `sendBeacon` in `src/ui` outright.
 */

import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const FIXTURE = fileURLToPath(new URL('../tests/fixtures/full-coverage.csv', import.meta.url));

/** The document, its stylesheet, its script. Nothing else is ever expected. */
const OWN_ASSETS = ['/', '/assets/index.css', '/assets/index.js'];

/**
 * How long to sit still before believing a phase made no request.
 *
 * Asserting an absence means there is no event to await, so this is a real
 * wait rather than a missing condition. It is generous on purpose: a tracker
 * deferred behind a short timer is exactly the kind that would slip past.
 */
const QUIET_MS = 2000;

test('the built app requests nothing beyond its own three local assets', async ({ page }) => {
  const requested: string[] = [];
  // The context, not the page: a request issued by a service worker or by a
  // second window would still be recorded here.
  page.context().on('request', (request) => requested.push(request.url()));

  await page.goto('/');
  await expect(page.getByTestId('dropzone')).toBeVisible();
  await page.waitForTimeout(QUIET_MS);
  expect(observed(requested), 'on the landing screen').toEqual(OWN_ASSETS);

  // Parsing is where a smuggled call would most plausibly sit: it is the only
  // moment the app holds anything worth sending anywhere.
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /csv/i }).click();
  await (await chooser).setFiles(FIXTURE);

  await expect(page.locator('#report')).toBeVisible();
  await page.waitForTimeout(QUIET_MS);
  expect(observed(requested), 'with the report on screen').toEqual(OWN_ASSETS);

  // The two controls that rebuild the whole report. A web font pulled in by a
  // theme, or a translation fetched on language change, would show up here.
  await page.locator('#language-select').selectOption('en');
  await page.getByRole('button', { name: /dark|light/i }).click();
  await expect(page.locator('#report')).toBeVisible();
  await page.waitForTimeout(QUIET_MS);
  expect(observed(requested), 'after switching language and theme').toEqual(OWN_ASSETS);
});

/**
 * Requested URLs, sorted, as same-origin paths with the build hash removed.
 *
 * A foreign URL is deliberately left whole, so a failure names the host that
 * was contacted rather than showing a bare path.
 */
function observed(urls: string[]): string[] {
  const origin = new URL(String(test.info().project.use.baseURL)).origin;
  return urls
    .map((url) => {
      const parsed = new URL(url);
      if (parsed.origin !== origin) return url;
      return parsed.pathname.replace(/-[\w-]{6,}(\.[a-z]+)$/, '$1');
    })
    .sort();
}
