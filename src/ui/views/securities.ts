/** Spec §6.6 and §6.7 — per-security detail, and the positions still open. */

import { securityDetails } from '../../core/analytics';
import type { SecurityResult } from '../../core/fifo';
import { dataTable } from '../chart/figure';
import { el } from '../dom';
import { formatCurrency, formatInteger, formatQuantity } from '../format';
import {
  NOTHING,
  daysLabel,
  note,
  section,
  signedCell,
  signedPercentCell,
  type ReportContext,
} from './common';

export function securitiesSection(context: ReportContext): HTMLElement {
  const { report, language, t } = context;

  // The three columns after the profit are attributes of the trade, not parts
  // of it: ranking by profit alone cannot separate a big position from a good
  // one, nor one clean trade from thirty scalps.
  const closed = securityDetails(report);

  return section('securities', t('securities.heading'), [
    note(t('securities.description')),
    closed.length === 0
      ? el('p', { class: 'note' }, [t('securities.none')])
      : el('div', { class: 'table-scroll table-scroll--tall' }, [
          dataTable({
            columns: [
              t('securities.column.symbol'),
              t('securities.column.name'),
              t('securities.column.proceeds'),
              t('securities.column.cost'),
              t('securities.column.profit'),
              t('securities.column.yield'),
              t('securities.column.lots'),
              t('securities.column.meanDays'),
            ],
            numericFrom: 2,
            rows: closed.map((detail) => [
              detail.symbol,
              detail.name,
              formatCurrency(language, detail.proceeds),
              formatCurrency(language, detail.costOfSold),
              signedCell(language, detail.profit),
              signedPercentCell(language, detail.yieldPercent),
              // A count is a size, so it stays uncoloured.
              formatInteger(language, detail.lotsClosed),
              detail.meanDays === null ? NOTHING : daysLabel(t, language, detail.meanDays),
            ]),
          }),
        ]),
  ]);
}

export function openPositionsSection(context: ReportContext): HTMLElement {
  const { report, language, t } = context;

  const open = Object.values(report.bySecurity)
    .filter((security: SecurityResult) => !security.remainingQuantity.isZero())
    .sort((a, b) => b.remainingCost.comparedTo(a.remainingCost));

  return section('open-positions', t('openPositions.heading'), [
    note(t('openPositions.note')),
    open.length === 0
      ? el('p', { class: 'note' }, [t('openPositions.none')])
      : el('div', { class: 'table-scroll table-scroll--tall' }, [
          dataTable({
            columns: [
              t('securities.column.symbol'),
              t('securities.column.name'),
              t('openPositions.column.quantity'),
              t('openPositions.column.cost'),
            ],
            numericFrom: 2,
            rows: open.map((security) => [
              security.symbol,
              security.name,
              formatQuantity(language, security.remainingQuantity),
              formatCurrency(language, security.remainingCost),
            ]),
          }),
        ]),
  ]);
}
