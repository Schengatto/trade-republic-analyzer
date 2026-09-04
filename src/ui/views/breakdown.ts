/**
 * Spec §7.4 to §7.7 — profit by asset class, win rate, top/flop, holding time.
 *
 * Each of these returns null from the core when there is nothing closed to
 * measure. The section is then dropped entirely rather than rendered empty: a
 * win rate of 0% on zero closed positions would be read as a result.
 */

import {
  holdingDuration,
  profitByAssetClass,
  topAndFlop,
  winRate,
} from '../../core/analytics';
import { horizontalBarChart } from '../chart/bars';
import { dataTable, figure } from '../chart/figure';
import { poleFor } from '../chart/palette';
import { el } from '../dom';
import { formatCurrency, formatInteger, formatPercent, formatSignedCurrency } from '../format';
import {
  assetClassLabel,
  daysLabel,
  note,
  section,
  signedCell,
  statTile,
  type ReportContext,
} from './common';

/** How many securities each of the two rankings shows. */
const RANK_COUNT = 5;

export function assetClassSection(context: ReportContext): HTMLElement | null {
  const { report, language, t } = context;
  const rows = profitByAssetClass(report);
  if (rows.length === 0) return null;

  return section('asset-class', t('assetClass.heading'), [
    figure({
      t,
      title: t('assetClass.heading'),
      plot: () => {
        const host = el('div', { class: 'plot-host' });
        const plot = horizontalBarChart(
          {
            data: rows.map((row) => ({
              label: assetClassLabel(t, row.assetClass),
              value: row.profit.toNumber(),
              color: poleFor(row.profit.toNumber()),
            })),
            formatValue: (value) => formatSignedCurrency(language, value),
            formatTick: (value) => formatCurrency(language, value),
            valueLabel: t('assetClass.column.profit'),
          },
          host,
        );
        if (!plot) return null;
        host.append(plot);
        return host;
      },
      table: {
        columns: [t('assetClass.column.assetClass'), t('assetClass.column.profit')],
        rows: rows.map((row) => [
          assetClassLabel(t, row.assetClass),
          signedCell(language, row.profit),
        ]),
      },
    }),
  ]);
}

export function winRateSection(context: ReportContext): HTMLElement | null {
  const { report, language, t } = context;
  const rate = winRate(report);
  if (!rate) return null;

  return section('win-rate', t('winRate.heading'), [
    // The caution comes before the number, not after it: by the time a reader
    // reaches a footnote they have already formed an impression of the rate.
    note(t('winRate.caution')),
    el('div', { class: 'tiles' }, [
      statTile({
        label: t('winRate.rate'),
        value: formatPercent(language, rate.ratePercent),
      }),
      statTile({
        label: t('winRate.averageWin'),
        value: formatCurrency(language, rate.averageWin),
      }),
      // The core states the average loss as a positive size; the label carries
      // the direction, so it is shown unsigned rather than negated here.
      statTile({
        label: t('winRate.averageLoss'),
        value: formatCurrency(language, rate.averageLoss),
      }),
    ]),
    el('div', { class: 'table-scroll' }, [
      dataTable({
        columns: [t('winRate.closed'), t('winRate.wins'), t('winRate.losses'), t('winRate.breakEven')],
        numericFrom: 0,
        rows: [
          [
            formatInteger(language, rate.closed),
            formatInteger(language, rate.wins),
            formatInteger(language, rate.losses),
            formatInteger(language, rate.breakEven),
          ],
        ],
      }),
    ]),
  ]);
}

export function topFlopSection(context: ReportContext): HTMLElement | null {
  const { report, language, t } = context;

  // Ask for at most half the closed positions per side. Requesting five of each
  // from an account that closed three would list the same three securities
  // under both headings — the reader would count six positions where there are
  // three, and see the same security called both best and worst.
  const closed = winRate(report)?.closed ?? 0;
  const perSide = Math.min(RANK_COUNT, Math.floor(closed / 2));
  if (perSide === 0) return null;

  const { top, flop } = topAndFlop(report, perSide);

  const ranking = (title: string, entries: typeof top): HTMLElement =>
    el('div', { class: 'ranking' }, [
      el('h3', { class: 'figure__title' }, [title]),
      el('div', { class: 'table-scroll' }, [
        dataTable({
          columns: [
            t('securities.column.symbol'),
            t('securities.column.name'),
            t('securities.column.profit'),
          ],
          numericFrom: 2,
          rows: entries.map((entry) => [
            entry.symbol,
            entry.name,
            signedCell(language, entry.profit),
          ]),
        }),
      ]),
    ]);

  return section('top-flop', t('topFlop.heading'), [
    el('div', { class: 'rankings' }, [
      ranking(t('topFlop.top'), top),
      // The core lists only positions that actually lost, worst first: the eye
      // lands on the largest loss without reordering here, and an account where
      // nothing lost drops the heading rather than printing it over no rows.
      flop.length > 0 ? ranking(t('topFlop.flop'), flop) : false,
    ]),
  ]);
}

export function holdingSection(context: ReportContext): HTMLElement | null {
  const { report, language, t } = context;
  const holding = holdingDuration(report);
  if (!holding) return null;

  return section('holding', t('holding.heading'), [
    note(t('holding.note')),
    el('div', { class: 'tiles' }, [
      statTile({
        label: t('holding.mean'),
        value: daysLabel(t, language, holding.meanDays),
      }),
      statTile({
        label: t('holding.median'),
        value: daysLabel(t, language, holding.medianDays),
      }),
    ]),
    holding.byAssetClass.length === 0
      ? null
      : el('div', { class: 'table-scroll' }, [
          dataTable(
            {
              columns: [
                t('holding.column.assetClass'),
                t('holding.column.meanDays'),
                t('holding.column.closures'),
              ],
              numericFrom: 1,
              rows: holding.byAssetClass.map((row) => [
                assetClassLabel(t, row.assetClass),
                daysLabel(t, language, row.meanDays),
                formatInteger(language, row.closures),
              ]),
            },
            t('holding.byClass'),
          ),
        ]),
  ]);
}
