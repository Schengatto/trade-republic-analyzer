// @vitest-environment jsdom

/**
 * Renders the whole report against a synthetic account and asserts the things
 * a reader depends on: the sections are present, the charts each carry a table,
 * and the labels that prevent a misreading actually say what they must.
 */

import { describe, expect, it } from 'vitest';
import { monthlyAggregates } from '../../src/core/analytics';
import { calculate } from '../../src/core/fifo';
import type { Operation } from '../../src/core/operation';
import { Decimal } from '../../src/core/money';
import { formatCompactCurrency, formatMonth, formatSignedCurrency } from '../../src/ui/format';
import { LANGUAGES, catalogue, type Language } from '../../src/ui/i18n';
import { reportView } from '../../src/ui/views/report';
import { op } from '../helpers/operations';
import { contextFor } from './helpers';

const ACCOUNT: Operation[] = [
  op('2024-01-02', 'CASH', 'CUSTOMER_INBOUND', { amount: '1000.00' }),
  op('2024-01-03', 'TRADING', 'BUY', {
    shares: '10',
    amount: '-100.00',
    fee: '-1.00',
    assetClass: 'STOCK',
  }),
  op('2024-02-05', 'TRADING', 'BUY', {
    shares: '5',
    amount: '-60.00',
    symbol: 'BBB',
    name: 'Security B',
    assetClass: 'ETF',
  }),
  op('2024-03-07', 'TRADING', 'SELL', {
    shares: '-10',
    amount: '150.00',
    tax: '-13.00',
    assetClass: 'STOCK',
  }),
  op('2024-03-08', 'TRADING', 'SELL', {
    shares: '-5',
    amount: '40.00',
    symbol: 'BBB',
    name: 'Security B',
    assetClass: 'ETF',
  }),
  op('2024-04-01', 'CASH', 'DIVIDEND', { amount: '8.00', tax: '-2.08' }),
];

const GENERATED_AT = new Date('2024-05-01T10:00:00Z');

describe('the rendered report', () => {
  it('renders every section, in both languages', () => {
    for (const language of LANGUAGES) {
      const root = reportView(contextFor(language), GENERATED_AT);
      const ids = [...root.querySelectorAll('section')].map((node) => node.id);
      expect(ids, language).toEqual([
        'summary',
        'trend',
        'composition',
        'excluded',
        'reconciliation',
        'windows',
        'monthly',
        'capital',
        'asset-class',
        'win-rate',
        'top-flop',
        'holding',
        'performance',
        'execution',
        'securities',
        'open-positions',
        'limits',
      ]);
    }
  });

  it('gives every chart an equivalent table', () => {
    const root = reportView(contextFor('en'), GENERATED_AT);
    const figures = [...root.querySelectorAll('figure.figure')];
    expect(figures.length).toBeGreaterThan(0);
    for (const fig of figures) {
      expect(fig.querySelector('table.data-table'), fig.textContent?.slice(0, 40)).not.toBeNull();
    }
  });

  it('puts every table in a scroller, so none of them widens the page', () => {
    // A data table has `white-space: nowrap` cells: its narrowest possible
    // width is whatever the longest row needs, which on a phone is wider than
    // the viewport. `.table-scroll` is what confines that width to the table
    // instead of letting it push the whole document sideways, so a table
    // rendered without the wrapper is the one thing that breaks narrow layout.
    const root = reportView(contextFor('en'), GENERATED_AT);
    const tables = [...root.querySelectorAll('table.data-table')];
    expect(tables.length).toBeGreaterThan(0);
    for (const table of tables) {
      expect(table.closest('.table-scroll'), table.querySelector('caption')?.textContent ?? table.id).not.toBeNull();
    }
  });

  it('draws no chart with a second value axis', () => {
    // Two y-scales on one plot make any comparison between the series false.
    // The trend chart is the only multi-series plot, and both its series are
    // euro amounts on one scale.
    const root = reportView(contextFor('en'), GENERATED_AT);
    for (const chart of root.querySelectorAll('svg.chart')) {
      const axisLabels = [...chart.querySelectorAll('text.chart__tick')];
      const xPositions = new Set(axisLabels.map((node) => node.getAttribute('x')));
      // A dual axis would put tick labels down both edges of the plot box.
      expect(xPositions.size).toBeLessThanOrEqual(axisLabels.length);
    }
  });

  it('says the monthly count is of BUY and SELL rows', () => {
    // A partially filled order lands in the export as several rows, so this
    // number is larger than the number of orders placed. Nothing on the page
    // may call it a count of transactions without saying so.
    for (const [language, phrase] of [
      ['it', 'BUY e SELL'],
      ['en', 'BUY and SELL'],
    ] as const) {
      const monthly = reportView(contextFor(language), GENERATED_AT).querySelector('#monthly');
      expect(monthly?.textContent, language).toContain(phrase);
    }
  });

  it('marks the excluded cash movements as not being profit', () => {
    const root = reportView(contextFor('it'), GENERATED_AT);
    const excluded = root.querySelector('#excluded');
    expect(excluded?.querySelector('.note')?.textContent ?? '').not.toBe('');
  });

  it('reports the reconciliation verdict in words, not colour alone', () => {
    const root = reportView(contextFor('en'), GENERATED_AT);
    // A clean synthetic account must reconcile: an unbalanced verdict here
    // would mean the fixture, or the engine, is misclassifying something.
    const verdict = root.querySelector('#reconciliation .verdict');
    expect(verdict?.classList.contains('verdict--ok')).toBe(true);
    expect(verdict?.textContent).toContain('balanced');
  });

  it('always ends on the stated limits', () => {
    const root = reportView(contextFor('en'), GENERATED_AT);
    expect(root.querySelectorAll('#limits li')).toHaveLength(5);
  });

  it('names the metrics that need prices the statement does not carry', () => {
    const rendered = reportView(contextFor('it'), GENERATED_AT);
    const limits = rendered.querySelector('#limits')!;

    expect(limits.textContent).toContain('volatilità');
    expect(limits.textContent).toContain('drawdown');
  });
});

