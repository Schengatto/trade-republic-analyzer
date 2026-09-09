/**
 * Spec §6.2 and §6.8 — the cumulative line chart and its data table.
 *
 * Both series are euro amounts, so they share one axis. That is the whole
 * reason a second axis is never offered here.
 */

import {
  DRAWDOWN_MIN_DEPTH_PERCENT,
  advance,
  drawdowns,
  setback,
  timeSeries,
  type DrawdownEpisode,
  type DrawdownHistory,
  type Setback,
} from '../../core/analytics';
import { el } from '../dom';
import { dataTable, figure, type Cell } from '../chart/figure';
import { dayNumber } from '../chart/geometry';
import { lineChart } from '../chart/line';
import { SERIES_1, SERIES_2 } from '../chart/palette';
import { formatCurrency, formatDate, formatInteger, formatPercent } from '../format';
import {
  NOTHING,
  daysLabel,
  note,
  section,
  signedCell,
  statTile,
  type ReportContext,
} from './common';

/**
 * The sentence under the largest fall: from when to when, and whether it is over.
 *
 * With no day for the peak — the fall started from the zero the account opened
 * at — the sentence names the trough alone, as it always did: the first day of
 * the series is not the peak's day, it is a day the curve had already left it.
 */
function drawdownHint({ language, t }: ReportContext, fall: Setback): string {
  const trough = formatDate(language, fall.troughDate);
  if (fall.peakDate === '') return t('trend.drawdown.hint', { date: trough });

  const span = {
    peak: formatDate(language, fall.peakDate),
    trough,
    days: daysLabel(t, language, fall.days),
  };
  return fall.recoveryDate === null
    ? t('trend.drawdown.hint.open', span)
    : t('trend.drawdown.hint.recovered', {
        ...span,
        recovery: formatDate(language, fall.recoveryDate),
        // Measured from the trough, so that it and `days` add up to the whole
        // episode: two spans that overlapped would invite the reader to add
        // them anyway and land on a number that never happened.
        back: daysLabel(t, language, fall.recoveryDays ?? 0),
      });
}

/**
 * The block under the tiles: how often the curve has fallen, and for how long.
 *
 * The three figures do not all speak about the same set, and that is deliberate
 * rather than an oversight to tidy up: a fall still under way has no length to
 * average, so the median takes only the ones that ended, while the longest is
 * taken over all of them — dropping an open fall from that one would hide the
 * very case a reader worries about. Each hint names the set it counted.
 */
function episodeBlock(context: ReportContext, history: DrawdownHistory): (HTMLElement | false)[] {
  const { language, t } = context;
  const { episodes, longest, medianDays, openCount } = history;

  const longestHint = {
    trough: formatDate(language, longest.troughDate),
    recovery: longest.recoveryDate === null ? '' : formatDate(language, longest.recoveryDate),
  };

  return [
    el('h3', { class: 'subheading' }, [t('trend.episodes.heading')]),
    note(
      t('trend.episodes.note', {
        depth: formatCurrency(language, history.minDepth),
        ratio: formatPercent(language, DRAWDOWN_MIN_DEPTH_PERCENT, 0),
      }),
    ),
    el('div', { class: 'tiles' }, [
      statTile({
        label: t('trend.episodes.count'),
        value: formatInteger(language, episodes.length),
        // At most one episode can be open — only the last fall has no later
        // point to close it — so the open wording speaks of a single one.
        hint: t(openCount > 0 ? 'trend.episodes.count.hint.open' : 'trend.episodes.count.hint.closed'),
      }),
      // A type guard rather than a branch: the block only renders from two
      // episodes up, and since only the last fall can still be open, two
      // episodes always include one that ended.
      medianDays !== null &&
        statTile({
          label: t('trend.episodes.typical'),
          value: daysLabel(t, language, medianDays),
          hint: t('trend.episodes.typical.hint'),
        }),
      statTile({
        label: t('trend.episodes.longest'),
        value: daysLabel(t, language, longest.days),
        hint: t(
          longest.open ? 'trend.episodes.longest.hint.open' : 'trend.episodes.longest.hint.recovered',
          longestHint,
        ),
      }),
    ]),
    el('div', { class: 'table-scroll' }, [
      dataTable(
        {
          columns: [
            t('trend.episodes.column.peak'),
            t('trend.episodes.column.trough'),
            t('trend.episodes.column.depth'),
            t('trend.episodes.column.fallDays'),
            t('trend.episodes.column.recovery'),
            t('trend.episodes.column.recoveryDays'),
          ],
          numericFrom: 1,
          rows: episodes.map((one) => episodeRow(context, one)),
        },
        t('trend.episodes.heading'),
      ),
    ]),
  ];
}

