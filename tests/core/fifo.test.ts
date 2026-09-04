import { describe, expect, it } from 'vitest';
import { calculate } from '../../src/core/fifo';
import { ZERO } from '../../src/core/money';
import { op } from '../helpers/operations';

/** Compare a Decimal-valued result against an exact decimal literal. */
function eur(value: { toFixed(dp: number): string }): string {
  return value.toFixed(2);
}

describe('trading', () => {
  it('realizes the gain between purchase and sale', () => {
    const report = calculate([
      op('2024-01-01', 'TRADING', 'BUY', { shares: '10', amount: '-100.00' }),
      op('2024-02-01', 'TRADING', 'SELL', { shares: '-10', amount: '150.00' }),
    ]);
    expect(eur(report.tradingProfit)).toBe('50.00');
    expect(eur(report.netProfit)).toBe('50.00');
  });

  it('realizes a loss', () => {
    const report = calculate([
      op('2024-01-01', 'TRADING', 'BUY', { shares: '10', amount: '-100.00' }),
      op('2024-02-01', 'TRADING', 'SELL', { shares: '-10', amount: '70.00' }),
    ]);
    expect(eur(report.netProfit)).toBe('-30.00');
  });

  it('consumes the oldest lot first', () => {
    const report = calculate([
      op('2024-01-01', 'TRADING', 'BUY', { shares: '10', amount: '-100.00' }),
      op('2024-02-01', 'TRADING', 'BUY', { shares: '10', amount: '-200.00' }),
      op('2024-03-01', 'TRADING', 'SELL', { shares: '-10', amount: '300.00' }),
    ]);
    expect(eur(report.tradingProfit)).toBe('200.00');
    expect(eur(report.security('AAA').remainingQuantity)).toBe('10.00');
    expect(eur(report.openPositionsCost)).toBe('200.00');
  });

  it('leaves a remainder after a partial sale', () => {
    const report = calculate([
      op('2024-01-01', 'TRADING', 'BUY', { shares: '10', amount: '-100.00' }),
      op('2024-02-01', 'TRADING', 'SELL', { shares: '-4', amount: '60.00' }),
    ]);
    expect(eur(report.tradingProfit)).toBe('20.00');
    expect(eur(report.openPositionsCost)).toBe('60.00');
  });

  it('gives the same result whatever the input row order', () => {
    const rows = [
      op('2024-01-01', 'TRADING', 'BUY', { shares: '10', amount: '-100.00' }),
      op('2024-02-01', 'TRADING', 'BUY', { shares: '10', amount: '-200.00' }),
      op('2024-03-01', 'TRADING', 'SELL', { shares: '-10', amount: '300.00' }),
    ];
    expect(eur(calculate([...rows].reverse()).netProfit)).toBe(eur(calculate(rows).netProfit));
  });

  it('keeps holdings separate per security', () => {
    const report = calculate([
      op('2024-01-01', 'TRADING', 'BUY', { symbol: 'AAA', shares: '10', amount: '-100.00' }),
      op('2024-01-02', 'TRADING', 'BUY', { symbol: 'BBB', shares: '10', amount: '-500.00' }),
      op('2024-02-01', 'TRADING', 'SELL', { symbol: 'AAA', shares: '-10', amount: '150.00' }),
    ]);
    expect(eur(report.security('AAA').profit)).toBe('50.00');
    expect(eur(report.security('BBB').profit)).toBe('0.00');
    expect(eur(report.openPositionsCost)).toBe('500.00');
  });

  it('flags a sale with no holdings to cover it', () => {
    const report = calculate([
      op('2024-02-01', 'TRADING', 'SELL', { shares: '-10', amount: '150.00' }),
    ]);
    expect(eur(report.security('AAA').uncoveredSales)).toBe('10.00');
    // A code and its numbers, never a sentence: which language the reader
    // gets is the UI's decision, and the engine has no business making it.
    const [anomaly] = report.anomalies;
    expect(anomaly?.code).toBe('UNCOVERED_SALE');
    expect(anomaly?.symbol).toBe('AAA');
    expect(eur(anomaly!.quantity)).toBe('10.00');
  });
});

