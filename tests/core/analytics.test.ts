import { describe, expect, it } from 'vitest';
import { calculate } from '../../src/core/fifo';
import {
  WINDOW_KEYS,
  anchorDate,
  costDrag,
  holdingDuration,
  monthlyAggregates,
  monthlyMargins,
  profitByAssetClass,
  securityDetails,
  setback,
  timeSeries,
  topAndFlop,
  returnOnCapital,
  windowRange,
  windowSummaries,
  winRate,
} from '../../src/core/analytics';
import { ZERO } from '../../src/core/money';
import { op } from '../helpers/operations';

describe('timeSeries', () => {
  it('is empty when there are no operations', () => {
    expect(timeSeries(calculate([]))).toEqual([]);
  });

  it('only carries days on which the profit actually moved', () => {
    // A purchase with no fee moves no profit, so it earns no point.
    const series = timeSeries(
      calculate([
        op('2024-01-01', 'TRADING', 'BUY', { shares: '10', amount: '-100.00' }),
        op('2024-02-01', 'TRADING', 'SELL', { shares: '-10', amount: '150.00' }),
      ]),
    );
    expect(series.map((p) => p.date)).toEqual(['2024-02-01']);
  });

  it('ends on the net profit and the trading profit', () => {
    const report = calculate([
      op('2024-01-02', 'TRADING', 'BUY', { shares: '10', amount: '-100.00', fee: '-1.00' }),
      op('2024-01-10', 'CASH', 'DIVIDEND', { shares: '10', amount: '8.00', tax: '-2.08' }),
      op('2024-02-01', 'TRADING', 'SELL', { shares: '-10', amount: '150.00', tax: '-13.00' }),
    ]);
    const last = timeSeries(report).at(-1)!;
    expect(last.net.toFixed(2)).toBe(report.netProfit.toFixed(2));
    expect(last.trading.toFixed(2)).toBe(report.tradingProfit.toFixed(2));
  });

  it('is sorted by date and cumulative', () => {
    const series = timeSeries(
      calculate([
        op('2024-03-01', 'TRADING', 'BUY', { shares: '10', amount: '-100.00' }),
        op('2024-01-01', 'TRADING', 'BUY', { shares: '10', amount: '-100.00' }),
        op('2024-02-01', 'TRADING', 'SELL', { shares: '-10', amount: '150.00' }),
        op('2024-04-01', 'TRADING', 'SELL', { shares: '-10', amount: '120.00' }),
      ]),
    );
    expect(series.map((p) => p.date)).toEqual(['2024-02-01', '2024-04-01']);
    expect(series.map((p) => p.trading.toFixed(2))).toEqual(['50.00', '70.00']);
    expect(series.map((p) => p.dayProfit.toFixed(2))).toEqual(['50.00', '20.00']);
  });

  it('gives a negative point to a day that only carried charges', () => {
    const series = timeSeries(
      calculate([op('2024-01-05', 'CASH', 'TAX_OPTIMIZATION', { amount: '0', tax: '-3.29' })]),
    );
    expect(series).toHaveLength(1);
    expect(series[0]!.net.toFixed(2)).toBe('-3.29');
    expect(series[0]!.trading.toFixed(2)).toBe('0.00');
  });
});

describe('setback', () => {
  /** One 100-euro lot per symbol, so a sale's proceeds are its profit plus 100. */
  const account = (sold: [date: string, symbol: string, proceeds: string][]) =>
    timeSeries(
      calculate([
        ...sold.map(([, symbol]) =>
          op('2024-01-01', 'TRADING', 'BUY', { shares: '10', amount: '-100.00', symbol }),
        ),
        ...sold.map(([date, symbol, proceeds]) =>
          op(date, 'TRADING', 'SELL', { shares: '-10', amount: proceeds, symbol }),
        ),
      ]),
    );

  it('has nothing to report about an empty series', () => {
    expect(setback([])).toBeNull();
  });

  it('is null for a curve that only ever rose', () => {
    // Not a fall of zero: «-0,00 €» under "largest fall" would send the reader
    // looking for the day it happened on.
    const points = account([
      ['2024-02-01', 'AAA', '150.00'],
      ['2024-03-01', 'BBB', '120.00'],
    ]);

    expect(points.map((p) => p.net.toFixed(2))).toEqual(['50.00', '70.00']);
    expect(setback(points)).toBeNull();
  });

  it('measures the fall from the peak, not from zero', () => {
    const points = account([
      ['2024-02-01', 'AAA', '200.00'], // +100, net 100
      ['2024-03-01', 'BBB', '40.00'], //  -60, net 40
      ['2024-04-01', 'CCC', '130.00'], // +30, net 70
    ]);
    const fall = setback(points)!;

    // 60, not the 0 the still-positive net would suggest.
    expect(fall.drawdown.toFixed(2)).toBe('60.00');
    expect(fall.troughDate).toBe('2024-03-01');
  });

  it('starts the peak at zero, so an account that only lost has still fallen', () => {
    // The first point is already negative. Seeding the peak with it would make
    // the curve monotonic from its own start and report no fall at all.
    const points = account([['2024-02-01', 'AAA', '60.00']]);
    const fall = setback(points)!;

    expect(points[0]!.net.toFixed(2)).toBe('-40.00');
    expect(fall.drawdown.toFixed(2)).toBe('40.00');
    expect(fall.troughDate).toBe('2024-02-01');
  });

  it('keeps the deepest fall when a later dip starts from a higher peak', () => {
    const points = account([
      ['2024-02-01', 'AAA', '200.00'], // +100, net 100
      ['2024-03-01', 'BBB', '40.00'], //  -60, net 40
      ['2024-04-01', 'CCC', '200.00'], // +100, net 140
      ['2024-05-01', 'DDD', '80.00'], //  -20, net 120
    ]);
    const fall = setback(points)!;

    expect(fall.drawdown.toFixed(2)).toBe('60.00');
    expect(fall.troughDate).toBe('2024-03-01');
  });

  it('reports the worst single day separately from the trough', () => {
    // Two consecutive losing days: the trough is the second, the worst day the
    // first. One field cannot answer both questions.
    const points = account([
      ['2024-02-01', 'AAA', '200.00'], // +100, net 100
      ['2024-03-01', 'BBB', '50.00'], //  -50, net 50
      ['2024-04-01', 'CCC', '70.00'], //  -30, net 20
    ]);
    const fall = setback(points)!;

    expect(fall.drawdown.toFixed(2)).toBe('80.00');
    expect(fall.troughDate).toBe('2024-04-01');
    expect(fall.worstDay.toFixed(2)).toBe('50.00');
    expect(fall.worstDayDate).toBe('2024-03-01');
  });

  it('states the worst day as a positive size, like the fall it belongs to', () => {
    const fall = setback(account([['2024-02-01', 'AAA', '60.00']]))!;

    expect(fall.worstDay.isNegative()).toBe(false);
    expect(fall.worstDay.toFixed(2)).toBe('40.00');
  });
});