function episodeRow({ language, t }: ReportContext, one: DrawdownEpisode): Cell[] {
  // A fall from the seeded zero has no peak day, and so no span from one: the
  // first day of the series is a day the curve had already left that zero, and
  // «0 giorni» in the duration column would claim it fell and recovered at once.
  const fromPeak = one.peakDate === '';
  return [
    fromPeak ? NOTHING : formatDate(language, one.peakDate),
    formatDate(language, one.troughDate),
    formatCurrency(language, one.depth),
    fromPeak ? NOTHING : daysLabel(t, language, one.fallDays),
    one.recoveryDate === null ? NOTHING : formatDate(language, one.recoveryDate),
    one.recoveryDays === null ? NOTHING : daysLabel(t, language, one.recoveryDays),
  ];
}

export function trendSection(context: ReportContext): HTMLElement {
  const { report, language, t } = context;
  const points = timeSeries(report);
  const fall = setback(points);
  const rise = advance(points);
  const history = drawdowns(points);

  const series = [
    { key: 'net', label: t('trend.series.net'), color: SERIES_1, values: points.map((point) => point.net.toNumber()) },
    {
      key: 'trading',
      label: t('trend.series.trading'),
      color: SERIES_2,
      values: points.map((point) => point.trading.toNumber()),
    },
  ];

  return section('trend', t('trend.heading'), [
    // Each figure is a size, and its label already says which way it points, so
    // all four print unsigned and uncoloured: a red minus in front of a figure
    // labelled "drawdown" says it twice, and a green one under "best day"
    // would be the only place on the page where a colour means nothing.
    //
    // Fall and rise are paired across, not down: the two amounts sit side by
    // side and the two single days below them, so the comparable figures are
    // adjacent and a narrow screen breaks the row into those same pairs.
    (fall !== null || rise !== null) &&
      el('div', { class: 'tiles' }, [
        fall !== null &&
          statTile({
            label: t('trend.drawdown'),
            value: formatCurrency(language, fall.drawdown),
            hint: drawdownHint(context, fall),
          }),
        rise !== null &&
          statTile({
            label: t('trend.runUp'),
            value: formatCurrency(language, rise.runUp),
            hint: t('trend.runUp.hint', { date: formatDate(language, rise.peakDate) }),
          }),
        fall !== null &&
          statTile({
            label: t('trend.worstDay'),
            value: formatCurrency(language, fall.worstDay),
            hint: t('trend.worstDay.hint', { date: formatDate(language, fall.worstDayDate) }),
          }),
        rise !== null &&
          statTile({
            label: t('trend.bestDay'),
            value: formatCurrency(language, rise.bestDay),
            hint: t('trend.bestDay.hint', { date: formatDate(language, rise.bestDayDate) }),
          }),
      ]),
    // Between the tiles and the chart: the tiles name the worst fall, this says
    // how the account has fallen in general, and the line below draws both.
    //
    // From two episodes up. With a single fall there is nothing to count, take
    // a median of, or rank, and every cell of the block would restate the tile
    // above it — which already names that fall's peak, trough, length and
    // recovery in one sentence.
    ...(history !== null && history.episodes.length > 1 ? episodeBlock(context, history) : []),
    figure({
      t,
      title: t('trend.heading'),
      description: t('trend.description'),
      legend: series.map(({ key, label, color }) => ({ key, label, color })),
      plot: (hidden) => {
        const plotHost = el('div', { class: 'plot-host' });
        const shown = series.filter((s) => !hidden.has(s.key));
        const plot = lineChart(
          {
            xValues: points.map((point) => dayNumber(point.date)),
            xLabel: (index) => formatDate(language, points[index]!.date),
            series: shown.map(({ label, color, values }) => ({ label, color, values })),
            formatValue: (value) => formatCurrency(language, value),
            formatTick: (value) => formatCurrency(language, value),
          },
          plotHost,
        );
        if (!plot) return null;
        plotHost.append(plot);
        return plotHost;
      },
      table: {
        columns: [
          t('trend.column.date'),
          t('trend.series.net'),
          t('trend.series.trading'),
          t('trend.column.dayProfit'),
        ],
        rows: points.map((point) => [
          formatDate(language, point.date),
          signedCell(language, point.net),
          signedCell(language, point.trading),
          signedCell(language, point.dayProfit),
        ]),
      },
    }),
  ]);
}
