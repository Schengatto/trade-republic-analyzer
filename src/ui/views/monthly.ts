/**
 * Spec §7.2 and §7.3 — the monthly charts.
 *
 * The transactions chart counts BUY and SELL *rows*, not orders: a partially
 * filled order lands in the export as several rows. The heading, the axis
 * label, the legend and the table column all say "rows" for that reason —
 * calling them "transactions" would overstate how often the account traded.
 */

import { monthlyAggregates, monthlyMargins } from '../../core/analytics';
import { barChart, stackedBarChart } from '../chart/bars';

import { figure } from '../chart/figure';
import { heatmap, type HeatmapCell } from '../chart/heatmap';
import { SERIES_1, SERIES_2, SERIES_3, SERIES_4, SERIES_5, poleFor } from '../chart/palette';
import { treemap } from '../chart/treemap';
import { clear, el } from '../dom';
import type { Language, Translator } from '../i18n';
import {
  formatCompactCurrency,
  formatCurrency,
  formatInteger,
  formatMonth,
  formatPercent,
  formatSignedCurrency,
} from '../format';
import { deductionCell, section, signedCell, type ReportContext } from './common';

/**
 * The five parts, in fixed order.
 *
 * The colour of a segment must follow what it is: a month with no dividend
 * leaves that slot empty rather than shifting interest into the dividend
 * colour. The order is also the colour-blind safety mechanism — the palette was
 * validated on adjacent pairs, so reordering means revalidating.
 */
function profitParts(t: Translator) {
  return [
    { key: 'trading', label: t('profitPart.trading'), color: SERIES_1 },
    { key: 'dividends', label: t('profitPart.dividends'), color: SERIES_2 },
    { key: 'interest', label: t('profitPart.interest'), color: SERIES_3 },
    { key: 'otherIncome', label: t('profitPart.otherIncome'), color: SERIES_4 },
    { key: 'charges', label: t('profitPart.charges'), color: SERIES_5 },
  ] as const;
}

export function monthlySection(context: ReportContext): HTMLElement {
  const { report, operations, t } = context;
  const months = monthlyAggregates(operations, report);

  return section('monthly', t('monthly.heading'), [
    profitFigure(context, months),
    // Between the totals and the row count: the reader meets the month's profit
    // first, then what it was made of over time.
    compositionFigure(context, months),
    transactionsFigure(context, months),
  ]);
}

type Months = ReturnType<typeof monthlyAggregates>;

/**
 * The twelve column headings, in the reader's language.
 *
 * Read back out of `formatMonth` — which already asks `Intl` for the short
 * month name — rather than from twelve translated strings: ICU spells September
 * `Sept` in `en-IE`, and a hand-written `Sep` would disagree with the month
 * column standing right beside it.
 *
 * The joiner has to come off as well as the year. `pt-PT` renders a short month
 * and a year as `03/2001`, so trimming only spaces and commas left the
 * Portuguese headings reading `03/`. The full stop is deliberately NOT trimmed:
 * `de-DE` and `nl-NL` abbreviate with one — `Apr.`, `mrt.` — and taking it off
 * would be misspelling the month rather than tidying the heading.
 */
const HEADING_YEAR = '2001';
const YEAR_JOINERS = /^[\s,/]+|[\s,/]+$/g;

function monthAbbreviations(language: Language): string[] {
  return Array.from({ length: 12 }, (_, index) =>
    formatMonth(language, `${HEADING_YEAR}-${String(index + 1).padStart(2, '0')}`)
      .replace(HEADING_YEAR, '')
      .replace(YEAR_JOINERS, ''),
  );
}

/**
 * Every month at once, and — once a cell is clicked — that one month opened
 * into the parts that made it.
 *
 * One figure with two states, not two figures side by side. The grid answers
 * "which months were good"; the parts answer "what made this one", and the
 * second question is only ever asked about a month the reader has just pointed
 * at. Standing them next to each other would leave a picture of components on
 * screen with nothing saying which month it belongs to.
 *
 * Both states share the poles, so one legend covers them, and both are read
 * through the same table — which is why every state change goes through
 * `rebuild` rather than through a plot-only redraw. The heading and the
 * description are written once and cannot change with the state, so the opened
 * month names itself inside the plot instead.
 */
