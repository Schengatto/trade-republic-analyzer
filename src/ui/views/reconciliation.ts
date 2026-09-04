/**
 * Spec §6.5 — the cash reconciliation, with its outcome stated in words.
 *
 * The status is carried by text and an icon as well as colour: whether the
 * report can be trusted is not something to encode in a hue alone.
 */

import { el } from '../dom';
import { amountList, note, section, type ReportContext } from './common';

export function reconciliationSection(context: ReportContext): HTMLElement {
  const { report, reconciliation, t } = context;
  const balanced = reconciliation.balanced;

  const verdict = el(
    'p',
    {
      class: `verdict ${balanced ? 'verdict--ok' : 'verdict--bad'}`,
      role: balanced ? undefined : 'alert',
    },
    [
      el('span', { class: 'verdict__mark', 'aria-hidden': 'true' }, [balanced ? '✓' : '✕']),
      el('span', {}, [balanced ? t('reconciliation.balanced') : t('reconciliation.unbalanced')]),
    ],
  );

  return section('reconciliation', t('reconciliation.heading'), [
    note(t('reconciliation.description')),
    verdict,
    amountList(context, [
      { label: t('reconciliation.expected'), value: reconciliation.expected, signed: true },
      { label: t('reconciliation.actual'), value: report.netProfit, signed: true },
      {
        label: t('reconciliation.difference'),
        value: reconciliation.difference,
        signed: true,
        emphasis: true,
      },
    ]),
    balanced ? null : note(t('reconciliation.unbalancedHint')),
  ]);
}
