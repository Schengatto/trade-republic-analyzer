/** Spec §6.1 — the headline figures. */

import { returnOnCapital, windowSummaries } from '../../core/analytics';
import { MIN_IRR_DAYS, annualReturn } from '../../core/irr';
import { el } from '../dom';
import { formatCurrency, formatDate, formatInteger, formatPercent, formatSignedCurrency } from '../format';
import { NOTHING, section, statTile, type ReportContext } from './common';

export function summarySection(context: ReportContext): HTMLElement {
  const { report, language, t } = context;
  const wholePeriod = windowSummaries(context.operations, report)[0];
  const percent = returnOnCapital(report);
  const annual = annualReturn(context.operations, report);

  // The return is a headline figure, not a footnote under the capital: a reader
  // who sees a percentage assumes a year, so the tile has to name the period it
  // actually covers. Its annual companion is the tile beside it, and it is an
  // internal rate of return rather than this figure divided by the years: the
  // capital was paid in progressively, so there is no single base to divide.
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
      statTile({
        label: t('summary.annualReturn'),
        value: annual === null ? NOTHING : formatPercent(language, annual),
        hint:
          annual === null
            ? t('summary.annualReturn.unavailable', {
                days: formatInteger(language, MIN_IRR_DAYS),
              })
            : t('summary.annualReturn.hint'),
        // Omesso nel ramo nullo, o il trattino prenderebbe un colore.
        ...(annual === null ? {} : { signed: annual }),
      }),
    ]),
    // The one section that answers the question the reader opened the file
    // with. The other thirteen are the working behind it.
  ], 'lead');
}