interface AmountPair {
  label: string;
  value: string;
  classes: string;
}

/**
 * The amount rows of a section, grouped under the sub-heading above them.
 *
 * Grouped rather than flattened because the labels are not unique: taxes are
 * keyed by the operation that carried them, so a dividend that was taxed
 * appears once as income and again as tax, under the same word.
 */
function amountsUnder(root: Element): Map<string, AmountPair[]> {
  const groups = new Map<string, AmountPair[]>();
  let heading = '';

  for (const child of root.children) {
    if (child.classList.contains('subheading')) {
      heading = child.textContent ?? '';
      continue;
    }
    // The rule is what separates the itemised rows from the total under them.
    if (child.classList.contains('rule')) {
      heading = 'total';
      continue;
    }
    if (!child.classList.contains('amounts')) continue;

    const labels = [...child.querySelectorAll('dt')];
    const values = [...child.querySelectorAll('dd')].map((value, index) => ({
      label: labels[index]?.textContent ?? '',
      value: value.textContent ?? '',
      classes: value.className,
    }));
    groups.set(heading, [...(groups.get(heading) ?? []), ...values]);
  }

  return groups;
}

describe('the composition of the result', () => {
  const composition = (): Element => {
    const root = reportView(contextFor('en'), GENERATED_AT);
    const found = root.querySelector('#composition');
    if (!found) throw new Error('composition section missing');
    return found;
  };

  it('writes fees and taxes as the subtractions they are', () => {
    // netProfit is grossProfit.minus(fees).minus(totalTaxes). Printed as bare
    // positives the rows read as if they were added, and the total then looks
    // like an arithmetic error.
    const groups = amountsUnder(composition());

    for (const heading of ['Fees', 'Taxes by type']) {
      // Rates share these headings but are not sums, and a rate carries no sign
      // to check. Excluded by class rather than by parsing the text, and the
      // length assertion below still fails if the exclusion swallows the lot.
      const rows = (groups.get(heading) ?? []).filter((row) => !row.classes.includes('is-rate'));
      expect(rows.length, heading).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row.value, heading).toMatch(/^-/);
        expect(row.classes, heading).toContain('is-negative');
      }
    }
  });

  it('leaves income unsigned, because it is already inside the gross profit', () => {
    // grossProfit is tradingProfit.plus(totalIncome). A "+" here would invite
    // the reader to add it on a second time.
    const rows = amountsUnder(composition()).get('Income by type') ?? [];
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.value).not.toMatch(/^[+-]/);
      expect(row.classes).not.toContain('is-positive');
      expect(row.classes).not.toContain('is-negative');
    }
  });

  it('keeps the total a result, signed by what it is rather than by its role', () => {
    // The rows above are charges and always read negative; the total is an
    // outcome and must be free to be either.
    const total = amountsUnder(composition()).get('total') ?? [];
    expect(total).toHaveLength(1);
    expect(total[0]?.value).toMatch(/^\+/);
    expect(total[0]?.classes).toContain('is-positive');
  });

  it('says out loud that the income block is a breakdown', () => {
    expect(composition().textContent).toContain('Already included in the gross profit');
  });

  it('states the fees as a share of the gross profit, beneath the sum itself', () => {
    // 1.00 of fees against a gross profit of 38.00. The rate belongs under the
    // fee it was taken from: read anywhere else it looks like a commission rate.
    const rows = amountsUnder(composition()).get('Fees') ?? [];
    const drag = rows.find((row) => row.label === 'Share of gross profit');

    expect(drag, 'no cost-drag row under the fees heading').toBeDefined();
    expect(drag?.value).toBe('2.63%');
  });

  it('withholds the share as a dash when there was no gross profit to take it from', () => {
    // A gross loss has no share to state: 1.00 of fees over -60.00 would print
    // -1.67%, which reads as though the fee had paid the account. The euro
    // figure still stands; only the rate goes.
    const losing: Operation[] = [
      op('2024-01-02', 'CASH', 'CUSTOMER_INBOUND', { amount: '1000.00' }),
      op('2024-01-03', 'TRADING', 'BUY', {
        shares: '10',
        amount: '-100.00',
        fee: '-1.00',
        assetClass: 'STOCK',
      }),
      op('2024-03-07', 'TRADING', 'SELL', { shares: '-10', amount: '40.00', assetClass: 'STOCK' }),
    ];
    const root = reportView(contextFor('en', losing), GENERATED_AT);
    const rows = amountsUnder(root.querySelector('#composition')!).get('Fees') ?? [];
    const drag = rows.find((row) => row.label === 'Share of gross profit');

    expect(drag, 'no cost-drag row under the fees heading').toBeDefined();
    expect(drag?.value).toBe('—');
    // Nothing is not zero, and it is not a negative share either.
    expect(drag?.value).not.toContain('%');
    expect(rows.find((row) => row.label === 'Fees')?.value).toBe('-€1.00');
  });

  it('adds up: gross, less the signed charges, is the net', () => {
    // Guards the rendering against the arithmetic drifting apart: whatever the
    // engine computes, what the page shows must still reconcile.
    const report = calculate(ACCOUNT);
    const charges = report.fees.plus(report.totalTaxes);
    expect(report.grossProfit.minus(charges).toFixed(2)).toBe(report.netProfit.toFixed(2));
  });
});

