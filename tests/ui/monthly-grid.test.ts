// @vitest-environment jsdom

/**
 * The month grid read across several years, which is the only shape that puts
 * its two margins under real strain.
 *
 * The one-year account the rest of the suite renders can never show either of
 * the things that go wrong here: a column total is the same figure as the month
 * above it, and every calendar slot is filled. So two fixtures, and they cannot
 * be one file. `monthlyAggregates` emits a continuous range, so a span long
 * enough for a January to meet another January — thirteen months — already
 * reaches all twelve calendar slots. Summing across years and leaving a slot
 * empty are therefore mutually exclusive:
 *
 * - `multi-year.csv` runs 2024-01 to 2026-04 with whole seasons of no activity
 *   in between, and holds three Januaries and two Februaries.
 * - `turn-of-year.csv` runs 2024-11 to 2025-03, so April to October are months
 *   no year in the file reaches — and December and February are inside the
 *   period and earned nothing, which is a different thing and must read as one.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { monthlyAggregates } from '../../src/core/analytics';
import { parseOperations } from '../../src/core/csv';
import { calculate } from '../../src/core/fifo';
import { Decimal } from '../../src/core/money';
import { reconcile } from '../../src/core/reconcile';
import { formatCompactCurrency, formatMonth, formatSignedCurrency } from '../../src/ui/format';
import { translatorFor } from '../../src/ui/i18n';
import type { ReportContext } from '../../src/ui/views/common';
import { monthlySection } from '../../src/ui/views/monthly';

/**
 * Off `process.cwd()`, the way every other jsdom test here reads a file:
 * `import.meta.url` is not a `file:` URL under this environment, so the
 * `new URL('…', import.meta.url)` the node-side tests use throws here.
 */
const fixture = (name: string): string =>
  readFileSync(join(process.cwd(), 'tests', 'fixtures', name), 'utf8');

const FIXTURES = {
  multiYear: fixture('multi-year.csv'),
  turnOfYear: fixture('turn-of-year.csv'),
};

function accountFrom(fixture: keyof typeof FIXTURES): ReportContext {
  const operations = parseOperations(FIXTURES[fixture]);
  const report = calculate(operations);
  return {
    operations,
    report,
    reconciliation: reconcile(operations, report),
    language: 'en',
    t: translatorFor('en'),
  };
}

const gridOf = (fixture: keyof typeof FIXTURES): HTMLElement => monthlySection(accountFrom(fixture));

/** The twelve month cells of the totals row, then the corner. */
const footer = (node: HTMLElement): Element[] => [...node.querySelectorAll('tfoot td')];

const compact = (value: number): string => formatCompactCurrency('en', new Decimal(value));
const exact = (value: number): string => formatSignedCurrency('en', new Decimal(value));

/** `Jan, all years` — the name a column total is given so it cannot pass for a month. */
const columnName = (month: string): string =>
  `${formatMonth('en', `2001-${month}`).replace('2001', '').trim()}, all years`;

/** The month-by-month figure is the only one in the section with a back button over it. */
const tableRows = (node: HTMLElement): (string | null)[][] => {
  const figure = node.querySelector('.figure__back')!.closest('figure.figure')!;
  return [...figure.querySelectorAll('table.data-table tbody tr')].map((tr) =>
    [...tr.querySelectorAll('td, th')].map((cell) => cell.textContent),
  );
};

