/** Spec §6.3 — how the net profit is made up. */

import { costDrag } from '../../core/analytics';
import { el } from '../dom';
import { amountList, humanizeType, section, type ReportContext } from './common';

export function compositionSection(context: ReportContext): HTMLElement {
  const { report, t } = context;

  const income = Object.entries(report.income).sort((a, b) => b[1].comparedTo(a[1]));
  const taxes = Object.entries(report.taxes).sort((a, b) => b[1].comparedTo(a[1]));

  return section('composition', t('composition.heading'), [
    amountList(context, [
      { label: t('composition.grossProfit'), value: report.grossProfit, signed: true },
    ]),

    el('h3', { class: 'subheading' }, [t('composition.income')]),
    // Income is already inside the gross profit above — `grossProfit` is
    // `tradingProfit.plus(totalIncome)`. Left unsigned and said out loud, so it
    // is not read as a fourth term to be added on.
    el('p', { class: 'note' }, [t('composition.incomeNote')]),
    income.length > 0
      ? amountList(
          context,
          income.map(([type, amount]) => ({ label: humanizeType(type), value: amount })),
        )
      : el('p', { class: 'note' }, [t('composition.none')]),

    // The heading repeats the row's own label, because there is only ever one
    // fee row. Kept anyway: dropping it leaves the row sitting under "Income by
    // type", which is a worse misreading than a word said twice.
    el('h3', { class: 'subheading' }, [t('composition.fees')]),
    // The share sits under the sum it was taken from. `costDrag` is null unless
    // the gross profit is positive, and that null must stay a dash: a share of
    // a loss carries the sign of the base rather than the size of the drag.
    amountList(context, [
      { label: t('composition.fees'), value: report.fees, deduction: true },
      { label: t('composition.costDrag'), rate: costDrag(report) },
    ]),

    el('h3', { class: 'subheading' }, [t('composition.taxes')]),
    taxes.length > 0
      ? amountList(
          context,
          taxes.map(([type, amount]) => ({
            label: humanizeType(type),
            value: amount,
            deduction: true,
          })),
        )
      : el('p', { class: 'note' }, [t('composition.none')]),

    el('hr', { class: 'rule' }),
    amountList(context, [
      { label: t('composition.netProfit'), value: report.netProfit, signed: true, emphasis: true },
    ]),
  ]);
}