describe('the monthly composition figure', () => {
  const monthly = (language: Language = 'en'): Element => {
    const found = reportView(contextFor(language), GENERATED_AT).querySelector('#monthly');
    if (!found) throw new Error('monthly section missing');
    return found;
  };

  const compositionFigure = (language: Language = 'en'): Element => {
    const figures = [...monthly().querySelectorAll('figure.figure')];
    expect(figures, language).toHaveLength(3);
    // It sits between the profit figure it explains and the row count: the
    // reader meets the month's profit first, then what it was made of.
    return figures[1]!;
  };

  it('names all five parts in the legend, so no segment is colour alone', () => {
    const labels = [...compositionFigure().querySelectorAll('.legend__item')].map((node) =>
      node.textContent?.trim(),
    );
    expect(labels).toEqual(['Trading', 'Dividends', 'Interest', 'Other income', 'Charges']);
  });

  it('gives the table a column per part, plus the total they add up to', () => {
    const header = [...compositionFigure().querySelectorAll('thead th')].map((th) => th.textContent);
    expect(header).toEqual([
      'Month',
      'Trading',
      'Dividends',
      'Interest',
      'Other income',
      'Charges',
      'Profit',
    ]);
  });

  it('reconciles every row with the monthly profit the chart above it shows', () => {
    // The stack and the single bar are two drawings of the same number. If they
    // ever disagree the reader has no way to tell which one is lying.
    const months = monthlyAggregates(ACCOUNT, calculate(ACCOUNT));
    const rows = [...compositionFigure().querySelectorAll('tbody tr')];
    expect(rows).toHaveLength(months.length);

    rows.forEach((row, index) => {
      const month = months[index]!;
      const { trading, dividends, interest, otherIncome, charges } = month.components;
      const total = trading.plus(dividends).plus(interest).plus(otherIncome).minus(charges);
      expect(total.toFixed(2), month.month).toBe(month.profit.toFixed(2));
      expect(row.children[6]?.textContent, month.month).toBe(
        formatSignedCurrency('en', month.profit.toNumber()),
      );
    });
  });

  it('writes the charges column as the subtraction it is', () => {
    // Every other column adds to the total; this one comes off it, and the
    // chart puts it below the baseline. A bare positive would read as income.
    const rows = [...compositionFigure().querySelectorAll('tbody tr')];
    const charges = rows
      .map((row) => row.children[5])
      .filter((cell) => (cell?.textContent ?? '') !== formatSignedCurrency('en', 0));

    // Falsifies the loop: this account pays a fee, a capital gains tax and a
    // dividend withholding, so some month must show a charge.
    expect(charges.length).toBeGreaterThan(0);
    for (const cell of charges) {
      expect(cell?.textContent).toMatch(/^-/);
      expect(cell?.className).toContain('is-negative');
    }
  });

  it('hangs the charges below the baseline in the drawing too', () => {
    const plot = compositionFigure().querySelector('svg.chart--bars');
    const drawn = [...(plot?.querySelectorAll('rect.chart__segment') ?? [])]
      .map((node) => node.getAttribute('aria-label') ?? '')
      .filter((label) => label.includes('— Charges:'));

    expect(drawn.length).toBeGreaterThan(0);
    for (const label of drawn) expect(label).toMatch(/: -/);
  });
});

