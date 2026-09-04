/*
 * Trading quality, measured on the sale.
 *
 * A FIFO closure is a lot, not a decision: selling 40 shares that arrived in
 * three tranches produces three closures, and counting those as three trades
 * inflates every count and every average. The unit here is the sale — one
 * symbol, one day — which is as close as this data gets to the thing the
 * account holder actually did.
 *
 * This lives apart from `analytics.ts` because that file already answers
 * seven unrelated questions.
 */

import { daysBetween } from './dates';
import { Decimal, ZERO } from './money';
import type { Report } from './fifo';

export interface Sale {
  symbol: string;
  assetClass: string;
  soldAt: string;
  quantity: Decimal;
  cost: Decimal;
  proceeds: Decimal;
  profit: Decimal;
  /** Null when the shares cost nothing: a return on zero is not a large one. */
  yieldPercent: Decimal | null;
  /** Weighted by quantity — weighting by cost would erase a free lot. */
  meanDays: number;
}

interface Accumulator {
  symbol: string;
  assetClass: string;
  soldAt: string;
  quantity: Decimal;
  cost: Decimal;
  proceeds: Decimal;
  weightedDays: Decimal;
}

export function sales(report: Report): Sale[] {
  const groups = new Map<string, Accumulator>();

  for (const closure of report.closures) {
    // A separator no symbol can contain, so two different pairs cannot
    // collide into a single key.
    const key = `${closure.soldAt}\u0000${closure.symbol}`;
    const group = groups.get(key) ?? {
      symbol: closure.symbol,
      assetClass: closure.assetClass,
      soldAt: closure.soldAt,
      quantity: ZERO,
      cost: ZERO,
      proceeds: ZERO,
      weightedDays: ZERO,
    };

    const days = daysBetween(closure.acquiredAt, closure.soldAt);
    group.quantity = group.quantity.plus(closure.quantity);
    group.cost = group.cost.plus(closure.cost);
    group.proceeds = group.proceeds.plus(closure.proceeds);
    group.weightedDays = group.weightedDays.plus(closure.quantity.times(days));
    groups.set(key, group);
  }

  return [...groups.values()]
    .map((group) => ({
      symbol: group.symbol,
      assetClass: group.assetClass,
      soldAt: group.soldAt,
      quantity: group.quantity,
      cost: group.cost,
      proceeds: group.proceeds,
      profit: group.proceeds.minus(group.cost),
      yieldPercent: group.cost.isZero()
        ? null
        : group.proceeds.minus(group.cost).div(group.cost).times(100),
      meanDays: group.quantity.isZero()
        ? 0
        : Math.round(group.weightedDays.div(group.quantity).toNumber()),
    }))
    .sort((a, b) => (a.soldAt === b.soldAt ? a.symbol.localeCompare(b.symbol) : a.soldAt.localeCompare(b.soldAt)));
}

/** Below this many losses, "the three worst" is most of them and says nothing. */
const CONCENTRATION_COUNT = 3;

export interface ExecutionQuality {
  count: number;
  wins: number;
  losses: number;
  breakEven: number;
  winPercent: Decimal;
  profitFactor: Decimal | null;
  meanProfit: Decimal;
  averageWin: Decimal | null;
  averageLoss: Decimal | null;
  meanDaysWinners: number | null;
  meanDaysLosers: number | null;
  lossConcentration: Decimal | null;
}

export function executionQuality(group: readonly Sale[]): ExecutionQuality | null {
  if (group.length === 0) return null;

  const winners = group.filter((sale) => sale.profit.greaterThan(0));
  const losers = group.filter((sale) => sale.profit.lessThan(0));

  const totalWon = winners.reduce((sum, sale) => sum.plus(sale.profit), ZERO);
  const totalLost = losers.reduce((sum, sale) => sum.plus(sale.profit), ZERO);
  const total = group.reduce((sum, sale) => sum.plus(sale.profit), ZERO);

  const worst = [...losers]
    .sort((a, b) => a.profit.comparedTo(b.profit))
    .slice(0, CONCENTRATION_COUNT)
    .reduce((sum, sale) => sum.plus(sale.profit), ZERO);

  return {
    count: group.length,
    wins: winners.length,
    losses: losers.length,
    breakEven: group.length - winners.length - losers.length,
    winPercent: new Decimal(winners.length).div(group.length).times(100),
    // No losses is not an infinite ratio, it is an undefined one.
    profitFactor: totalLost.isZero() ? null : totalWon.div(totalLost.abs()),
    meanProfit: total.div(group.length),
    averageWin: winners.length === 0 ? null : totalWon.div(winners.length),
    // Negative: this shares a column with averageWin, and the view is not
    // allowed to flip a sign.
    averageLoss: losers.length === 0 ? null : totalLost.div(losers.length),
    meanDaysWinners: meanDays(winners),
    meanDaysLosers: meanDays(losers),
    lossConcentration:
      losers.length <= CONCENTRATION_COUNT || totalLost.isZero()
        ? null
        : worst.div(totalLost).times(100),
  };
}

function meanDays(group: readonly Sale[]): number | null {
  if (group.length === 0) return null;
  return Math.round(group.reduce((sum, sale) => sum + sale.meanDays, 0) / group.length);
}

export type HoldingBucketKey = 'UNDER_1M' | 'M1_TO_M6' | 'M6_TO_M12' | 'OVER_1Y';

export const HOLDING_BUCKETS: readonly HoldingBucketKey[] = [
  'UNDER_1M',
  'M1_TO_M6',
  'M6_TO_M12',
  'OVER_1Y',
];

export interface HoldingBucket {
  key: HoldingBucketKey;
  sales: number;
  profit: Decimal;
  /** Aggregate: sum of profits over sum of costs. Null when the costs are zero. */
  yieldPercent: Decimal | null;
}

function bucketOf(days: number): HoldingBucketKey {
  if (days < 30) return 'UNDER_1M';
  if (days < 183) return 'M1_TO_M6';
  if (days < 365) return 'M6_TO_M12';
  return 'OVER_1Y';
}

/*
 * All four bands come back whether or not anything landed in them: a band the
 * account never traded in is itself a fact about the account, and a table that
 * grows and shrinks row by row is harder to read than one that does not.
 */
export function byHoldingBucket(group: readonly Sale[]): HoldingBucket[] {
  return HOLDING_BUCKETS.map((key) => {
    const inBand = group.filter((sale) => bucketOf(sale.meanDays) === key);
    const profit = inBand.reduce((sum, sale) => sum.plus(sale.profit), ZERO);
    const cost = inBand.reduce((sum, sale) => sum.plus(sale.cost), ZERO);

    return {
      key,
      sales: inBand.length,
      profit,
      // Aggregate, not the mean of the per-sale percentages: a 200% gain on
      // 50 euro would otherwise outvote a 5% loss on 50,000.
      yieldPercent: cost.isZero() ? null : profit.div(cost).times(100),
    };
  });
}
