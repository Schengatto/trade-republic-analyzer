/**
 * Spec §6.4 — cash movements that are deliberately not profit.
 *
 * The note is not decoration. Without it the natural reading of a large
 * deposits figure is "I made this much", which is the single most likely
 * misreading of the whole report.
 */

import { amountList, note, section, type ReportContext } from './common';

export function excludedSection(context: ReportContext): HTMLElement {
  const { report, t } = context;

  return section('excluded', t('excluded.heading'), [
    note(t('excluded.note')),
    amountList(context, [
      { label: t('excluded.deposits'), value: report.deposits },
      { label: t('excluded.withdrawals'), value: report.withdrawals },
      { label: t('excluded.netCapital'), value: report.netCapitalPaidIn, emphasis: true },
      { label: t('excluded.cardSpending'), value: report.cardSpending },
      { label: t('excluded.openPositionsCost'), value: report.openPositionsCost },
    ]),
  ]);
}