describe('anchorDate', () => {
  it('is the most recent date in the file, not today', () => {
    expect(
      anchorDate([
        op('2024-03-01', 'TRADING', 'BUY', { shares: '1', amount: '-1.00' }),
        op('2024-01-01', 'TRADING', 'BUY', { shares: '1', amount: '-1.00' }),
      ]),
    ).toBe('2024-03-01');
  });

  it('is null for an empty file', () => {
    expect(anchorDate([])).toBeNull();
  });
});

describe('windowSummaries', () => {
  const operations = [
    op('2024-01-15', 'CASH', 'CUSTOMER_INBOUND', { amount: '1000.00' }),
    op('2024-01-20', 'TRADING', 'BUY', { shares: '10', amount: '-100.00' }),
    op('2024-06-10', 'TRADING', 'SELL', { shares: '-10', amount: '150.00' }),
    op('2024-06-15', 'CASH', 'DIVIDEND', { shares: '10', amount: '8.00', tax: '-2.08' }),
  ];

  it('reports one summary per window, anchored to the last date in the file', () => {
    const summaries = windowSummaries(operations, calculate(operations));
    expect(summaries.map((s) => s.key)).toEqual([...WINDOW_KEYS]);
    expect(summaries.every((s) => s.to === '2024-06-15')).toBe(true);
  });

  it('marks a window that moved no profit as empty rather than zero', () => {
    // Showing 0,00 would read as "broke even" instead of "nothing happened".
    // A deposit moves cash and nothing else, so the day it lands on is empty.
    const withDeposit = [
      ...operations,
      op('2024-07-01', 'CASH', 'CUSTOMER_INBOUND', { amount: '500.00' }),
    ];
    const summaries = windowSummaries(withDeposit, calculate(withDeposit));
    const oneDay = summaries.find((s) => s.key === '1D')!;
    expect(oneDay.operations).toBe(1);
    expect(oneDay.empty).toBe(true);
    expect(summaries.find((s) => s.key === 'ALL')!.empty).toBe(false);
  });

  it('covers only the anchor day in the one day window', () => {
    const summaries = windowSummaries(operations, calculate(operations));
    const oneDay = summaries.find((s) => s.key === '1D')!;
    expect(oneDay.from).toBe('2024-06-15');
    expect(oneDay.operations).toBe(1);
  });

  it('totals realized profit, trades and net deposits over the whole file', () => {
    const all = windowSummaries(operations, calculate(operations)).find((s) => s.key === 'ALL')!;
    expect(all.profit.toFixed(2)).toBe('55.92');
    expect(all.buys.toFixed(2)).toBe('100.00');
    expect(all.sells.toFixed(2)).toBe('150.00');
    expect(all.netDeposits.toFixed(2)).toBe('1000.00');
    expect(all.operations).toBe(4);
  });

  it('excludes what falls before the window boundary', () => {
    const threeMonths = windowSummaries(operations, calculate(operations)).find(
      (s) => s.key === '3M',
    )!;
    expect(threeMonths.from).toBe('2024-03-16');
    expect(threeMonths.buys.toFixed(2)).toBe('0.00');
    expect(threeMonths.operations).toBe(2);
  });

  it('clamps to the last day of a shorter month when stepping back', () => {
    const march = [op('2024-03-31', 'TRADING', 'BUY', { shares: '1', amount: '-1.00' })];
    const oneMonth = windowSummaries(march, calculate(march)).find((s) => s.key === '1M')!;
    // 31 February does not exist; the boundary lands on the 29th, exclusive.
    expect(oneMonth.from).toBe('2024-03-01');
  });

  it('derives the profit from the components rather than summing separately', () => {
    // The same guarantee the monthly aggregate has: the total in the first
    // table and the parts in the second cannot drift apart, because there is
    // only one sum. 55.92 is the figure the whole-file test above pins.
    const all = windowSummaries(operations, calculate(operations)).find((s) => s.key === 'ALL')!;
    const { trading, dividends, interest, otherIncome, charges } = all.components;
    const sum = trading.plus(dividends).plus(interest).plus(otherIncome).minus(charges);
    expect(sum.toFixed(2)).toBe('55.92');
    expect(sum.toFixed(2)).toBe(all.profit.toFixed(2));
  });
});

