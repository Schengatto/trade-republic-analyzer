/**
 * Spec §6.2 and §6.8 — the cumulative line chart and its data table.
 *
 * Both series are euro amounts, so they share one axis. That is the whole
 * reason a second axis is never offered here.
 */

import { setback, timeSeries } from '../../core/analytics';
import { el } from '../dom';
import { figure } from '../chart/figure';
import { dayNumber } from '../chart/geometry';
import { lineChart } from '../chart/line';
import { SERIES_1, SERIES_2 } from '../chart/palette';
import { formatCurrency, formatDate } from '../format';
import { section, signedCell, statTile, type ReportContext } from './common';

export function trendSection(context: ReportContext): HTMLElement {
  const { report, language, t } = context;
  const points = timeSeries(report);
  const fall = setback(points);

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
    // Both are sizes of a fall, so both print unsigned and uncoloured: a red
    // minus in front of a figure already labelled "drawdown" says it twice, and
    // the two tiles travel together so no column mixes them with a gain.
    fall !== null &&
      el('div', { class: 'tiles' }, [
        statTile({
          label: t('trend.drawdown'),
          value: formatCurrency(language, fall.drawdown),
          hint: t('trend.drawdown.hint', { date: formatDate(language, fall.troughDate) }),
        }),
        statTile({
          label: t('trend.worstDay'),
          value: formatCurrency(language, fall.worstDay),
          hint: t('trend.worstDay.hint', { date: formatDate(language, fall.worstDayDate) }),
        }),
      ]),
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