describe('fees and taxes', () => {
  it('subtracts fees from the profit', () => {
    const report = calculate([
      op('2024-01-01', 'TRADING', 'BUY', { shares: '10', amount: '-100.00', fee: '-1.00' }),
      op('2024-02-01', 'TRADING', 'SELL', { shares: '-10', amount: '150.00', fee: '-1.00' }),
    ]);
    expect(eur(report.tradingProfit)).toBe('50.00');
    expect(eur(report.fees)).toBe('2.00');
    expect(eur(report.netProfit)).toBe('48.00');
  });

  // The next two pin the cost basis itself, not just the profit it feeds.
  // `amount` is gross of `fee` (see operation.ts), so the fee must reach the
  // result only through `report.fees`. Were it also folded into `unitCost`,
  // every figure below would be one euro worse — and `reconcile.ts` could not
  // see it, because that path starts from `amount` too.
  it('keeps the fee out of the lot cost of an unsold position', () => {
    const report = calculate([
      op('2024-01-01', 'TRADING', 'BUY', { shares: '10', amount: '-100.00', fee: '-1.00' }),
    ]);
    expect(eur(report.openPositionsCost)).toBe('100.00');
    expect(eur(report.security('AAA').remainingCost)).toBe('100.00');
    expect(eur(report.fees)).toBe('1.00');
    expect(eur(report.netProfit)).toBe('-1.00');
  });

  it('charges a fee once, leaving net profit equal to the cash that moved', () => {
    const report = calculate([
      op('2024-01-01', 'TRADING', 'BUY', { shares: '10', amount: '-100.00', fee: '-1.00' }),
      op('2024-02-01', 'TRADING', 'SELL', { shares: '-10', amount: '150.00', fee: '-1.00' }),
    ]);
    expect(eur(report.security('AAA').costOfSold)).toBe('100.00');
    // The account moved -100.00 -1.00 +150.00 -1.00 = 48.00.
    expect(eur(report.netProfit)).toBe('48.00');
  });

  it('subtracts the tax withheld on a sale', () => {
    const report = calculate([
      op('2024-01-01', 'TRADING', 'BUY', { shares: '10', amount: '-100.00' }),
      op('2024-02-01', 'TRADING', 'SELL', { shares: '-10', amount: '150.00', tax: '-13.00' }),
    ]);
    expect(eur(report.netProfit)).toBe('37.00');
  });

  it('collects stamp duty, which carries its amount in tax with amount at zero', () => {
    const report = calculate([
      op('2024-03-01', 'CASH', 'TAX_OPTIMIZATION', { amount: '0', tax: '-32.67' }),
    ]);
    expect(eur(report.totalTaxes)).toBe('32.67');
    expect(eur(report.netProfit)).toBe('-32.67');
  });

  it('lets a tax refund increase the profit', () => {
    const report = calculate([
      op('2024-03-01', 'CASH', 'TAX_OPTIMIZATION', { amount: '0', tax: '54.48' }),
    ]);
    expect(eur(report.netProfit)).toBe('54.48');
  });

  it('collects the card ordering fee, which carries its amount in fee only', () => {
    const report = calculate([
      op('2024-03-01', 'CASH', 'CARD_ORDERING_FEE', { amount: '0', fee: '-5.00' }),
    ]);
    expect(eur(report.fees)).toBe('5.00');
    expect(eur(report.netProfit)).toBe('-5.00');
  });
});