describe('windowSummaries components', () => {
  const operations = [
    op('2024-01-10', 'TRADING', 'BUY', { shares: '10', amount: '-100.00', fee: '-1.00' }),
    op('2024-01-20', 'TRADING', 'SELL', { shares: '-10', amount: '150.00', tax: '-13.00' }),
    op('2024-06-10', 'CASH', 'DIVIDEND', { amount: '8.00' }),
    op('2024-06-12', 'CASH', 'INTEREST_PAYMENT', { amount: '3.00' }),
    op('2024-06-13', 'CASH', 'BENEFITS_SAVEBACK', { amount: '2.00' }),
  ];

  const windowFor = (key: string) =>
    windowSummaries(operations, calculate(operations)).find((s) => s.key === key)!;

  it('splits a window into the same five parts a month is split into', () => {
    const { components } = windowFor('ALL');
    expect(components.trading.toFixed(2)).toBe('50.00');
    expect(components.dividends.toFixed(2)).toBe('8.00');
    expect(components.interest.toFixed(2)).toBe('3.00');
    expect(components.otherIncome.toFixed(2)).toBe('2.00');
    // A positive size, as in the monthly split: the view is what subtracts it.
    expect(components.charges.toFixed(2)).toBe('14.00');
  });

  it('counts only what falls inside the window', () => {
    // January's trade and its charges are five months behind the anchor, so
    // the one month window keeps the income and nothing else.
    const { components, profit } = windowFor('1M');
    expect(components.trading.toFixed(2)).toBe('0.00');
    expect(components.charges.toFixed(2)).toBe('0.00');
    expect(components.dividends.toFixed(2)).toBe('8.00');
    expect(profit.toFixed(2)).toBe('13.00');
  });

  it('adds up to the profit the totals table shows, in every window', () => {
    for (const summary of windowSummaries(operations, calculate(operations))) {
      const { trading, dividends, interest, otherIncome, charges } = summary.components;
      const sum = trading.plus(dividends).plus(interest).plus(otherIncome).minus(charges);
      expect(sum.toFixed(2), summary.key).toBe(summary.profit.toFixed(2));
    }
  });

  it('leaves every component at zero in a window that moved no profit', () => {
    // A deposit moves cash, not profit. The window stays `empty`, and the
    // composition row must not invent five zeroes that read as "broke even".
    const withDeposit = [
      ...operations,
      op('2024-07-01', 'CASH', 'CUSTOMER_INBOUND', { amount: '500.00' }),
    ];
    const oneDay = windowSummaries(withDeposit, calculate(withDeposit)).find(
      (s) => s.key === '1D',
    )!;
    expect(oneDay.empty).toBe(true);
    const { trading, dividends, interest, otherIncome, charges } = oneDay.components;
    expect(
      [trading, dividends, interest, otherIncome, charges].map((value) => value.toFixed(2)),
    ).toEqual(['0.00', '0.00', '0.00', '0.00', '0.00']);
  });
});

describe('monthlyAggregates', () => {
  const operations = [
    op('2024-01-10', 'TRADING', 'BUY', { shares: '10', amount: '-100.00' }),
    op('2024-01-20', 'TRADING', 'SELL', { shares: '-10', amount: '150.00' }),
    op('2024-04-05', 'TRADING', 'BUY', { shares: '10', amount: '-100.00' }),
    op('2024-04-06', 'TRADING', 'SELL', { shares: '-10', amount: '80.00' }),
  ];

  it('keeps months with no operations as empty buckets instead of skipping them', () => {
    // Dropping quiet months compresses the axis and falsifies the tempo.
    const months = monthlyAggregates(operations, calculate(operations));
    expect(months.map((m) => m.month)).toEqual(['2024-01', '2024-02', '2024-03', '2024-04']);
    expect(months[1]!.profit.toFixed(2)).toBe('0.00');
    expect(months[1]!.transactions).toBe(0);
  });

  it('splits profit by month, positive and negative', () => {
    const months = monthlyAggregates(operations, calculate(operations));
    expect(months.map((m) => m.profit.toFixed(2))).toEqual(['50.00', '0.00', '0.00', '-20.00']);
  });

  it('counts BUY and SELL rows, not other operation types', () => {
    const withCash = [
      ...operations,
      op('2024-01-25', 'CASH', 'DIVIDEND', { shares: '10', amount: '5.00' }),
      op('2024-01-26', 'CASH', 'CUSTOMER_INBOUND', { amount: '500.00' }),
    ];
    const months = monthlyAggregates(withCash, calculate(withCash));
    expect(months[0]!.transactions).toBe(2);
  });

  it('is empty for a file with no operations', () => {
    expect(monthlyAggregates([], calculate([]))).toEqual([]);
  });
});