function profitFigure(context: ReportContext, months: Months): HTMLElement {
  const { language, t } = context;
  const parts = profitParts(t);

  const columns = monthAbbreviations(language);

  /**
   * One figure in its two lengths: abbreviated for the cell, exact for the
   * accessible name, the hover readout and the table.
   *
   * A grid cell is a fixed box in a row of twelve, and the widest month would
   * otherwise set the width of every column in it. Nothing is lost, because
   * the exact figure is never more than a hover or a table row away.
   */
  const figureOf = (name: string, amount: Months[number]['profit']) => ({
    name,
    primary: formatCompactCurrency(language, amount),
    exact: formatSignedCurrency(language, amount),
  });

  // A Map keeps the years in the order their first month arrived, which is
  // chronological. Nothing here sorts.
  const byYear = new Map<string, HeatmapCell[]>();
  for (const month of months) {
    const year = month.month.slice(0, 4);
    const cells = byYear.get(year) ?? [];
    cells.push({
      ...figureOf(formatMonth(language, month.month), month.profit),
      key: month.month,
      month: Number(month.month.slice(5, 7)),
      value: month.profit.toNumber(),
    });
    byYear.set(year, cells);
  }

  // Summed in the core, which owns the decimal arithmetic: adding the plotted
  // floats back up here would drift the cents against the same profit printed
  // elsewhere on the page.
  const margins = monthlyMargins(months);
  const yearTotal = new Map(margins.byYear.map((entry) => [entry.year, entry]));

  const rows = [...byYear].map(([year, cells]) => ({
    year,
    cells,
    total: figureOf(year, yearTotal.get(year)!.profit),
  }));

  // Every January added together is not a January, so it does not get to be
  // called one.
  const columnName = (month: number): string =>
    t('monthlyProfit.allYears', { month: columns[month - 1]! });

  const totals = {
    label: t('monthlyProfit.total'),
    byMonth: margins.byMonth.map((entry) =>
      entry.present ? figureOf(columnName(entry.month), entry.profit) : null,
    ),
    grand: figureOf(t('monthlyProfit.total'), margins.grand),
  };

  // Null is the grid; a key is that month, opened. The state starts null and
  // never opens on its own: which month is worth a second look is the reader's
  // question, and answering it for them would hide the grid they came for.
  let opened: string | null = null;
  const openedMonth = (): Months[number] | undefined => months.find((m) => m.month === opened);

  /**
   * The parts of one month, signed.
   *
   * Charges are stored as a positive magnitude. Flipped here, on the float, so
   * the tile takes the negative pole and the table reads as a deduction — and
   * flipped only when there is something to flip, so a month that was charged
   * nothing never says `-0,00 €`.
   */
  const signedParts = (month: Months[number]) =>
    parts.map((part) => {
      const magnitude = month.components[part.key].toNumber();
      return {
        key: part.key,
        label: part.label,
        value: part.key === 'charges' ? (magnitude === 0 ? 0 : -magnitude) : magnitude,
      };
    });

  const host = el('div', { class: 'plot-host' });

  // `figure` builds the plot before it has a `rebuild` to hand out, so the
  // redraw is captured out of `controls` into this holder. Every state change
  // goes through it rather than through the legend's plot-only redraw: opening
  // a month replaces the table as well as the picture, and the table is the
  // equivalent that reaches a screen reader and the printed page.
  let refresh = (): void => {};

  const back = el('button', { type: 'button', class: 'figure__back' }, [t('monthlyProfit.back')]);
  back.addEventListener('click', () => {
    const was = opened;
    opened = null;
    refresh();
    // Focus lands back on the cell it came from, not at the top of the page:
    // the reader was pointing at a month and is still asking about that row.
    host.querySelector<HTMLElement>(`[data-month="${was}"]`)?.focus();
  });

  const open = (key: string): void => {
    opened = key;
    refresh();
    back.focus();
  };

  const draw = (): HTMLElement | null => {
    clear(host);
    back.hidden = opened === null;

    if (opened === null) {
      const grid = heatmap({ rows, columns, totals, onOpen: open });
      if (!grid) return null;
      host.append(grid);
      return host;
    }

    const month = openedMonth();
    const caption = t('monthlyProfit.parts', { month: formatMonth(language, opened) });
    const tiles = month
      ? signedParts(month).map((part) => ({
          ...part,
          amount: formatSignedCurrency(language, part.value),
        }))
      : [];
    host.append(
      el('div', { class: 'plot-open' }, [
        el('p', { class: 'plot-caption' }, [caption]),
        treemap({ tiles, title: caption }) ??
          el('p', { class: 'figure__empty' }, [t('monthlyProfit.empty')]),
      ]),
    );
    return host;
  };

  // Month and profit, and nothing else: the comparison with the month before
  // used to sit here and in the cells, but it could not hold one unit. A
  // percentage across a change of sign states a magnitude that misleads, so the
  // core leaves it null and the label fell back to euro — leaving a column, and
  // a line of every cell, that was a percentage on some rows and an amount on
  // others. One figure per month, in euro, is the reading that survives.
  //
  // The margins follow the months, each named the way its cell names itself in
  // the readout above. The abbreviation the grid prints stops here: this table
  // is where the figures are exact, and it is the only reading that reaches a
  // printed page.
  const gridTable = () => ({
    columns: [t('monthly.column.month'), t('monthly.column.profit')],
    rows: [
      ...months.map((month) => [
        formatMonth(language, month.month),
        signedCell(language, month.profit),
      ]),
      ...margins.byYear.map((entry) => [entry.year, signedCell(language, entry.profit)]),
      ...margins.byMonth
        .filter((entry) => entry.present)
        .map((entry) => [columnName(entry.month), signedCell(language, entry.profit)]),
      [t('monthlyProfit.total'), signedCell(language, margins.grand)],
    ],
  });

  const partsTable = (month: Months[number]) => {
    const drawn = signedParts(month);
    // The denominator is the sum of the magnitudes, because that is what the
    // areas are drawn from. It is not the month's profit: charges subtract, and
    // no area can. A month of +50 and -25 draws 75 units of tile for a month
    // worth 25, so a column called "share of the profit" would be a lie the
    // picture is already telling and the table is here to stop.
    const total = drawn.reduce((sum, part) => sum + Math.abs(part.value), 0);
    return {
      columns: [
        t('monthlyProfit.column.part'),
        t('monthlyProfit.column.amount'),
        t('monthlyProfit.column.weight'),
      ],
      rows: drawn.map((part) => [
        part.label,
        part.key === 'charges'
          ? deductionCell(language, month.components.charges)
          : signedCell(language, month.components[part.key]),
        formatPercent(language, total === 0 ? 0 : (Math.abs(part.value) / total) * 100),
      ]),
    };
  };

  return figure({
    t,
    title: t('monthlyProfit.heading'),
    description: t('monthlyProfit.description'),
    // Keyless: this legend explains a scale that both states share, and hiding
    // half of a diverging scale would not mean anything.
    legend: [
      { label: t('monthlyProfit.legend.positive'), color: poleFor(1) },
      { label: t('monthlyProfit.legend.negative'), color: poleFor(-1) },
    ],
    controls: (rebuild) => {
      refresh = rebuild;
      return back;
    },
    plot: draw,
    table: () => {
      const month = openedMonth();
      return month ? partsTable(month) : gridTable();
    },
  });
}