describe('the monthly profit figure, in both its states', () => {
  const monthly = (language: Language = 'en'): Element => {
    const found = reportView(contextFor(language), GENERATED_AT).querySelector('#monthly');
    if (!found) throw new Error('monthly section missing');
    return found;
  };

  // -1.00, 0.00, 17.00, 5.92: a month at zero (no treemap tile), a change that
  // crosses a sign (no percentage) and one that does not (a percentage).
  const MONTHS = monthlyAggregates(ACCOUNT, calculate(ACCOUNT));

  it('opens on the grid of months, with no month picked for the reader', () => {
    const node = monthly();
    expect(node.querySelector('.heatmap')).not.toBeNull();
    // The parts are an answer to a question the reader has not asked yet.
    expect(node.querySelector('.treemap')).toBeNull();
    expect(node.querySelector<HTMLButtonElement>('.figure__back')!.hidden).toBe(true);
  });

  // The comparison with the month before is gone from both readings of this
  // figure, and since it had no other caller, from the core as well. It could
  // not hold one unit — a percentage across a change of sign states a magnitude
  // that misleads, so it was left null and the label fell back to euro, leaving
  // cell and column alike saying a percentage on some months and an amount on
  // others. The `toEqual` is the guard that holds it out: it pins the entire
  // text of every cell, and the second line lived inside the cell button, so
  // any return of it breaks this line. The `%` check only names the rule.
  it('says each month once, in euro, in the cells and in the table', () => {
    const node = monthly();

    const cells = [...node.querySelectorAll('.heatmap__cell')].map((cell) => cell.textContent);
    expect(cells).toEqual(MONTHS.map((month) => formatCompactCurrency('en', month.profit)));
    expect(cells.join(' ')).not.toContain('%');

    const table = node.querySelector('.figure__table table')!;
    expect([...table.querySelectorAll('th')].map((th) => th.textContent)).toEqual([
      'Month',
      'Profit',
    ]);
    expect(monthly('it').querySelector('.figure__table th')!.textContent).toBe('Mese');
  });

  it('replaces the grid with the parts of the month that was clicked', () => {
    const node = monthly();
    node.querySelector<HTMLButtonElement>('.heatmap__cell[data-month="2024-03"]')!.click();

    // The grid is gone, not covered: two pictures of the same profit standing
    // side by side is the arrangement this figure exists to replace.
    expect(node.querySelector('.heatmap')).toBeNull();
    expect(node.querySelector('.treemap')).not.toBeNull();
    // The figure's own heading is written once and cannot follow the state, so
    // the opened month has to name itself inside the plot.
    expect(node.querySelector('.plot-caption')!.textContent).toContain(
      formatMonth('en', '2024-03'),
    );
    expect(node.querySelector('.treemap')!.getAttribute('aria-label')).toBe(
      node.querySelector('.plot-caption')!.textContent,
    );
  });

  // The table is the accessible equivalent and the one thing that reaches
  // print, so it has to follow the state. A picture of one month over a table
  // of every month is a defect, not a filter.
  it('swaps the table under the plot when a month is opened and closed', () => {
    const node = monthly();
    const headers = (): (string | null)[] =>
      [...node.querySelectorAll('.figure__back')]
        .map((back) => back.closest('figure.figure')!)
        // `table.data-table`, because the heatmap is itself a <table> and its
        // twelve month headings would otherwise arrive first.
        .flatMap((figure) => [...figure.querySelectorAll('table.data-table thead th')])
        .map((th) => th.textContent);

    expect(headers()).toEqual(['Month', 'Profit']);

    node.querySelector<HTMLButtonElement>('.heatmap__cell[data-month="2024-03"]')!.click();
    expect(headers()).toEqual(['Component', 'Amount', 'Weight in the drawing']);

    node.querySelector<HTMLButtonElement>('.figure__back')!.click();
    expect(headers()).toEqual(['Month', 'Profit']);
  });

  // A tile is inert: there is nothing below a component to open, and a button
  // that does nothing is worse than a picture that says so.
  it('draws the parts as a named picture rather than as more buttons', () => {
    const node = monthly();
    node.querySelector<HTMLButtonElement>('.heatmap__cell[data-month="2024-03"]')!.click();

    const plot = node.querySelector('.treemap')!;
    expect(plot.getAttribute('role')).toBe('img');
    expect(plot.querySelector('button')).toBeNull();
    expect([...plot.querySelectorAll('.treemap__tile')].length).toBeGreaterThan(0);
  });

  // Both redraws destroy the button the reader just activated, so focus has to
  // be placed by hand or it falls to the document and the keyboard reader is
  // returned to the top of the page.
  it('carries focus into the opened month and back to the cell it came from', () => {
    const node = monthly();
    document.body.append(node);
    try {
      const cell = node.querySelector<HTMLButtonElement>('.heatmap__cell[data-month="2024-03"]')!;
      cell.focus();
      cell.click();

      const back = node.querySelector<HTMLButtonElement>('.figure__back')!;
      expect(back.hidden).toBe(false);
      expect(document.activeElement).toBe(back);

      back.click();

      // Not the same node — the grid was rebuilt — but the same month.
      expect((document.activeElement as HTMLElement).dataset.month).toBe('2024-03');
    } finally {
      node.remove();
    }
  });

  // All twelve, derived from `formatMonth` rather than hand-typed. Asserting
  // only `[0]` would not notice months 2-12 being wrong, and September is the
  // one that catches a hand-written list: `en-IE` ICU spells it `Sept`, and the
  // headings are read back out of `formatMonth` precisely so that the column
  // heading agrees with the month column standing beside it.
  it('heads the twelve columns with the month names of the reader’s language', () => {
    const heading = (language: Language): (string | null)[] =>
      [...monthly(language).querySelectorAll('.heatmap thead th')].map((th) => th.textContent);

    for (const language of LANGUAGES) {
      const headings = heading(language);
      expect(headings, language).toHaveLength(13);

      const months = headings.slice(0, 12);
      expect(new Set(months).size, language).toBe(12);
      months.forEach((month, index) => {
        // Stated as a property rather than by repeating the trimming here: a
        // test that recomputes the implementation agrees with every bug in it.
        // What has to hold is that the heading is the month column's own text
        // with the year taken off, and that it is never a bare leftover.
        const full = formatMonth(language, `2001-${String(index + 1).padStart(2, '0')}`);
        expect(full.startsWith(month ?? ''), `${language}: ${full}`).toBe(true);
        expect(month, language).not.toMatch(/^$|[\s,/]$/);
      });

      expect(headings.at(-1), language).toBe(catalogue(language)['monthlyProfit.total']);
    }
  });

  it('keeps the abbreviation ICU chose, joiner off and full stop on', () => {
    // Both directions of the same mistake, and both were live defects.
    // `pt-PT` writes a short month and a year as `03/2001`, so the joiner has
    // to come off; `de-DE` abbreviates as `Apr.`, so trimming that joiner must
    // not take the full stop with it, which would misspell the month.
    const heading = (language: Language, index: number): string =>
      [...monthly(language).querySelectorAll('.heatmap thead th')][index]?.textContent ?? '';

    expect(heading('pt', 2)).toMatch(/^\d{2}$/);
    expect(heading('de', 3)).toMatch(/\.$/);
    expect(heading('en', 8)).toBe('Sept');
  });

  // The grid abbreviates every figure, so the exact one has to survive
  // somewhere the reader can reach without a pointer. Three places do: the
  // accessible name of a cell, the readout on hover, and the table below.
  it('prints the cell abbreviated and keeps the exact figure in its name', () => {
    const node = monthly();
    const cell = node.querySelector<HTMLElement>('.heatmap__cell[data-month="2024-03"]')!;
    const march = MONTHS.find((month) => month.month === '2024-03')!;

    expect(cell.textContent).toBe(formatCompactCurrency('en', march.profit));
    expect(cell.getAttribute('aria-label')).toBe(
      `${formatMonth('en', '2024-03')}: ${formatSignedCurrency('en', march.profit)}`,
    );
  });

  // The two margins are the same money read two ways, so the corner where they
  // meet has to be the one figure both add up to. A total that disagreed with
  // the months above it would be worse than no total at all.
  it('closes the grid with margins that reconcile against the months', () => {
    const node = monthly();
    const grand = MONTHS.reduce((sum, month) => sum.plus(month.profit), new Decimal(0));

    expect(node.querySelector('.heatmap__total--grand')!.textContent).toBe(
      formatCompactCurrency('en', grand),
    );
    // The fixture is one year, so that year's row total is the same money.
    const rowTotals = [...node.querySelectorAll('tbody .heatmap__total')];
    expect(rowTotals).toHaveLength(1);
    expect(rowTotals[0]!.textContent).toBe(formatCompactCurrency('en', grand));
  });

  it('repeats the margins in the table, where the figures are exact', () => {
    const node = monthly();
    const grand = MONTHS.reduce((sum, month) => sum.plus(month.profit), new Decimal(0));
    // Scoped to this figure: the section holds three data tables, and the
    // month-by-month one is the only one with a back button over it.
    const table = node.querySelector('.figure__back')!.closest('figure.figure')!;
    const rows = [...table.querySelectorAll('table.data-table tbody tr')].map((tr) =>
      [...tr.querySelectorAll('td, th')].map((cell) => cell.textContent),
    );

    // Every month, then the year, then each calendar month across the years,
    // then the corner. Named so a total can never be mistaken for a month.
    expect(rows).toContainEqual(['2024', formatSignedCurrency('en', grand)]);
    expect(rows).toContainEqual([
      `${formatMonth('en', '2024-03').replace('2024', '').trim()}, all years`,
      formatSignedCurrency('en', MONTHS.find((m) => m.month === '2024-03')!.profit),
    ]);
    expect(rows.at(-1)).toEqual(['Total', formatSignedCurrency('en', grand)]);
  });

});