describe('monthlyMargins', () => {
  // Two Januaries and two Aprils, so a calendar-month total has something to
  // add up and a year total cannot be mistaken for it.
  const operations = [
    op('2024-01-10', 'TRADING', 'BUY', { shares: '10', amount: '-100.00' }),
    op('2024-01-20', 'TRADING', 'SELL', { shares: '-10', amount: '150.00' }),
    op('2024-04-05', 'TRADING', 'BUY', { shares: '10', amount: '-100.00' }),
    op('2024-04-25', 'TRADING', 'SELL', { shares: '-10', amount: '80.00' }),
    op('2025-01-15', 'TRADING', 'BUY', { shares: '10', amount: '-100.00' }),
    op('2025-01-28', 'TRADING', 'SELL', { shares: '-10', amount: '112.00' }),
  ];
  const margins = () => monthlyMargins(monthlyAggregates(operations, calculate(operations)));

  it('totals each year across the months it holds', () => {
    expect(margins().byYear.map((y) => [y.year, y.profit.toFixed(2)])).toEqual([
      ['2024', '30.00'],
      ['2025', '12.00'],
    ]);
  });

  it('totals each calendar month across the years, twelve slots, January first', () => {
    const { byMonth } = margins();
    expect(byMonth).toHaveLength(12);
    // Both Januaries: 50.00 + 12.00.
    expect(byMonth[0]!.profit.toFixed(2)).toBe('62.00');
    expect(byMonth[3]!.profit.toFixed(2)).toBe('-20.00');
  });

  // A month no year in the file reaches is absent, not zero: the account did
  // not break even that month, it did not exist. Only a file shorter than a
  // year can show this — the fixture above already spans twelve months, and a
  // span that long leaves no calendar slot empty.
  it('marks a calendar month the file never reaches as having no figure', () => {
    const short = operations.slice(0, 4);
    const { byMonth } = monthlyMargins(monthlyAggregates(short, calculate(short)));
    // January to April 2024, and nothing after it.
    expect(byMonth[0]!.present).toBe(true);
    expect(byMonth[3]!.present).toBe(true);
    expect(byMonth[4]!.present).toBe(false);
    expect(byMonth[4]!.profit.toFixed(2)).toBe('0.00');
  });

  // The margins are the same money read two ways. If either sum drifted from
  // the other, one of the two edges of the grid would be quietly wrong.
  it('reconciles: both margins add up to the same grand total', () => {
    const { byYear, byMonth, grand } = margins();
    expect(grand.toFixed(2)).toBe('42.00');
    expect(byYear.reduce((sum, y) => sum.plus(y.profit), ZERO).toFixed(2)).toBe('42.00');
    expect(byMonth.reduce((sum, m) => sum.plus(m.profit), ZERO).toFixed(2)).toBe('42.00');
  });

  it('has no margins to draw for a file with no months', () => {
    const empty = monthlyMargins([]);
    expect(empty.byYear).toEqual([]);
    expect(empty.grand.toFixed(2)).toBe('0.00');
  });
});

describe('monthlyAggregates components', () => {
  const operations = [
    op('2024-01-10', 'TRADING', 'BUY', { shares: '10', amount: '-100.00', fee: '-1.00' }),
    op('2024-01-20', 'TRADING', 'SELL', { shares: '-10', amount: '150.00', tax: '-13.00' }),
    op('2024-01-25', 'CASH', 'DIVIDEND', { shares: '10', amount: '8.00' }),
    op('2024-01-26', 'CASH', 'INTEREST_PAYMENT', { amount: '3.00' }),
    op('2024-01-27', 'CASH', 'BENEFITS_SAVEBACK', { amount: '2.00' }),
    // Only to stretch the axis past January: a purchase moves no profit, so
    // February and March stay empty buckets.
    op('2024-03-15', 'TRADING', 'BUY', { shares: '5', amount: '-40.00' }),
  ];

  it('splits the month into trading, each income type, and the charges', () => {
    const [january] = monthlyAggregates(operations, calculate(operations));
    const { components } = january!;
    // The fee on the BUY row is a charge in its own right, not part of the
    // lot's cost, so the trading result is the plain 150.00 - 100.00.
    expect(components.trading.toFixed(2)).toBe('50.00');
    expect(components.dividends.toFixed(2)).toBe('8.00');
    expect(components.interest.toFixed(2)).toBe('3.00');
    expect(components.otherIncome.toFixed(2)).toBe('2.00');
    // Charges are a positive size — the chart is what puts them below zero.
    expect(components.charges.toFixed(2)).toBe('14.00');
  });

  it('adds up to the profit the single-bar chart already shows', () => {
    // The stacked chart sits beside the total one. If the segments summed to
    // anything else, the same month would carry two different numbers.
    for (const month of monthlyAggregates(operations, calculate(operations))) {
      const { trading, dividends, interest, otherIncome, charges } = month.components;
      const sum = trading.plus(dividends).plus(interest).plus(otherIncome).minus(charges);
      expect(sum.toFixed(2), month.month).toBe(month.profit.toFixed(2));
    }
  });

  it('leaves every component at zero in a month with no activity', () => {
    const [, february] = monthlyAggregates(operations, calculate(operations));
    const { components } = february!;
    expect(
      [
        components.trading,
        components.dividends,
        components.interest,
        components.otherIncome,
        components.charges,
      ].map((value) => value.toFixed(2)),
    ).toEqual(['0.00', '0.00', '0.00', '0.00', '0.00']);
  });

  it('groups an income type it does not name in its own right under otherIncome', () => {
    // `otherIncome` is a tail bucket, not a list of known types: an income type
    // added to classify.ts later lands here instead of vanishing from the total.
    const withUnnamed = [op('2024-01-05', 'CASH', 'BENEFITS_SAVEBACK', { amount: '4.00' })];
    const [january] = monthlyAggregates(withUnnamed, calculate(withUnnamed));
    expect(january!.components.otherIncome.toFixed(2)).toBe('4.00');
    expect(january!.profit.toFixed(2)).toBe('4.00');
  });
});