/**
 * The same profit as the figure above, split by what produced it.
 *
 * The five parts are fixed and in a fixed order, because the colour of a
 * segment must follow what it is: a month with no dividend leaves that slot
 * empty rather than shifting interest into the dividend colour.
 */
function compositionFigure(context: ReportContext, months: Months): HTMLElement {
  const { language, t } = context;

  const parts = profitParts(t);

  return figure({
    t,
    title: t('monthlyComposition.heading'),
    description: t('monthlyComposition.description'),
    legend: parts.map((part) => ({ key: part.key, label: part.label, color: part.color })),
    plot: (hidden) => {
      const host = el('div', { class: 'plot-host' });
      const shown = parts.filter((part) => !hidden.has(part.key));
      const plot = stackedBarChart(
        {
          data: months.map((month) => ({
            label: formatMonth(language, month.month),
            segments: shown.map((part) => ({
              key: part.key,
              label: part.label,
              // Charges are stored as a positive magnitude — a size, not a result.
              // Flipped here on the float the chart geometry uses anyway, so the
              // segment hangs below the baseline instead of adding to the pile.
              value:
                part.key === 'charges'
                  ? -month.components.charges.toNumber()
                  : month.components[part.key].toNumber(),
              color: part.color,
            })),
          })),
          formatValue: (value) => formatSignedCurrency(language, value),
          formatTick: (value) => formatCurrency(language, value),
          title: t('monthlyComposition.heading'),
        },
        host,
      );
      if (!plot) return null;
      host.append(plot);
      return host;
    },
    table: {
      columns: [
        t('monthly.column.month'),
        ...parts.map((part) => part.label),
        t('monthly.column.profit'),
      ],
      rows: months.map((month) => [
        formatMonth(language, month.month),
        signedCell(language, month.components.trading),
        signedCell(language, month.components.dividends),
        signedCell(language, month.components.interest),
        signedCell(language, month.components.otherIncome),
        deductionCell(language, month.components.charges),
        signedCell(language, month.profit),
      ]),
    },
  });
}

function transactionsFigure(context: ReportContext, months: Months): HTMLElement {
  const { language, t } = context;

  return figure({
    t,
    title: t('monthlyTransactions.heading'),
    description: t('monthlyTransactions.description'),
    plot: () => {
      const host = el('div', { class: 'plot-host' });
      const plot = barChart(
        {
          data: months.map((month) => ({
            label: formatMonth(language, month.month),
            value: month.transactions,
            // A count has no polarity: one series, one colour.
            color: SERIES_1,
          })),
          formatValue: (value) => formatInteger(language, value),
          formatTick: (value) => formatInteger(language, value),
          // Rows are counted, and a month that produced two of them must not
          // share its gridline label with the one that produced one.
          wholeTicks: true,
          valueLabel: t('monthlyTransactions.series'),
        },
        host,
      );
      if (!plot) return null;
      host.append(plot);
      return host;
    },
    table: {
      columns: [t('monthly.column.month'), t('monthly.column.transactions')],
      rows: months.map((month) => [
        formatMonth(language, month.month),
        formatInteger(language, month.transactions),
      ]),
    },
  });
}