describe('income', () => {
  it('records a dividend gross, with its tax kept separate', () => {
    const report = calculate([
      op('2024-01-01', 'CASH', 'DIVIDEND', { shares: '100', amount: '30.00', tax: '-7.80' }),
    ]);
    expect(eur(report.income['DIVIDEND']!)).toBe('30.00');
    expect(eur(report.totalTaxes)).toBe('7.80');
    expect(eur(report.netProfit)).toBe('22.20');
  });

  it('does not let dividend shares change the position', () => {
    // On DIVIDEND rows `shares` is the position that produced the coupon,
    // not units received.
    const report = calculate([
      op('2024-01-01', 'TRADING', 'BUY', { shares: '10', amount: '-100.00' }),
      op('2024-01-15', 'CASH', 'DIVIDEND', { shares: '10', amount: '5.00' }),
      op('2024-02-01', 'TRADING', 'SELL', { shares: '-10', amount: '150.00' }),
    ]);
    expect(eur(report.openPositionsCost)).toBe('0.00');
    expect(eur(report.tradingProfit)).toBe('50.00');
    expect(eur(report.netProfit)).toBe('55.00');
  });

  it('counts interest and saveback as income', () => {
    const report = calculate([
      op('2024-01-01', 'CASH', 'INTEREST_PAYMENT', { amount: '14.30', tax: '-3.72' }),
      op('2024-01-02', 'CASH', 'BENEFITS_SAVEBACK', { amount: '5.00' }),
    ]);
    expect(eur(report.totalIncome)).toBe('19.30');
    expect(eur(report.netProfit)).toBe('15.58');
  });

  it('keeps the income of a day split by type, not only in the daily total', () => {
    // `perDay` collapses every income type into one bucket. The monthly
    // composition chart needs to know which type the money came from, and a
    // second pass over the rows would duplicate the rule that only `amount`
    // counts for income.
    const report = calculate([
      op('2024-01-01', 'CASH', 'DIVIDEND', { shares: '100', amount: '30.00' }),
      op('2024-01-01', 'CASH', 'INTEREST_PAYMENT', { amount: '2.00' }),
      op('2024-01-01', 'CASH', 'DIVIDEND', { shares: '50', amount: '5.00' }),
      op('2024-01-02', 'TRADING', 'BUY', { shares: '10', amount: '-100.00' }),
    ]);
    expect(eur(report.incomePerDay['2024-01-01']!['DIVIDEND']!)).toBe('35.00');
    expect(eur(report.incomePerDay['2024-01-01']!['INTEREST_PAYMENT']!)).toBe('2.00');
    // A day that moved no income earns no entry at all.
    expect(report.incomePerDay['2024-01-02']).toBeUndefined();
  });

  it('splits the same income across the days it was paid on', () => {
    const report = calculate([
      op('2024-01-01', 'CASH', 'DIVIDEND', { shares: '100', amount: '30.00' }),
      op('2024-02-01', 'CASH', 'DIVIDEND', { shares: '100', amount: '12.00' }),
    ]);
    expect(eur(report.incomePerDay['2024-01-01']!['DIVIDEND']!)).toBe('30.00');
    expect(eur(report.incomePerDay['2024-02-01']!['DIVIDEND']!)).toBe('12.00');
  });
});