describe('profitByAssetClass', () => {
  it('splits realized profit by asset class, largest first', () => {
    const report = calculate([
      op('2024-01-01', 'TRADING', 'BUY', { symbol: 'S1', assetClass: 'STOCK', shares: '10', amount: '-100.00' }),
      op('2024-02-01', 'TRADING', 'SELL', { symbol: 'S1', assetClass: 'STOCK', shares: '-10', amount: '150.00' }),
      op('2024-01-01', 'TRADING', 'BUY', { symbol: 'D1', assetClass: 'DERIVATIVE', shares: '10', amount: '-100.00' }),
      op('2024-02-01', 'TRADING', 'SELL', { symbol: 'D1', assetClass: 'DERIVATIVE', shares: '-10', amount: '20.00' }),
    ]);
    const split = profitByAssetClass(report);
    expect(split.map((c) => c.assetClass)).toEqual(['STOCK', 'DERIVATIVE']);
    expect(split.map((c) => c.profit.toFixed(2))).toEqual(['50.00', '-80.00']);
  });

  it('groups securities with a blank asset class under UNCLASSIFIED', () => {
    const report = calculate([
      op('2024-01-01', 'TRADING', 'BUY', { shares: '10', amount: '-100.00' }),
      op('2024-02-01', 'TRADING', 'SELL', { shares: '-10', amount: '150.00' }),
    ]);
    expect(profitByAssetClass(report)[0]!.assetClass).toBe('UNCLASSIFIED');
  });
});

describe('winRate', () => {
  it('reports wins and losses together with their average size', () => {
    // The rate alone misleads: a high hit rate with larger losses than wins
    // still ends up negative.
    const report = calculate([
      op('2024-01-01', 'TRADING', 'BUY', { symbol: 'A', shares: '10', amount: '-100.00' }),
      op('2024-02-01', 'TRADING', 'SELL', { symbol: 'A', shares: '-10', amount: '120.00' }),
      op('2024-01-01', 'TRADING', 'BUY', { symbol: 'B', shares: '10', amount: '-100.00' }),
      op('2024-02-01', 'TRADING', 'SELL', { symbol: 'B', shares: '-10', amount: '140.00' }),
      op('2024-01-01', 'TRADING', 'BUY', { symbol: 'C', shares: '10', amount: '-100.00' }),
      op('2024-02-01', 'TRADING', 'SELL', { symbol: 'C', shares: '-10', amount: '10.00' }),
    ]);
    const stats = winRate(report)!;
    expect(stats.closed).toBe(3);
    expect(stats.wins).toBe(2);
    expect(stats.losses).toBe(1);
    expect(stats.ratePercent.toFixed(2)).toBe('66.67');
    expect(stats.averageWin.toFixed(2)).toBe('30.00');
    expect(stats.averageLoss.toFixed(2)).toBe('90.00');
  });

  it('is null when nothing has been closed yet', () => {
    const report = calculate([
      op('2024-01-01', 'TRADING', 'BUY', { shares: '10', amount: '-100.00' }),
    ]);
    expect(winRate(report)).toBeNull();
  });
});

describe('topAndFlop', () => {
  const many = Array.from({ length: 12 }, (_, i) => [
    op('2024-01-01', 'TRADING', 'BUY', { symbol: `S${i}`, shares: '10', amount: '-100.00' }),
    op('2024-02-01', 'TRADING', 'SELL', { symbol: `S${i}`, shares: '-10', amount: `${100 + (i - 6) * 10}.00` }),
  ]).flat();

  it('ranks the best and the worst by realized profit', () => {
    const { top, flop } = topAndFlop(calculate(many), 10);
    expect(top[0]!.symbol).toBe('S11');
    expect(flop[0]!.symbol).toBe('S0');
    expect(top).toHaveLength(10);
    // Only S0..S5 lost; S6 closed flat and the rest gained.
    expect(flop).toHaveLength(6);
  });

  it('returns only what exists when there are fewer securities than asked for', () => {
    const report = calculate([
      op('2024-01-01', 'TRADING', 'BUY', { symbol: 'A', shares: '10', amount: '-100.00' }),
      op('2024-02-01', 'TRADING', 'SELL', { symbol: 'A', shares: '-10', amount: '150.00' }),
      op('2024-01-01', 'TRADING', 'BUY', { symbol: 'B', shares: '10', amount: '-100.00' }),
      op('2024-02-01', 'TRADING', 'SELL', { symbol: 'B', shares: '-10', amount: '80.00' }),
    ]);
    const { top, flop } = topAndFlop(report, 10);
    expect(top).toHaveLength(2);
    expect(flop).toHaveLength(1);
  });

  /**
   * "Worst" is not "least good". Reversing the ranking listed whatever came
   * last, so an account where everything gained put a profit under a heading
   * that reads Peggiori — and printed it in the gain colour, so the table
   * contradicted its own title.
   */
  it('leaves the worst empty when every closed position gained', () => {
    const report = calculate([
      op('2024-01-01', 'TRADING', 'BUY', { symbol: 'A', shares: '10', amount: '-100.00' }),
      op('2024-02-01', 'TRADING', 'SELL', { symbol: 'A', shares: '-10', amount: '150.00' }),
      op('2024-01-01', 'TRADING', 'BUY', { symbol: 'B', shares: '10', amount: '-100.00' }),
      op('2024-02-01', 'TRADING', 'SELL', { symbol: 'B', shares: '-10', amount: '120.00' }),
    ]);
    expect(topAndFlop(report, 10).flop).toEqual([]);
  });

  it('does not call a position that closed exactly flat a loss', () => {
    const report = calculate([
      op('2024-01-01', 'TRADING', 'BUY', { symbol: 'A', shares: '10', amount: '-100.00' }),
      op('2024-02-01', 'TRADING', 'SELL', { symbol: 'A', shares: '-10', amount: '100.00' }),
    ]);
    expect(topAndFlop(report, 10).flop).toEqual([]);
  });

  it('lists every loser worst-first, and nothing else', () => {
    const { flop } = topAndFlop(calculate(many), 10);
    expect(flop.map((entry) => entry.symbol)).toEqual(['S0', 'S1', 'S2', 'S3', 'S4', 'S5']);
  });
});