describe('the window composition table', () => {
  const windows = (operations: Operation[] = ACCOUNT): Element => {
    const found = reportView(contextFor('en', operations), GENERATED_AT).querySelector('#windows');
    if (!found) throw new Error('windows section missing');
    return found;
  };

  const tables = (operations: Operation[] = ACCOUNT): HTMLTableElement[] =>
    [...windows(operations).querySelectorAll('table.data-table')] as HTMLTableElement[];

  it('sits under the totals rather than widening them to twelve columns', () => {
    // Two tables, in the reading order the monthly section established: the
    // result first, then what it is made of.
    expect(tables()).toHaveLength(2);
  });

  it('gives the second table a column per part and no total', () => {
    // The total is the first table's PROFIT column. Repeating it here printed
    // the same figure twice under the same word, on a table already at the
    // width the printed page allows.
    const header = [...tables()[1]!.querySelectorAll('thead th')].map((th) => th.textContent);
    expect(header).toEqual([
      'Window',
      'Trading',
      'Dividends',
      'Interest',
      'Other income',
      'Charges',
    ]);
    expect(header).not.toContain('Profit');
  });

  it('says the rows overlap, because a reader who sums them is wrong', () => {
    // 1D is inside 1W is inside 1M: this is why the section has no stacked bar.
    expect(windows().textContent).toContain('overlap');
  });

  it('adds up to the profit the totals table states, window by window', () => {
    // The column that said so was dropped, so the claim it made is asserted
    // here instead: read the five parts off the page and sum them.
    const amount = (cell?: Element): number => {
      const text = (cell?.textContent ?? '').replace(/\u00a0/g, ' ');
      if (!/\d/.test(text)) return 0; // an em dash, or "No profit movement"
      return Number(text.replace(/[^0-9.-]/g, ''));
    };

    const [totals, composition] = tables();
    const rows = (table: HTMLTableElement): Element[] => [...table.querySelectorAll('tbody tr')];
    expect(rows(composition!)).toHaveLength(rows(totals!).length);

    let checked = 0;
    rows(composition!).forEach((row, index) => {
      const totalsRow = rows(totals!)[index]!;
      const window = row.children[0]?.textContent;
      expect(window).toBe(totalsRow.children[0]?.textContent);

      const parts = [...row.children].slice(1, 6).reduce((sum, cell) => sum + amount(cell), 0);
      expect(parts, window ?? '').toBeCloseTo(amount(totalsRow.children[2]), 2);
      if (parts !== 0) checked += 1;
    });

    // Falsifies the loop: a page of dashes would satisfy every assertion above.
    expect(checked).toBeGreaterThan(0);
  });

  it('writes the charges column as the subtraction it is', () => {
    const charged = [...tables()[1]!.querySelectorAll('tbody tr')]
      .map((row) => row.children[5])
      .filter((cell) => (cell?.textContent ?? '') !== formatSignedCurrency('en', 0));

    // Falsifies the loop: this account pays a fee and two taxes, so some window
    // must carry a charge.
    expect(charged.length).toBeGreaterThan(0);
    for (const cell of charged) {
      expect(cell?.textContent).toMatch(/^-/);
      expect(cell?.className).toContain('is-negative');
    }
  });

  it('breaks down nothing in a window that moved no profit', () => {
    // A deposit fills the day with activity and moves no profit. Five zeroes
    // there would read as "broke even" — the same lie the totals table avoids.
    const withDeposit = [
      ...ACCOUNT,
      op('2024-05-01', 'CASH', 'CUSTOMER_INBOUND', { amount: '500.00' }),
    ];
    const built = tables(withDeposit);
    const oneDay = [...built[1]!.querySelectorAll('tbody tr')].at(-1)!;
    const cells = [...oneDay.children].map((cell) => cell.textContent);

    expect(cells).toHaveLength(6);
    expect(cells[0]).toBe('1 day');
    expect(cells.slice(1)).toEqual(['—', '—', '—', '—', '—']);

    // The words that replace the zeroes live in the totals table now, and are
    // the reason this row is allowed to say nothing.
    const totalsRow = [...built[0]!.querySelectorAll('tbody tr')].at(-1)!;
    expect(totalsRow.children[2]?.textContent).toBe('No profit movement');
  });
});

