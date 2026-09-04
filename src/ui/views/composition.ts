/** Spec §6.3 — how the net profit is made up. */

import { costDrag, winRate } from '../../core/analytics';
import { el } from '../dom';
import { formatInteger } from '../format';
import { amountList, humanizeType, section, type ReportContext } from './common';

export function compositionSection(context: ReportContext): HTMLElement {
  const { report, language, t } = context;
  const rate = winRate(report);

  const counts = el('div', { class: 'tiles tiles--compact' }, [
    countTile(t('composition.securitiesInProfit'), rate?.wins ?? 0, language),
    countTile(t('composition.securitiesInLoss'), rate?.losses ?? 0, language),
    countTile(t('composition.securitiesBreakEven'), rate?.breakEven ?? 0, language),
  ]);

  const income = Object.entries(report.income).sort((a, b) => b[1].comparedTo(a[1]));
  const taxes = Object.entries(report.taxes).sort((a, b) => b[1].comparedTo(a[1]));

  return section('composition', t('composition.heading'), [
    counts,
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

function countTile(label: string, count: number, language: ReportContext['language']): HTMLElement {
  return el('div', { class: 'tile' }, [
    el('p', { class: 'tile__label' }, [label]),
    el('p', { class: 'tile__value' }, [formatInteger(language, count)]),
  ]);
}