describe('non-income movements', () => {
  it('keeps deposits and withdrawals out of the profit', () => {
    const report = calculate([
      op('2024-01-01', 'CASH', 'CUSTOMER_INBOUND', { amount: '5000.00' }),
      op('2024-01-02', 'CASH', 'CUSTOMER_OUTBOUND_REQUEST', { amount: '-2000.00' }),
    ]);
    expect(eur(report.netProfit)).toBe('0.00');
    expect(eur(report.netCapitalPaidIn)).toBe('3000.00');
  });

  it('keeps card spending out of the profit', () => {
    const report = calculate([
      op('2024-01-01', 'CASH', 'CARD_TRANSACTION', { amount: '-40.00' }),
      op('2024-01-02', 'CASH', 'CARD_TRANSACTION_INTERNATIONAL', { amount: '-10.00' }),
    ]);
    expect(eur(report.netProfit)).toBe('0.00');
    expect(eur(report.cardSpending)).toBe('50.00');
  });

  it('ignores migration pairs', () => {
    const report = calculate([
      op('2024-01-01', 'TRADING', 'BUY', { shares: '10', amount: '-100.00' }),
      op('2024-01-15', 'DELIVERY', 'MIGRATION', { shares: '-10', amount: '0' }),
      op('2024-01-16', 'DELIVERY', 'MIGRATION', { shares: '10', amount: '0' }),
      op('2024-02-01', 'TRADING', 'SELL', { shares: '-10', amount: '150.00' }),
    ]);
    expect(eur(report.netProfit)).toBe('50.00');
  });

  it('reports an unknown operation type loudly instead of silently dropping it', () => {
    // The Python engine raises here. On the web, stopping is a bad experience
    // and ignoring is worse: it is the bug that lost 569 EUR. The amount is
    // held out of the profit so cash reconciliation surfaces the gap too.
    const report = calculate([
      op('2024-01-01', 'CASH', 'NEVER_SEEN_TYPE', { amount: '100.00' }),
    ]);
    expect(report.unclassified.types).toEqual(['NEVER_SEEN_TYPE']);
    expect(report.unclassified.count).toBe(1);
    expect(eur(report.unclassified.amount)).toBe('100.00');
    expect(eur(report.netProfit)).toBe('0.00');
  });
});

describe('corporate actions', () => {
  it('treats a bonus issue as a zero cost lot', () => {
    const report = calculate([
      op('2024-01-01', 'CORPORATE_ACTION', 'BONUS_ISSUE', { shares: '10', amount: '' }),
      op('2024-02-01', 'TRADING', 'SELL', { shares: '-10', amount: '150.00' }),
    ]);
    expect(eur(report.tradingProfit)).toBe('150.00');
  });

  it('does not let a bonus cancellation consume purchased lots', () => {
    const report = calculate([
      op('2024-01-01', 'TRADING', 'BUY', { shares: '10', amount: '-100.00' }),
      op('2024-01-02', 'CORPORATE_ACTION', 'BONUS_ISSUE', { shares: '5', amount: '' }),
      op('2024-01-03', 'CORPORATE_ACTION', 'BONUS_ISSUE_CANCELLED', { shares: '-5', amount: '' }),
      op('2024-02-01', 'TRADING', 'SELL', { shares: '-10', amount: '150.00' }),
    ]);
    expect(eur(report.tradingProfit)).toBe('50.00');
    expect(eur(report.openPositionsCost)).toBe('0.00');
    expect(report.anomalies).toEqual([]);
  });

  it('flags a bonus cancellation with no free lot to draw from', () => {
    const report = calculate([
      op('2024-01-01', 'TRADING', 'BUY', { shares: '10', amount: '-100.00' }),
      op('2024-01-03', 'CORPORATE_ACTION', 'BONUS_ISSUE_CANCELLED', { shares: '-5', amount: '' }),
    ]);
    const [anomaly] = report.anomalies;
    expect(anomaly?.code).toBe('UNMATCHED_FREE_LOT_CANCELLATION');
    expect(anomaly?.symbol).toBe('AAA');
    expect(eur(anomaly!.quantity)).toBe('5.00');
    expect(eur(report.openPositionsCost)).toBe('100.00');
  });
});

describe('empty input', () => {
  it('produces a zero profit with no operations', () => {
    expect(eur(calculate([]).netProfit)).toBe('0.00');
  });
});

