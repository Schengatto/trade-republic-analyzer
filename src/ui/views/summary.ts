/** Spec §6.1 — the four headline figures. */

import { returnOnCapital, windowSummaries } from '../../core/analytics';
import { el } from '../dom';
import { formatCurrency, formatDate, formatInteger, formatPercent, formatSignedCurrency } from '../format';
import { section, statTile, type ReportContext } from './common';

export function summarySection(context: ReportContext): HTMLElement {
  const { report, language, t } = context;
  const wholePeriod = windowSummaries(context.operations, report)[0];
  const percent = returnOnCapital(report);

  const capitalHint = percent
    ? t('summary.returnPercent', { value: formatPercent(language, percent) })
    : t('summary.returnUnavailable');

  return section('summary', t('summary.heading'), [
    el('p', { class: 'section__meta' }, [
      t('summary.operationsRead', { count: formatInteger(language, report.operationsRead) }),
      wholePeriod
        ? ` · ${t('summary.period', {
            from: formatDate(language, wholePeriod.from),
            to: formatDate(language, wholePeriod.to),
          })}`
        : '',
    ]),
    el('div', { class: 'tiles' }, [
      statTile({
        label: t('summary.netProfit'),
        value: formatSignedCurrency(language, report.netProfit),
        hint: t('summary.netProfit.hint'),
        signed: report.netProfit,
      }),
      statTile({
        label: t('summary.tradingProfit'),
        value: formatSignedCurrency(language, report.tradingProfit),
        hint: t('summary.tradingProfit.hint'),
        signed: report.tradingProfit,
      }),
      statTile({
        label: t('summary.totalCharges'),
        value: formatCurrency(language, report.totalCharges),
        hint: t('summary.totalCharges.hint'),
      }),
      statTile({
        label: t('summary.netCapital'),
        value: formatCurrency(language, report.netCapitalPaidIn),
        hint: capitalHint,
      }),
    ]),
    // The one section that answers the question the reader opened the file
    // with. The other thirteen are the working behind it.
  ], 'lead');
}