describe('holdingDuration', () => {
  it('reports the mean and the median days between purchase and sale', () => {
    const report = calculate([
      op('2024-01-01', 'TRADING', 'BUY', { symbol: 'A', assetClass: 'STOCK', shares: '10', amount: '-100.00' }),
      op('2024-01-11', 'TRADING', 'SELL', { symbol: 'A', assetClass: 'STOCK', shares: '-10', amount: '150.00' }),
      op('2024-01-01', 'TRADING', 'BUY', { symbol: 'B', assetClass: 'STOCK', shares: '10', amount: '-100.00' }),
      op('2024-04-10', 'TRADING', 'SELL', { symbol: 'B', assetClass: 'STOCK', shares: '-10', amount: '150.00' }),
      op('2024-01-01', 'TRADING', 'BUY', { symbol: 'C', assetClass: 'STOCK', shares: '10', amount: '-100.00' }),
      op('2024-01-03', 'TRADING', 'SELL', { symbol: 'C', assetClass: 'STOCK', shares: '-10', amount: '150.00' }),
    ]);
    const duration = holdingDuration(report)!;
    // 10, 100 and 2 days: the long one drags the mean well above the median.
    expect(duration.meanDays).toBeCloseTo(37.33, 2);
    expect(duration.medianDays).toBe(10);
  });

  it('averages the two middle values for an even number of closures', () => {
    const report = calculate([
      op('2024-01-01', 'TRADING', 'BUY', { symbol: 'A', shares: '10', amount: '-100.00' }),
      op('2024-01-05', 'TRADING', 'SELL', { symbol: 'A', shares: '-10', amount: '150.00' }),
      op('2024-01-01', 'TRADING', 'BUY', { symbol: 'B', shares: '10', amount: '-100.00' }),
      op('2024-01-11', 'TRADING', 'SELL', { symbol: 'B', shares: '-10', amount: '150.00' }),
    ]);
    expect(holdingDuration(report)!.medianDays).toBe(7);
  });

  it('breaks the mean down by asset class', () => {
    const report = calculate([
      op('2024-01-01', 'TRADING', 'BUY', { symbol: 'A', assetClass: 'STOCK', shares: '10', amount: '-100.00' }),
      op('2024-01-11', 'TRADING', 'SELL', { symbol: 'A', assetClass: 'STOCK', shares: '-10', amount: '150.00' }),
      op('2024-01-01', 'TRADING', 'BUY', { symbol: 'D', assetClass: 'DERIVATIVE', shares: '10', amount: '-100.00' }),
      op('2024-01-03', 'TRADING', 'SELL', { symbol: 'D', assetClass: 'DERIVATIVE', shares: '-10', amount: '150.00' }),
    ]);
    const byClass = holdingDuration(report)!.byAssetClass;
    expect(byClass.find((c) => c.assetClass === 'STOCK')!.meanDays).toBe(10);
    expect(byClass.find((c) => c.assetClass === 'DERIVATIVE')!.meanDays).toBe(2);
  });

  it('is null when nothing has been sold', () => {
    expect(
      holdingDuration(
        calculate([op('2024-01-01', 'TRADING', 'BUY', { shares: '10', amount: '-100.00' })]),
      ),
    ).toBeNull();
  });
});

describe('returnOnCapital', () => {
  it('expresses the net profit as a percentage of the capital actually paid in', () => {
    const report = calculate([
      op('2024-01-01', 'CASH', 'CUSTOMER_INBOUND', { amount: '1000.00' }),
      op('2024-01-02', 'TRADING', 'BUY', { shares: '10', amount: '-100.00' }),
      op('2024-02-01', 'TRADING', 'SELL', { shares: '-10', amount: '150.00' }),
    ]);
    // 50.00 profit on 1000.00 paid in.
    expect(report.netProfit.toFixed(2)).toBe('50.00');
    expect(returnOnCapital(report)!.toFixed(2)).toBe('5.00');
  });

  it('is null when no capital was paid in, rather than dividing by zero', () => {
    const report = calculate([
      op('2024-01-02', 'TRADING', 'BUY', { shares: '10', amount: '-100.00' }),
      op('2024-02-01', 'TRADING', 'SELL', { shares: '-10', amount: '150.00' }),
    ]);
    expect(returnOnCapital(report)).toBeNull();
  });

  it('is null when withdrawals cancel the deposits out', () => {
    const report = calculate([
      op('2024-01-01', 'CASH', 'CUSTOMER_INBOUND', { amount: '1000.00' }),
      op('2024-03-01', 'CASH', 'CUSTOMER_OUTBOUND_REQUEST', { amount: '-1000.00' }),
    ]);
    expect(report.netCapitalPaidIn.toFixed(2)).toBe('0.00');
    expect(returnOnCapital(report)).toBeNull();
  });
});

