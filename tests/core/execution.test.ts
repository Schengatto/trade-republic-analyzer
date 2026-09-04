import { describe, expect, it } from 'vitest';

import { calculate } from '../../src/core/fifo';
import { executionQuality, sales, HOLDING_BUCKETS, byHoldingBucket } from '../../src/core/execution';
import type { HoldingBucketKey } from '../../src/core/execution';
import { op } from '../helpers/operations';

describe('sales', () => {
  it('collapses every closure of one symbol on one day into a single sale', () => {
    const report = calculate([
      op('2024-01-01T09:00:00Z', 'TRADING', 'BUY', { shares: '10', amount: '-100' }),
      op('2024-06-01T09:00:00Z', 'TRADING', 'SELL', { shares: '-4', amount: '60' }),
      op('2024-06-01T15:00:00Z', 'TRADING', 'SELL', { shares: '-6', amount: '90' }),
    ]);

    const result = sales(report);

    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe('AAA');
    expect(result[0].soldAt).toBe('2024-06-01');
    expect(result[0].quantity.toString()).toBe('10');
    expect(result[0].cost.toString()).toBe('100');
    expect(result[0].proceeds.toString()).toBe('150');
    expect(result[0].profit.toString()).toBe('50');
    expect(result[0].yieldPercent?.toString()).toBe('50');
  });

  it('keeps two symbols sold on the same day apart', () => {
    const report = calculate([
      op('2024-01-01T09:00:00Z', 'TRADING', 'BUY', { shares: '1', amount: '-10' }),
      op('2024-01-01T09:00:00Z', 'TRADING', 'BUY', { shares: '1', amount: '-20', symbol: 'BBB' }),
      op('2024-06-01T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '15' }),
      op('2024-06-01T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '18', symbol: 'BBB' }),
    ]);

    expect(sales(report).map((sale) => sale.symbol)).toEqual(['AAA', 'BBB']);
  });

  it('weights the holding period by quantity, not by lot count', () => {
    // 10 shares held 90 days, 30 shares held 30 days: the simple mean is 60,
    // the honest one is 45.
    const report = calculate([
      op('2024-01-01T09:00:00Z', 'TRADING', 'BUY', { shares: '10', amount: '-100' }),
      op('2024-03-01T09:00:00Z', 'TRADING', 'BUY', { shares: '30', amount: '-300' }),
      op('2024-03-31T09:00:00Z', 'TRADING', 'SELL', { shares: '-40', amount: '500' }),
    ]);

    expect(sales(report)[0].meanDays).toBe(45);
  });

  it('leaves the yield undefined when the shares cost nothing', () => {
    const report = calculate([
      op('2024-01-01T09:00:00Z', 'FREE_LOTS', 'BONUS_ISSUE', { shares: '5', amount: '0' }),
      op('2024-06-01T09:00:00Z', 'TRADING', 'SELL', { shares: '-5', amount: '40' }),
    ]);

    const sale = sales(report)[0];
    expect(sale.cost.isZero()).toBe(true);
    expect(sale.profit.toString()).toBe('40');
    expect(sale.yieldPercent).toBeNull();
  });

  it('orders by sale day, then by symbol', () => {
    const report = calculate([
      op('2024-01-01T09:00:00Z', 'TRADING', 'BUY', { shares: '1', amount: '-10' }),
      op('2024-01-01T09:00:00Z', 'TRADING', 'BUY', { shares: '1', amount: '-10', symbol: 'BBB' }),
      op('2024-07-01T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '12', symbol: 'BBB' }),
      op('2024-06-01T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '12' }),
    ]);

    expect(sales(report).map((sale) => `${sale.soldAt} ${sale.symbol}`)).toEqual([
      '2024-06-01 AAA',
      '2024-07-01 BBB',
    ]);
  });

  it('has nothing to say about an account that never sold', () => {
    const report = calculate([
      op('2024-01-01T09:00:00Z', 'TRADING', 'BUY', { shares: '1', amount: '-10' }),
    ]);

    expect(sales(report)).toEqual([]);
  });
});

/** Two winners (+50, +20) and two losers (-30, -10) on four distinct days. */
function mixedAccount() {
  return calculate([
    op('2024-01-01T09:00:00Z', 'TRADING', 'BUY', { shares: '1', amount: '-100' }),
    op('2024-01-02T09:00:00Z', 'TRADING', 'BUY', { shares: '1', amount: '-100', symbol: 'BBB' }),
    op('2024-01-03T09:00:00Z', 'TRADING', 'BUY', { shares: '1', amount: '-100', symbol: 'CCC' }),
    op('2024-01-04T09:00:00Z', 'TRADING', 'BUY', { shares: '1', amount: '-100', symbol: 'DDD' }),
    op('2024-03-01T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '150' }),
    op('2024-03-02T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '120', symbol: 'BBB' }),
    op('2024-03-03T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '70', symbol: 'CCC' }),
    op('2024-03-04T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '90', symbol: 'DDD' }),
  ]);
}

describe('executionQuality', () => {
  it('counts the sides and the share in profit', () => {
    const quality = executionQuality(sales(mixedAccount()));

    expect(quality?.count).toBe(4);
    expect(quality?.wins).toBe(2);
    expect(quality?.losses).toBe(2);
    expect(quality?.breakEven).toBe(0);
    expect(quality?.winPercent.toString()).toBe('50');
  });

  it('divides what was won by what was lost', () => {
    // (50 + 20) / (30 + 10) = 1.75
    expect(executionQuality(sales(mixedAccount()))?.profitFactor?.toString()).toBe('1.75');
  });

  it('averages the profit over the sales, not over the securities', () => {
    // (50 + 20 - 30 - 10) / 4 = 7.5
    expect(executionQuality(sales(mixedAccount()))?.meanProfit.toString()).toBe('7.5');
  });

  it('signs the average loss so it can share a column with the average win', () => {
    const quality = executionQuality(sales(mixedAccount()));

    expect(quality?.averageWin?.toString()).toBe('35');
    expect(quality?.averageLoss?.toString()).toBe('-20');
  });

  it('counts a sale that broke even on neither side', () => {
    const report = calculate([
      op('2024-01-01T09:00:00Z', 'TRADING', 'BUY', { shares: '1', amount: '-100' }),
      op('2024-03-01T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '100' }),
    ]);
    const quality = executionQuality(sales(report));

    expect(quality?.wins).toBe(0);
    expect(quality?.losses).toBe(0);
    expect(quality?.breakEven).toBe(1);
    expect(quality?.winPercent.toString()).toBe('0');
  });

  it('leaves the profit factor undefined when nothing was lost', () => {
    const report = calculate([
      op('2024-01-01T09:00:00Z', 'TRADING', 'BUY', { shares: '1', amount: '-100' }),
      op('2024-03-01T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '150' }),
    ]);
    const quality = executionQuality(sales(report));

    // Not Infinity and not a very large number: with no losses the ratio has
    // no value, and printing one would invent a comparison.
    expect(quality?.profitFactor).toBeNull();
    expect(quality?.averageLoss).toBeNull();
    expect(quality?.meanDaysLosers).toBeNull();
  });

  it('reports each side its own holding period', () => {
    // AAA won after 60 days, BBB lost after 30.
    const report = calculate([
      op('2024-01-01T09:00:00Z', 'TRADING', 'BUY', { shares: '1', amount: '-100' }),
      op('2024-01-01T09:00:00Z', 'TRADING', 'BUY', { shares: '1', amount: '-100', symbol: 'BBB' }),
      op('2024-03-01T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '150' }),
      op('2024-01-31T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '80', symbol: 'BBB' }),
    ]);
    const quality = executionQuality(sales(report));

    expect(quality?.meanDaysWinners).toBe(60);
    expect(quality?.meanDaysLosers).toBe(30);
  });

  it('says nothing about concentration until there are more than three losses', () => {
    expect(executionQuality(sales(mixedAccount()))?.lossConcentration).toBeNull();
  });

  it('still says nothing when there are exactly three losses', () => {
    // The boundary the guard turns on. With three losers the worst three are
    // all of them, so the sentence would read "the three worst carry 100% of
    // the loss" — true of any three-loss account, and therefore about nothing.
    const report = calculate([
      ...['AAA', 'BBB', 'CCC'].map((symbol) =>
        op('2024-01-01T09:00:00Z', 'TRADING', 'BUY', { shares: '1', amount: '-200', symbol }),
      ),
      op('2024-03-01T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '100', symbol: 'AAA' }),
      op('2024-03-02T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '150', symbol: 'BBB' }),
      op('2024-03-03T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '170', symbol: 'CCC' }),
    ]);
    const quality = executionQuality(sales(report));

    // Pinned so the null below cannot pass for the wrong reason.
    expect(quality?.losses).toBe(3);
    expect(quality?.lossConcentration).toBeNull();
  });

  it('measures how much of the loss the three worst sales carry', () => {
    // -100, -50, -30, -20: the worst three are 180 of 200 = 90%.
    const report = calculate([
      ...['AAA', 'BBB', 'CCC', 'DDD'].map((symbol) =>
        op('2024-01-01T09:00:00Z', 'TRADING', 'BUY', { shares: '1', amount: '-200', symbol }),
      ),
      op('2024-03-01T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '100', symbol: 'AAA' }),
      op('2024-03-02T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '150', symbol: 'BBB' }),
      op('2024-03-03T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '170', symbol: 'CCC' }),
      op('2024-03-04T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '180', symbol: 'DDD' }),
    ]);

    expect(executionQuality(sales(report))?.lossConcentration?.toString()).toBe('90');
  });

  it('has nothing to report about an account that never sold', () => {
    const report = calculate([
      op('2024-01-01T09:00:00Z', 'TRADING', 'BUY', { shares: '1', amount: '-10' }),
    ]);

    expect(executionQuality(sales(report))).toBeNull();
  });

  it('judges only the sales it is handed', () => {
    const report = calculate([
      op('2024-01-01T09:00:00Z', 'TRADING', 'BUY', { shares: '1', amount: '-10' }),
      op('2024-01-01T09:00:00Z', 'TRADING', 'BUY', { shares: '1', amount: '-10', symbol: 'BBB' }),
      op('2024-06-01T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '15' }),
      op('2024-07-01T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '5', symbol: 'BBB' }),
    ]);

    const group = sales(report);
    expect(executionQuality(group)!.count).toBe(2);

    // Il sottoinsieme: la sola vendita in utile, e nient'altro.
    const june = group.filter((sale) => sale.soldAt === '2024-06-01');
    const quality = executionQuality(june)!;
    expect(quality.count).toBe(1);
    expect(quality.wins).toBe(1);
    expect(quality.losses).toBe(0);
    expect(quality.winPercent.toString()).toBe('100');
  });

  it('has no verdict on an empty group', () => {
    expect(executionQuality([])).toBeNull();
  });
});

/** One sale of `symbol`, bought on 2024-01-01 and sold on `soldAt`. */
function heldUntil(symbol: string, soldAt: string, proceeds: string) {
  return [
    op('2024-01-01T09:00:00Z', 'TRADING', 'BUY', { shares: '1', amount: '-100', symbol }),
    op(`${soldAt}T09:00:00Z`, 'TRADING', 'SELL', { shares: '-1', amount: proceeds, symbol }),
  ];
}

describe('byHoldingBucket', () => {
  it('always returns all four bands, in order', () => {
    const buckets = byHoldingBucket(sales(calculate(heldUntil('AAA', '2024-06-01', '110'))));

    expect(buckets.map((bucket) => bucket.key)).toEqual([...HOLDING_BUCKETS]);
  });

  it('leaves an empty band without a yield rather than at zero', () => {
    const buckets = byHoldingBucket(sales(calculate(heldUntil('AAA', '2024-06-01', '110'))));
    const empty = buckets.find((bucket) => bucket.key === 'UNDER_1M');

    expect(empty?.sales).toBe(0);
    expect(empty?.profit.isZero()).toBe(true);
    // A band nobody traded in did not return 0%: it returned nothing.
    expect(empty?.yieldPercent).toBeNull();
  });

  it('puts each sale on the right side of every boundary', () => {
    const cases: ReadonlyArray<readonly [string, HoldingBucketKey]> = [
      ['2024-01-30', 'UNDER_1M'],  // 29 days
      ['2024-01-31', 'M1_TO_M6'],  // 30 days
      ['2024-07-01', 'M1_TO_M6'],  // 182 days
      ['2024-07-02', 'M6_TO_M12'], // 183 days
      ['2024-12-30', 'M6_TO_M12'], // 364 days
      ['2024-12-31', 'OVER_1Y'],   // 365 days
    ];

    for (const [soldAt, expected] of cases) {
      const buckets = byHoldingBucket(sales(calculate(heldUntil('AAA', soldAt, '110'))));
      const occupied = buckets.filter((bucket) => bucket.sales > 0).map((bucket) => bucket.key);
      expect(occupied, `sold on ${soldAt}`).toEqual([expected]);
    }
  });

  it('aggregates a band rather than averaging its percentages', () => {
    // +50 on 100 and -10 on 900: aggregate 40/1000 = 4%, where the mean of the
    // two percentages would be a flattering 24.44%.
    const report = calculate([
      op('2024-01-01T09:00:00Z', 'TRADING', 'BUY', { shares: '1', amount: '-100' }),
      op('2024-01-01T09:00:00Z', 'TRADING', 'BUY', { shares: '1', amount: '-900', symbol: 'BBB' }),
      op('2024-06-01T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '150' }),
      op('2024-06-02T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '890', symbol: 'BBB' }),
    ]);
    const band = byHoldingBucket(sales(report)).find((bucket) => bucket.key === 'M1_TO_M6');

    expect(band?.sales).toBe(2);
    expect(band?.profit.toString()).toBe('40');
    expect(band?.yieldPercent?.toString()).toBe('4');
  });

  it('keeps a free lot in its band without inventing a yield', () => {
    const report = calculate([
      op('2024-01-01T09:00:00Z', 'FREE_LOTS', 'BONUS_ISSUE', { shares: '5', amount: '0' }),
      op('2024-06-01T09:00:00Z', 'TRADING', 'SELL', { shares: '-5', amount: '40' }),
    ]);
    const band = byHoldingBucket(sales(report)).find((bucket) => bucket.key === 'M1_TO_M6');

    expect(band?.sales).toBe(1);
    expect(band?.profit.toString()).toBe('40');
    expect(band?.yieldPercent).toBeNull();
  });
});
