/**
 * Spec §7.1 — performance by time window.
 *
 * A window with no profit movement says so in words. Printing 0,00 there would
 * read as "broke even", when what actually happened is that nothing closed.
 *
 * The composition below the totals is a table and not a stacked bar, unlike
 * the monthly one, because the windows are nested: 1D is inside 1W is inside
 * 1M, all of them ending on the anchor. Seven bars side by side is the grammar
 * of comparing disjoint periods, and on a shared scale the whole-file bar
 * would leave the shorter ones as slivers anyway.
 */

import {
  anchorDate,
  windowSummaries,
  type WindowKey,
  type WindowSummary,
} from '../../core/analytics';
import { dataTable } from '../chart/figure';
import type { Cell } from '../chart/figure';
import { el } from '../dom';
import { formatCurrency, formatDate, formatInteger } from '../format';
import type { MessageKey } from '../i18n';
import { NOTHING, deductionCell, note, section, signedCell, type ReportContext } from './common';

export function windowsSection(context: ReportContext): HTMLElement {
  const { report, operations, language, t } = context;
  const summaries = windowSummaries(operations, report);
  const anchor = anchorDate(operations);

  return section('windows', t('windows.heading'), [
    anchor ? note(t('windows.anchorNote', { anchor: formatDate(language, anchor) })) : null,
    el('div', { class: 'table-scroll' }, [
      dataTable({
        columns: [
          t('windows.column.window'),
          t('windows.column.range'),
          t('windows.column.profit'),
          t('windows.column.buys'),
          t('windows.column.sells'),
          t('windows.column.netDeposits'),
          t('windows.column.operations'),
        ],
        numericFrom: 2,
        rows: summaries.map((summary) => [
          t(`window.${summary.key}` as MessageKey),
          `${formatDate(language, summary.from)} – ${formatDate(language, summary.to)}`,
          profitCell(context, summary),
          formatCurrency(language, summary.buys),
          formatCurrency(language, summary.sells),
          signedCell(language, summary.netDeposits),
          formatInteger(language, summary.operations),
        ]),
      }),
    ]),
    el('h3', { class: 'subheading' }, [t('windows.composition.heading')]),
    note(t('windows.composition.note')),
    el('div', { class: 'table-scroll' }, [
      dataTable({
        columns: [
          t('windows.column.window'),
          t('profitPart.trading'),
          t('profitPart.dividends'),
          t('profitPart.interest'),
          t('profitPart.otherIncome'),
          t('profitPart.charges'),
        ],
        numericFrom: 1,
        // No total column: it would be the same `profitCell` the table above
        // already prints, and it is the algebraic sum of the five beside it.
        rows: summaries.map((summary) => [
          t(`window.${summary.key}` as MessageKey),
          ...partCells(context, summary),
        ]),
      }),
    ]),
  ]);
}

/** The same cell in both tables, so the two can never state different profits. */
function profitCell({ language, t }: ReportContext, summary: WindowSummary): Cell {
  return summary.empty ? t('windows.noMovement') : signedCell(language, summary.profit);
}

/**
 * Five zeroes in a window where nothing moved would read as "broke even", the
 * same misreading the totals table avoids with words. There is nothing to
 * break down, so the row says nothing.
 */
function partCells({ language }: ReportContext, summary: WindowSummary): Cell[] {
  if (summary.empty) return [NOTHING, NOTHING, NOTHING, NOTHING, NOTHING];
  const { trading, dividends, interest, otherIncome, charges } = summary.components;
  return [
    signedCell(language, trading),
    signedCell(language, dividends),
    signedCell(language, interest),
    signedCell(language, otherIncome),
    // A charge is stored as a positive size; in a row that also holds the total
    // it was taken out of, printing it unsigned makes the row fail to add up.
    deductionCell(language, charges),
  ];
}

/** Exported for the tests, which assert every window key has a label. */
export const WINDOW_LABEL_KEYS: WindowKey[] = ['ALL', '1Y', '6M', '3M', '1M', '1W', '1D'];