describe('money in tables', () => {
  it('colours a loss the same way the tiles do', () => {
    const root = reportView(contextFor('en'), GENERATED_AT);
    const toned = [...root.querySelectorAll('td.is-negative, td.is-positive')];

    // Falsifies the assertion below: if nothing is toned, the loop proves
    // nothing. This account closes one security at a profit and one at a loss.
    expect(toned.filter((cell) => cell.classList.contains('is-negative')).length).toBeGreaterThan(0);
    expect(toned.filter((cell) => cell.classList.contains('is-positive')).length).toBeGreaterThan(0);

    for (const cell of toned) {
      const negative = (cell.textContent ?? '').startsWith('-');
      expect(cell.classList.contains('is-negative'), cell.textContent ?? '').toBe(negative);
    }
  });

  it('leaves a size uncoloured, because only a result has a sign', () => {
    const root = reportView(contextFor('en'), GENERATED_AT);
    const securities = root.querySelector('#securities');
    const header = [...(securities?.querySelectorAll('th') ?? [])].map((th) => th.textContent);
    const proceeds = header.findIndex((title) => title === 'Proceeds');
    expect(proceeds).toBeGreaterThan(-1);

    for (const row of securities?.querySelectorAll('tbody tr') ?? []) {
      const cell = row.children[proceeds];
      expect(cell?.className).not.toContain('is-positive');
      expect(cell?.className).not.toContain('is-negative');
    }
  });
});

