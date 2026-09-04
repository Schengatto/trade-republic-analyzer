/*
 * Trading quality — how the account traded, judged one sale at a time.
 *
 * Every number here arrives already computed from `src/core/execution.ts`:
 * this file chooses words, order and colour, and does no arithmetic.
 */

import { HOLDING_BUCKETS, byHoldingBucket, executionQuality, sales } from '../../core/execution';
import type { HoldingBucketKey } from '../../core/execution';
import type { Decimal } from '../../core/money';
import { dataTable } from '../chart/figure';
import type { Cell } from '../chart/figure';
import { el } from '../dom';
import { formatCurrency, formatInteger, formatPercent, formatRatio } from '../format';
import type { MessageKey } from '../i18n';
import {
  NOTHING,
  daysLabel,
  note,
  section,
  signedCell,
  signedPercentCell,
  statTile,
} from './common';
import type { ReportContext, SectionView } from './common';

/*
 * Spelled out rather than built with a template literal: a sweep for unused
 * message keys greps for the literal string, and a computed key is invisible
 * to it.
 */
const BUCKET_LABELS: Record<HoldingBucketKey, MessageKey> = {
  UNDER_1M: 'execution.bucket.UNDER_1M',
  M1_TO_M6: 'execution.bucket.M1_TO_M6',
  M6_TO_M12: 'execution.bucket.M6_TO_M12',
  OVER_1Y: 'execution.bucket.OVER_1Y',
};

export const executionSection: SectionView = ({ report, language, t }: ReportContext) => {
  // Un solo raggruppamento, letto due volte: la qualità e le fasce di durata
  // devono parlare esattamente delle stesse vendite.
  const group = sales(report);
  const quality = executionQuality(group);
  if (quality === null) return null;

  const buckets = byHoldingBucket(group);

  const sideRow = (
    label: MessageKey,
    count: number,
    meanProfit: Decimal | null,
    meanDays: number | null,
  ): Cell[] => [
    t(label),
    formatInteger(language, count),
    meanProfit === null ? NOTHING : signedCell(language, meanProfit),
    meanDays === null ? NOTHING : daysLabel(t, language, meanDays),
  ];

  return section('execution', t('execution.heading'), [
    note(t('execution.caution')),
    el('div', { class: 'tiles' }, [
      statTile({ label: t('execution.sales'), value: formatInteger(language, quality.count) }),
      statTile({
        label: t('execution.winShare'),
        value: formatPercent(language, quality.winPercent),
      }),
      statTile({
        label: t('execution.profitFactor'),
        value: quality.profitFactor === null ? NOTHING : formatRatio(language, quality.profitFactor),
        ...(quality.profitFactor === null ? { hint: t('execution.profitFactorHint') } : {}),
      }),
      statTile({
        label: t('execution.meanProfit'),
        value: formatCurrency(language, quality.meanProfit),
        signed: quality.meanProfit,
      }),
    ]),
    el('div', { class: 'table-scroll' }, [
      dataTable({
        columns: [
          t('execution.column.side'),
          t('execution.column.sales'),
          t('execution.column.meanProfit'),
          t('execution.column.meanDays'),
        ],
        numericFrom: 1,
        rows: [
          sideRow('execution.winners', quality.wins, quality.averageWin, quality.meanDaysWinners),
          sideRow('execution.losers', quality.losses, quality.averageLoss, quality.meanDaysLosers),
        ],
      }),
    ]),
    el('h3', { class: 'subheading' }, [t('execution.byHolding')]),
    el('div', { class: 'table-scroll' }, [
      dataTable({
        columns: [
          t('execution.column.bucket'),
          t('execution.column.sales'),
          t('execution.column.profit'),
          t('execution.column.yield'),
        ],
        numericFrom: 1,
        rows: HOLDING_BUCKETS.map((key) => {
          const bucket = buckets.find((candidate) => candidate.key === key)!;
          return [
            t(BUCKET_LABELS[key]),
            formatInteger(language, bucket.sales),
            // A band nobody traded in has no result: `0,00 €` would read as one.
            bucket.sales === 0 ? NOTHING : signedCell(language, bucket.profit),
            signedPercentCell(language, bucket.yieldPercent),
          ];
        }),
      }),
    ]),
    quality.lossConcentration !== null &&
      note(
        t('execution.concentration', {
          percent: formatPercent(language, quality.lossConcentration),
        }),
      ),
  ]);
};