describe('costDrag', () => {
  it('expresses the fees as a percentage of the gross profit', () => {
    const report = calculate([
      op('2024-01-01', 'TRADING', 'BUY', { shares: '10', amount: '-100.00', fee: '-1.00' }),
      op('2024-02-01', 'TRADING', 'SELL', { shares: '-10', amount: '150.00', fee: '-1.00' }),
    ]);
    // `amount` is gross of `fee`, so the 50.00 gross profit is untouched by the
    // two fees and 2.00 of it went to the broker.
    expect(report.grossProfit.toFixed(2)).toBe('50.00');
    expect(report.fees.toFixed(2)).toBe('2.00');
    expect(costDrag(report)!.toFixed(2)).toBe('4.00');
  });

  it('measures against the gross profit, income included, not the trading profit alone', () => {
    const report = calculate([
      op('2024-01-01', 'TRADING', 'BUY', { shares: '10', amount: '-100.00', fee: '-1.00' }),
      op('2024-02-01', 'TRADING', 'SELL', { shares: '-10', amount: '150.00' }),
      op('2024-03-01', 'INCOME', 'DIVIDEND', { amount: '50.00' }),
    ]);
    // Trading made 50.00 and the dividend another 50.00. Against trading alone
    // the same fee would read 2.00%: the base is what the account earned.
    expect(report.grossProfit.toFixed(2)).toBe('100.00');
    expect(costDrag(report)!.toFixed(2)).toBe('1.00');
  });

  it('is zero when the broker charged nothing', () => {
    const report = calculate([
      op('2024-01-01', 'TRADING', 'BUY', { shares: '10', amount: '-100.00' }),
      op('2024-02-01', 'TRADING', 'SELL', { shares: '-10', amount: '150.00' }),
    ]);
    // A real zero, not an absent figure: nothing was taken.
    expect(costDrag(report)!.toFixed(2)).toBe('0.00');
  });

  it('is null when the gross profit is zero, rather than dividing by it', () => {
    const report = calculate([
      op('2024-01-01', 'TRADING', 'BUY', { shares: '10', amount: '-100.00', fee: '-1.00' }),
      op('2024-02-01', 'TRADING', 'SELL', { shares: '-10', amount: '100.00' }),
    ]);
    expect(report.grossProfit.toFixed(2)).toBe('0.00');
    expect(costDrag(report)).toBeNull();
  });

  it('is null when the account lost money, rather than reporting a negative drag', () => {
    const report = calculate([
      op('2024-01-01', 'TRADING', 'BUY', { shares: '10', amount: '-100.00', fee: '-1.00' }),
      op('2024-02-01', 'TRADING', 'SELL', { shares: '-10', amount: '60.00' }),
    ]);
    // A share of a negative base would print -2.50%, which reads as if the fee
    // had paid the account. The euro figure stays in `report.fees`; only the
    // rate is withheld, because there is nothing for the fee to be a share of.
    expect(report.grossProfit.toFixed(2)).toBe('-40.00');
    expect(report.fees.toFixed(2)).toBe('1.00');
    expect(costDrag(report)).toBeNull();
  });
});