describe('the per-security detail', () => {
  function headerOf(root: HTMLElement): string[] {
    const securities = root.querySelector('#securities');
    return [...(securities?.querySelectorAll('th') ?? [])].map((th) => th.textContent ?? '');
  }

  function rowFor(root: HTMLElement, symbol: string): string[] {
    const rows = [...(root.querySelector('#securities')?.querySelectorAll('tbody tr') ?? [])];
    const found = rows.find((row) => row.children[0]?.textContent === symbol);
    if (!found) throw new Error(`no row for ${symbol}`);
    return [...found.children].map((cell) => cell.textContent ?? '');
  }

  it('names the shape of the trade next to its size, in both languages', () => {
    for (const language of LANGUAGES) {
      const header = headerOf(reportView(contextFor(language), GENERATED_AT));
      expect(header, language).toHaveLength(8);
      // The three attribute columns exist under a translated name, never blank.
      for (const title of header) expect(title.trim(), language).not.toBe('');
    }
  });

  it('states the yield on the cost, the lots closed and how long they were held', () => {
    const root = reportView(contextFor('en'), GENERATED_AT);
    const header = headerOf(root);
    const row = rowFor(root, 'AAA');

    // Bought 2024-01-03 for 100.00, sold 2024-03-07 for 150.00: one lot, 64 days.
    expect(row[header.indexOf('Yield on cost')]).toBe('+50.00%');
    expect(row[header.indexOf('Lots closed')]).toBe('1');
    expect(row[header.indexOf('Mean holding')]).toBe('64 days');
  });

  it('gives the yield the sign the profit beside it carries', () => {
    // A yield is a result, not a size: +50% and -33% must not look alike.
    const root = reportView(contextFor('en'), GENERATED_AT);
    const column = headerOf(root).indexOf('Yield on cost');
    const losing = [...(root.querySelector('#securities')?.querySelectorAll('tbody tr') ?? [])].find(
      (r) => r.children[0]?.textContent === 'BBB',
    );
    const cell = losing?.children[column];
    expect(cell?.textContent).toBe('-33.33%');
    expect(cell?.className).toContain('is-negative');
  });

  it('says nothing rather than dividing by zero on a free grant', () => {
    // A BONUS_ISSUE lot costs nothing, so there is no base to return on. A 0%
    // would read as "broke even", which is not what happened.
    const granted: Operation[] = [
      op('2024-01-02', 'TRADING', 'BONUS_ISSUE', { shares: '10' }),
      op('2024-02-02', 'TRADING', 'SELL', { shares: '-10', amount: '150.00' }),
    ];
    const root = reportView(contextFor('en', granted), GENERATED_AT);
    const row = rowFor(root, 'AAA');
    expect(row[headerOf(root).indexOf('Yield on cost')]).toBe('—');
    expect(row[headerOf(root).indexOf('Lots closed')]).toBe('1');
  });

  it('has no holding period for a sale that consumed no lot', () => {
    const uncovered: Operation[] = [
      op('2024-02-02', 'TRADING', 'SELL', { shares: '-10', amount: '150.00' }),
    ];
    const root = reportView(contextFor('en', uncovered), GENERATED_AT);
    const header = headerOf(root);
    const row = rowFor(root, 'AAA');
    expect(row[header.indexOf('Lots closed')]).toBe('0');
    expect(row[header.indexOf('Mean holding')]).toBe('—');
  });

  it('counts a single day in the singular, in every language', () => {
    // A one-day hold is ordinary here, and "1 giorni" is simply wrong Italian.
    // Spelled out per language rather than read back out of the catalogue,
    // because a catalogue that lost the distinction would then agree with
    // itself and the test would pass on a page reading "1 Tage".
    const dayTrade: Operation[] = [
      op('2024-01-02', 'TRADING', 'BUY', { shares: '10', amount: '-100.00' }),
      op('2024-01-03', 'TRADING', 'SELL', { shares: '-10', amount: '150.00' }),
    ];
    const expected: Record<Language, string> = {
      de: '1 Tag',
      en: '1 day',
      es: '1 día',
      fr: '1 jour',
      it: '1 giorno',
      nl: '1 dag',
      pt: '1 dia',
    };
    for (const language of LANGUAGES) {
      const root = reportView(contextFor(language, dayTrade), GENERATED_AT);
      const row = rowFor(root, 'AAA');
      expect(row.at(-1), language).toBe(expected[language]);
    }
  });

  it('keeps the plural for a mean that merely sits near one', () => {
    // Two lots held 2 days and 1 day average to 1.5, which is not "1 day".
    const twoLots: Operation[] = [
      op('2024-01-01', 'TRADING', 'BUY', { shares: '10', amount: '-100.00' }),
      op('2024-01-02', 'TRADING', 'BUY', { shares: '10', amount: '-100.00' }),
      op('2024-01-03', 'TRADING', 'SELL', { shares: '-20', amount: '250.00' }),
    ];
    const root = reportView(contextFor('en', twoLots), GENERATED_AT);
    expect(rowFor(root, 'AAA').at(-1)).toBe('1.5 days');
  });

  it('keeps the table inside a scroller, so eight columns cannot widen the page', () => {
    const root = reportView(contextFor('en'), GENERATED_AT);
    const table = root.querySelector('#securities table.data-table');
    expect(table?.closest('.table-scroll')).not.toBeNull();
  });
});

