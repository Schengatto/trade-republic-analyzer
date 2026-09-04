/**
 * The report fits the phone it is read on.
 *
 * A page that scrolls sideways is not a cosmetic complaint here: the rail is
 * fixed to the viewport while the report scrolls under it, so once the document
 * is wider than the screen the reader drags the whole report out from beneath a
 * rail that stays put, and the numbers on the right of every table are simply
 * off the edge.
 *
 * This asserts the one thing that cannot be checked without layout: that no
 * element forces the document wider than the viewport. jsdom computes no boxes,
 * so a unit test can only check the markup — a CSS track that refuses to shrink
 * is invisible to it and visible here.
 *
 * 375px is the narrowest phone still worth supporting, 460px sits just above
 * where the report was observed to break, and 700px is the breakpoint where the
 * rail stops pushing the report and starts floating over it.
 */
import { expect, test, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const FIXTURE = fileURLToPath(new URL('../tests/fixtures/full-coverage.csv', import.meta.url));
const MULTI_YEAR = fileURLToPath(new URL('../tests/fixtures/multi-year.csv', import.meta.url));

async function load(page: Page, fixture: string): Promise<void> {
  await page.goto('/');
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /csv/i }).click();
  await (await chooser).setFiles(fixture);
  await expect(page.locator('#report')).toBeVisible();
}

/**
 * Widest element that is not confined by a scroller of its own, and everything
 * standing past the viewport edge.
 *
 * Measured, not rounded. `documentElement.scrollWidth` is an integer, so an
 * element standing 0.4px past the edge leaves it exactly equal to `clientWidth`
 * and the document reads clean — and 0.4px is precisely the overflow that
 * shipped a print regression which failed on Linux and passed on Windows. The
 * real edges are floats, so compare them as floats.
 */
async function overflowOf(page: Page) {
  return page.evaluate(() => {
    const limit = document.documentElement.clientWidth;
    // Only elements that actually push the page: an overflowing child of a
    // scroller is confined by it and costs the document nothing.
    const unconfined = [...document.querySelectorAll('#report *')].filter((node) => {
      for (let a = node.parentElement; a; a = a.parentElement) {
        if (getComputedStyle(a).overflowX !== 'visible') return false;
      }
      return true;
    });
    const rightOf = (node: Element): number => node.getBoundingClientRect().right;
    const name = (node: Element): string => `${node.tagName.toLowerCase()}.${node.className}`;
    const widest = unconfined.reduce(
      (max, node) => (rightOf(node) > max.right ? { right: rightOf(node), label: name(node) } : max),
      { right: 0, label: 'nothing' },
    );
    return {
      limit,
      widest,
      // Naming the offender, so a failure is a fix rather than an investigation.
      offenders: unconfined
        .filter((node) => rightOf(node) > limit + 0.05)
        .map(name)
        .slice(0, 5),
    };
  });
}

for (const width of [375, 460, 700]) {
  test(`the report never scrolls sideways at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await load(page, FIXTURE);

    const overflow = await overflowOf(page);
    expect(
      overflow.widest.right,
      `the report reaches past the viewport — widest is ${overflow.widest.label}`,
    ).toBeLessThanOrEqual(overflow.limit + 0.05);
    expect(overflow.offenders, 'elements sticking out past the viewport').toEqual([]);
  });
}

/**
 * The month grid is the one figure that cannot be made to fit 375px: twelve
 * fixed columns, a year column and a totals column, floored at 52rem. It is
 * meant to scroll *inside itself* — so the assertion has two halves, and the
 * first one is what stops the second from passing for the wrong reason. A grid
 * that had quietly stopped overflowing would keep the page honest while having
 * lost the columns, and only the scroller's own measurement can tell those
 * apart.
 *
 * Driven with the three-year fixture: more rows and a wider totals column than
 * the single year the rest of this file loads.
 */
test('the month grid scrolls inside its own box at 375px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await load(page, MULTI_YEAR);

  const grid = await page.locator('#monthly .heatmap-scroll').first().evaluate((node) => ({
    scrollWidth: node.scrollWidth,
    clientWidth: node.clientWidth,
    overflowX: getComputedStyle(node).overflowX,
  }));
  expect(grid.overflowX, 'the grid must be its own scroller').toBe('auto');
  expect(grid.scrollWidth, 'the grid no longer overflows — has it lost its columns?').toBeGreaterThan(
    grid.clientWidth,
  );

  // And the page it sits on stays put.
  const page375 = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(page375.scrollWidth, 'the grid dragged the document sideways').toBe(page375.clientWidth);
});

/**
 * The same 375px page, read in German.
 *
 * The tests above run in whatever language the browser asks for, which is one
 * language. German is the one that can break this: it compounds where the
 * others use a preposition — `Netto eingezahltes Kapital`, `Haltedauer nach
 * Anlageklasse` — and a word that cannot be broken sets a floor no CSS track
 * can shrink below. One language rather than all seven, because this is a
 * property of the longest word, and German holds it.
 */
test('the report still fits 375px when the words are German', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.addInitScript(() => window.localStorage.setItem('tra.language', 'de'));
  await load(page, FIXTURE);

  await expect(page.locator('#language-select')).toHaveValue('de');
  const overflow = await overflowOf(page);
  expect(
    overflow.widest.right,
    `the German report reaches past the viewport — widest is ${overflow.widest.label}`,
  ).toBeLessThanOrEqual(overflow.limit + 0.05);
  expect(overflow.offenders, 'German elements sticking out past the viewport').toEqual([]);
});