describe('the month grid across several years', () => {
  it('draws one row per year, in the order the years arrived', () => {
    const years = [...gridOf('multiYear').querySelectorAll('tbody .heatmap__year')];
    expect(years.map((cell) => cell.textContent)).toEqual(['2024', '2025', '2026']);
  });

  // The point of the footer. Every one of these figures is a sum no single year
  // could produce: +80 needs all three Januaries, −15 needs a February from
  // either end of the file with an empty one in between.
  it('adds each calendar month across every year that holds it', () => {
    const cells = footer(gridOf('multiYear'));
    expect(cells).toHaveLength(13);
    // January: +30 in 2024, +60 in 2025, −10 in 2026.
    expect(cells[0]!.textContent).toBe(compact(80));
    // February: −20 in 2024, nothing at all in 2025, +5 in 2026.
    expect(cells[1]!.textContent).toBe(compact(-15));
    // July and April are each reached by one year only, and still get a total.
    expect(cells[6]!.textContent).toBe(compact(12));
    expect(cells[3]!.textContent).toBe(compact(-5));
  });

  // Checked against a sum this test does itself, so the grid is being compared
  // with the months rather than with the same fold that drew it.
  it('closes every column with the sum of the months standing above it', () => {
    const context = accountFrom('multiYear');
    const months = monthlyAggregates(context.operations, context.report);
    const summed = Array.from({ length: 12 }, (_, index) =>
      months
        .filter((month) => Number(month.month.slice(5, 7)) === index + 1)
        .reduce((total, month) => total.plus(month.profit), new Decimal(0)),
    );

    const cells = footer(monthlySection(context)).slice(0, 12);
    expect(cells.map((cell) => cell.textContent)).toEqual(
      summed.map((value) => formatCompactCurrency('en', value)),
    );
  });

  it('keeps each year total to its own year, and the corner to the whole file', () => {
    const node = gridOf('multiYear');
    const rowTotals = [...node.querySelectorAll('tbody .heatmap__total')];
    expect(rowTotals.map((cell) => cell.textContent)).toEqual([
      compact(10),
      compact(72),
      compact(-10),
    ]);
    expect(node.querySelector('.heatmap__total--grand')!.textContent).toBe(compact(72));
  });

  // The cells abbreviate, so the cross-year totals have to survive exactly
  // somewhere a reader without a pointer can reach: the table under the figure,
  // which is also the printed page.
  it('repeats the cross-year totals in the table, exact and named', () => {
    const rows = tableRows(gridOf('multiYear'));
    expect(rows).toContainEqual([columnName('01'), exact(80)]);
    expect(rows).toContainEqual([columnName('02'), exact(-15)]);
    expect(rows).toContainEqual(['2025', exact(72)]);
    expect(rows.at(-1)).toEqual(['Total', exact(72)]);
  });

  // A season with no operations is still a month the account lived through, so
  // it reads as a zero and stays clickable. This is the case that is *not* an
  // empty cell, and the reason the two have to be told apart.
  it('prints a zero for a month inside the period that earned nothing', () => {
    const cell = gridOf('multiYear').querySelector<HTMLElement>(
      '.heatmap__cell[data-month="2025-04"]',
    )!;
    expect(cell.textContent).toBe(compact(0));
    expect(cell.getAttribute('aria-label')).toBe(`${formatMonth('en', '2025-04')}: ${exact(0)}`);
  });
});

describe('the month grid when a calendar month is outside the period', () => {
  it('leaves a month no year reaches empty, while a month that earned nothing prints zero', () => {
    const cells = footer(gridOf('turnOfYear'));

    // April to October: the file runs November to March, so no year reaches
    // them. A zero here would claim seven months that broke even.
    expect(cells.slice(3, 10).map((cell) => cell.textContent)).toEqual(['', '', '', '', '', '', '']);
    for (const cell of cells.slice(3, 10)) {
      expect(cell.querySelector('.heatmap__value')).toBeNull();
    }

    // December 2024 and February 2025 are inside the period and earned nothing.
    expect(cells[11]!.textContent).toBe(compact(0));
    expect(cells[1]!.textContent).toBe(compact(0));
    // And the months that did earn something still total.
    expect(cells[10]!.textContent).toBe(compact(40));
    expect(cells[0]!.textContent).toBe(compact(-30));
    expect(cells[12]!.textContent).toBe(compact(16));
  });

  it('gives the table no row for a calendar month the file never reaches', () => {
    const rows = tableRows(gridOf('turnOfYear'));
    const named = rows.map(([name]) => name);
    expect(named).toContain(columnName('12'));
    expect(named).not.toContain(columnName('04'));
  });
});

/**
 * The count axis of "Trade rows per month", as the section actually builds it.
 *
 * The floor that keeps it whole is opt-in, so the thing worth guarding is not
 * that `niceTicks` can hold a step — `bars.test.ts` has that — but that this
 * chart still asks it to. Dropping `wholeTicks` from the call reddens this and
 * nothing else.
 */
describe('the trade-rows axis', () => {
  const countTicks = (fixture: keyof typeof FIXTURES): string[] => {
    const figures = [...gridOf(fixture).querySelectorAll('figure.figure')];
    // The one chart in the section that measures a count rather than money.
    const chart = figures.at(-1)!.querySelector('svg.chart')!;
    return [...chart.querySelectorAll('text.chart__tick')]
      .filter((node) => node.getAttribute('text-anchor') === 'end')
      .map((node) => node.textContent ?? '');
  };

  it('never gives two gridlines the same count', () => {
    // turn-of-year peaks at two rows in a month, which is exactly the range
    // where the 1-2-5 step lands on a half.
    const ticks = countTicks('turnOfYear');
    expect(ticks.length).toBeGreaterThan(1);
    expect(new Set(ticks).size, `duplicated: ${ticks.join(', ')}`).toBe(ticks.length);
  });

  it('counts in whole rows, never in halves', () => {
    for (const tick of countTicks('multiYear')) {
      expect(tick, `fractional tick: ${tick}`).not.toContain('.');
    }
  });
});