describe('lot acquisition dates', () => {
  it('records when each consumed lot was acquired', () => {
    const report = calculate([
      op('2024-01-01', 'TRADING', 'BUY', { shares: '10', amount: '-100.00' }),
      op('2024-02-01', 'TRADING', 'BUY', { shares: '10', amount: '-200.00' }),
      op('2024-03-01', 'TRADING', 'SELL', { shares: '-15', amount: '450.00' }),
    ]);
    expect(report.closures.map((c) => c.acquiredAt)).toEqual(['2024-01-01', '2024-02-01']);
    expect(report.closures.map((c) => c.soldAt)).toEqual(['2024-03-01', '2024-03-01']);
    expect(report.closures.map((c) => c.quantity.toFixed(0))).toEqual(['10', '5']);
  });

  it('splits proceeds across consumed lots in proportion to quantity', () => {
    const report = calculate([
      op('2024-01-01', 'TRADING', 'BUY', { shares: '10', amount: '-100.00' }),
      op('2024-02-01', 'TRADING', 'BUY', { shares: '10', amount: '-200.00' }),
      op('2024-03-01', 'TRADING', 'SELL', { shares: '-15', amount: '450.00' }),
    ]);
    expect(report.closures.map((c) => eur(c.proceeds))).toEqual(['300.00', '150.00']);
    expect(report.closures.map((c) => eur(c.cost))).toEqual(['100.00', '100.00']);
  });
});

describe('totalCharges', () => {
  it('adds every fee to every tax, as one positive cost', () => {
    const report = calculate([
      op('2024-01-02', 'TRADING', 'BUY', { shares: '10', amount: '-100.00', fee: '-1.00' }),
      op('2024-01-10', 'CASH', 'DIVIDEND', { amount: '8.00', tax: '-2.08' }),
    ]);
    expect(report.fees.toFixed(2)).toBe('1.00');
    expect(report.totalTaxes.toFixed(2)).toBe('2.08');
    expect(report.totalCharges.toFixed(2)).toBe('3.08');
  });

  it('is zero when nothing was charged', () => {
    expect(calculate([]).totalCharges.toFixed(2)).toBe('0.00');
  });
});

describe('the daily capital ledger', () => {
  it('books the lot cost on the day it opens and releases it on the day it is sold', () => {
    const report = calculate([
      op('2024-01-10', 'TRADING', 'BUY', { shares: '10', amount: '-100.00', fee: '-1.00' }),
      op('2024-02-20', 'TRADING', 'SELL', { shares: '-4', amount: '60.00' }),
    ]);
    // 100,00 e non 101,00: la commissione è spesata a parte, e sommarla al
    // lotto la sottrarrebbe due volte.
    expect(eur(report.investedDelta['2024-01-10']!)).toBe('100.00');
    expect(eur(report.investedDelta['2024-02-20']!)).toBe('-40.00');
  });

  it('adds up to the cost still open', () => {
    const report = calculate([
      op('2024-01-10', 'TRADING', 'BUY', { shares: '10', amount: '-100.00' }),
      op('2024-01-20', 'TRADING', 'BUY', { shares: '5', amount: '-80.00', symbol: 'BBB' }),
      op('2024-02-01', 'TRADING', 'SELL', { shares: '-6', amount: '90.00' }),
      op('2024-03-01', 'TRADING', 'SELL', { shares: '-5', amount: '70.00', symbol: 'BBB' }),
    ]);
    const booked = Object.values(report.investedDelta).reduce((a, b) => a.plus(b), ZERO);
    expect(eur(booked)).toBe(eur(report.openPositionsCost));
  });

  it('leaves the ledger untouched by a free lot and by its cancellation', () => {
    const report = calculate([
      op('2024-01-10', 'FREE_LOTS', 'BONUS_ISSUE', { shares: '5', amount: '0' }),
      op('2024-01-11', 'FREE_LOTS_CANCELLED', 'BONUS_ISSUE', { shares: '-5', amount: '0' }),
    ]);
    expect(report.investedDelta).toEqual({});
  });

  it('books nothing for a sale with no lots to consume', () => {
    const report = calculate([
      op('2024-01-10', 'TRADING', 'SELL', { shares: '-10', amount: '50.00' }),
    ]);
    expect(report.investedDelta).toEqual({});
    expect(report.anomalies[0]?.code).toBe('UNCOVERED_SALE');
  });
});
