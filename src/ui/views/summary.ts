/** Spec §6.1 — the five headline figures. */

import { returnOnCapital, windowSummaries } from '../../core/analytics';
import { el } from '../dom';
import { formatCurrency, formatDate, formatInteger, formatPercent, formatSignedCurrency } from '../format';
import { NOTHING, section, statTile, type ReportContext } from './common';

export function summarySection(context: ReportContext): HTMLElement {
  const { report, language, t } = context;
  const wholePeriod = windowSummaries(context.operations, report)[0];
  const percent = returnOnCapital(report);

  // The return is a headline figure, not a footnote under the capital: a reader
  // who sees a percentage assumes a year, so the tile has to name the period it
  // actually covers. There is no annualised version, and deliberately so — the
  // capital was paid in progressively, so scaling the result to twelve months
  // would divide by a base that was never there for twelve months.
  const returnHint =
    percent === null
      ? t('summary.returnUnavailable')
      : wholePeriod
        ? t('summary.return.hint', {
            from: formatDate(language, wholePeriod.from),
            to: formatDate(language, wholePeriod.to),
          })
        : '';

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
        hint: t('summary.netCapital.hint'),
      }),
      statTile({
        label: t('summary.return'),
        value: percent === null ? NOTHING : formatPercent(language, percent),
        ...(returnHint === '' ? {} : { hint: returnHint }),
        ...(percent === null ? {} : { signed: percent }),
      }),
    ]),
    // The one section that answers the question the reader opened the file
    // with. The other thirteen are the working behind it.
  ], 'lead');
}