describe('securityDetails', () => {
  it('expresses the profit as a percentage of what the sold lots cost', () => {
    // The same 50.00 profit on a tenth of the cost is a different trade, and
    // ranking by the absolute figure alone cannot tell the two apart.
    const report = calculate([
      op('2024-01-01', 'TRADING', 'BUY', { symbol: 'BIG', shares: '10', amount: '-1000.00' }),
      op('2024-02-01', 'TRADING', 'SELL', { symbol: 'BIG', shares: '-10', amount: '1050.00' }),
      op('2024-01-01', 'TRADING', 'BUY', { symbol: 'SMALL', shares: '10', amount: '-100.00' }),
      op('2024-02-01', 'TRADING', 'SELL', { symbol: 'SMALL', shares: '-10', amount: '150.00' }),
    ]);
    const bySymbol = new Map(securityDetails(report).map((d) => [d.symbol, d]));
    expect(bySymbol.get('BIG')!.profit.toFixed(2)).toBe('50.00');
    expect(bySymbol.get('SMALL')!.profit.toFixed(2)).toBe('50.00');
    expect(bySymbol.get('BIG')!.yieldPercent!.toFixed(2)).toBe('5.00');
    expect(bySymbol.get('SMALL')!.yieldPercent!.toFixed(2)).toBe('50.00');
  });

  it('carries a negative yield for a position closed at a loss', () => {
    const report = calculate([
      op('2024-01-01', 'TRADING', 'BUY', { shares: '10', amount: '-200.00' }),
      op('2024-02-01', 'TRADING', 'SELL', { shares: '-10', amount: '150.00' }),
    ]);
    expect(securityDetails(report)[0]!.yieldPercent!.toFixed(2)).toBe('-25.00');
  });

  it('has no yield for a free grant, rather than dividing by zero', () => {
    // A BONUS_ISSUE lot is booked at zero cost, so selling it produces proceeds
    // against no base at all. There is no percentage to state.
    const report = calculate([
      op('2024-01-01', 'TRADING', 'BONUS_ISSUE', { shares: '10' }),
      op('2024-02-01', 'TRADING', 'SELL', { shares: '-10', amount: '150.00' }),
    ]);
    const detail = securityDetails(report)[0]!;
    expect(detail.costOfSold.toFixed(2)).toBe('0.00');
    expect(detail.profit.toFixed(2)).toBe('150.00');
    expect(detail.yieldPercent).toBeNull();
  });

  it('counts the lots each security closed, not the lots the file closed', () => {
    // Two purchases consumed by one sale is two closures on A and one on B.
    const report = calculate([
      op('2024-01-01', 'TRADING', 'BUY', { symbol: 'A', shares: '10', amount: '-100.00' }),
      op('2024-01-15', 'TRADING', 'BUY', { symbol: 'A', shares: '10', amount: '-120.00' }),
      op('2024-02-01', 'TRADING', 'SELL', { symbol: 'A', shares: '-20', amount: '300.00' }),
      op('2024-01-01', 'TRADING', 'BUY', { symbol: 'B', shares: '5', amount: '-50.00' }),
      op('2024-02-01', 'TRADING', 'SELL', { symbol: 'B', shares: '-5', amount: '60.00' }),
    ]);
    const bySymbol = new Map(securityDetails(report).map((d) => [d.symbol, d]));
    expect(bySymbol.get('A')!.lotsClosed).toBe(2);
    expect(bySymbol.get('B')!.lotsClosed).toBe(1);
  });

  it('averages the holding days per security, not across the file', () => {
    const report = calculate([
      op('2024-01-01', 'TRADING', 'BUY', { symbol: 'A', shares: '10', amount: '-100.00' }),
      op('2024-01-11', 'TRADING', 'BUY', { symbol: 'A', shares: '10', amount: '-100.00' }),
      // Sold on 2024-01-31: the first lot was held 30 days, the second 20.
      op('2024-01-31', 'TRADING', 'SELL', { symbol: 'A', shares: '-20', amount: '300.00' }),
      op('2024-01-01', 'TRADING', 'BUY', { symbol: 'B', shares: '10', amount: '-100.00' }),
      op('2024-01-03', 'TRADING', 'SELL', { symbol: 'B', shares: '-10', amount: '150.00' }),
    ]);
    const bySymbol = new Map(securityDetails(report).map((d) => [d.symbol, d]));
    expect(bySymbol.get('A')!.meanDays).toBe(25);
    expect(bySymbol.get('B')!.meanDays).toBe(2);
  });

  it('has no duration and no lots for a sale that closed nothing', () => {
    // An uncovered sale books proceeds without consuming any lot, so there is
    // no purchase date to measure a holding period from.
    const report = calculate([
      op('2024-02-01', 'TRADING', 'SELL', { shares: '-10', amount: '150.00' }),
    ]);
    const detail = securityDetails(report)[0]!;
    expect(detail.lotsClosed).toBe(0);
    expect(detail.meanDays).toBeNull();
  });

  it('lists only closed positions, best profit first', () => {
    const report = calculate([
      op('2024-01-01', 'TRADING', 'BUY', { symbol: 'WIN', shares: '10', amount: '-100.00' }),
      op('2024-02-01', 'TRADING', 'SELL', { symbol: 'WIN', shares: '-10', amount: '150.00' }),
      op('2024-01-01', 'TRADING', 'BUY', { symbol: 'LOSE', shares: '10', amount: '-100.00' }),
      op('2024-02-01', 'TRADING', 'SELL', { symbol: 'LOSE', shares: '-10', amount: '40.00' }),
      // Bought and never sold: it belongs to the open positions, not here.
      op('2024-01-01', 'TRADING', 'BUY', { symbol: 'HELD', shares: '10', amount: '-100.00' }),
    ]);
    expect(securityDetails(report).map((d) => d.symbol)).toEqual(['WIN', 'LOSE']);
  });

  it('is empty when nothing has been closed', () => {
    const report = calculate([
      op('2024-01-01', 'TRADING', 'BUY', { shares: '10', amount: '-100.00' }),
    ]);
    expect(securityDetails(report)).toEqual([]);
  });

  it('keeps the name the rows carried, for the table to show', () => {
    const report = calculate([
      op('2024-01-01', 'TRADING', 'BUY', { symbol: 'A', name: 'Alpha SpA', shares: '10', amount: '-100.00' }),
      op('2024-02-01', 'TRADING', 'SELL', { symbol: 'A', name: 'Alpha SpA', shares: '-10', amount: '150.00' }),
    ]);
    const detail = securityDetails(report)[0]!;
    expect(detail.name).toBe('Alpha SpA');
    expect(detail.proceeds.toFixed(2)).toBe('150.00');
    expect(detail.costOfSold.toFixed(2)).toBe('100.00');
  });
});

describe('windowRange', () => {
  const operations = [
    op('2024-01-10T09:00:00Z', 'CASH', 'CUSTOMER_INBOUND', { amount: '1000' }),
    op('2024-06-30T09:00:00Z', 'TRADING', 'BUY', { shares: '1', amount: '-10' }),
  ];

  it('anchors to the last date in the file, never to today', () => {
    expect(windowRange(operations, '1M')).toEqual({ from: '2024-05-31', to: '2024-06-30' });
  });

  it('starts ALL at the first operation, not at the first sale', () => {
    expect(windowRange(operations, 'ALL')).toEqual({ from: '2024-01-10', to: '2024-06-30' });
  });

  it('has no range at all for an empty file', () => {
    expect(windowRange([], 'ALL')).toBeNull();
  });
});