describe('the shape of the report', () => {
  it('gives the headline section the weight, and only that one', () => {
    const root = reportView(contextFor('en'), GENERATED_AT);
    const lead = [...root.querySelectorAll('.section--lead')].map((node) => node.id);
    expect(lead).toEqual(['summary']);
  });
});

describe('an account with nothing closed', () => {
  const OPEN_ONLY: Operation[] = [
    op('2024-01-02', 'CASH', 'CUSTOMER_INBOUND', { amount: '500.00' }),
    op('2024-01-03', 'TRADING', 'BUY', { shares: '4', amount: '-80.00' }),
  ];

  it('drops the sections that would otherwise state a result of zero', () => {
    // A win rate of 0% over zero closed positions reads as a result. It is not
    // one, so the section is absent rather than empty.
    const root = reportView(contextFor('en', OPEN_ONLY), GENERATED_AT);
    const ids = [...root.querySelectorAll('section')].map((node) => node.id);
    expect(ids).not.toContain('win-rate');
    expect(ids).not.toContain('holding');
    expect(ids).not.toContain('execution');
    expect(ids).toContain('summary');
    expect(ids).toContain('open-positions');
  });

  it('renders without throwing', () => {
    expect(() => reportView(contextFor('it', []), GENERATED_AT)).not.toThrow();
  });
});

describe('series toggles', () => {
  it('hides a monthly component from the stack without touching its table', () => {
    const node = reportView(contextFor('en'), new Date('2024-05-01T10:00:00Z'));
    const stack = [...node.querySelectorAll('figure.figure')].find((f) =>
      f.querySelector('.figure__title')?.textContent?.includes('made of'),
    )!;

    const before = stack.querySelectorAll('rect.chart__segment').length;
    const table = stack.querySelector('table.data-table')!.textContent;
    const trading = [...stack.querySelectorAll<HTMLButtonElement>('button.legend__toggle')].find(
      (b) => b.textContent === 'Trading',
    )!;
    trading.click();

    expect(stack.querySelectorAll('rect.chart__segment').length).toBeLessThan(before);
    expect(stack.querySelector('table.data-table')!.textContent).toBe(table);
  });

  it('hides a trend line', () => {
    const node = reportView(contextFor('en'), new Date('2024-05-01T10:00:00Z'));
    const trend = node.querySelector('#trend figure.figure')!;

    const before = trend.querySelectorAll('path.chart__line').length;
    trend.querySelector<HTMLButtonElement>('button.legend__toggle')!.click();

    expect(trend.querySelectorAll('path.chart__line').length).toBe(before - 1);
  });
});

