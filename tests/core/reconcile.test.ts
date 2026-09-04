import { describe, expect, it } from 'vitest';
import { calculate } from '../../src/core/fifo';
import { reconcile } from '../../src/core/reconcile';
import { op } from '../helpers/operations';

describe('reconcile', () => {
  it('agrees with the FIFO profit on a scenario using every category', () => {
    // The check that found all three historical bugs: recompute the profit
    // from cash flows alone, with no FIFO involved.
    const operations = [
      op('2024-01-01', 'CASH', 'CUSTOMER_INBOUND', { amount: '1000.00' }),
      op('2024-01-02', 'TRADING', 'BUY', { shares: '10', amount: '-100.00', fee: '-1.00' }),
      op('2024-01-03', 'TRADING', 'BUY', { shares: '10', amount: '-200.00' }),
      op('2024-01-10', 'CASH', 'DIVIDEND', { shares: '20', amount: '8.00', tax: '-2.08' }),
      op('2024-02-01', 'TRADING', 'SELL', { shares: '-10', amount: '150.00', tax: '-13.00' }),
      op('2024-02-05', 'CASH', 'CARD_TRANSACTION', { amount: '-40.00' }),
      op('2024-02-10', 'CASH', 'TAX_OPTIMIZATION', { amount: '0', tax: '-3.29' }),
      op('2024-03-01', 'CASH', 'CUSTOMER_OUTBOUND_REQUEST', { amount: '-200.00' }),
    ];
    const { difference, balanced } = reconcile(operations, calculate(operations));
    expect(difference.toFixed(2)).toBe('0.00');
    expect(balanced).toBe(true);
  });

  it('balances on an empty file', () => {
    expect(reconcile([], calculate([])).balanced).toBe(true);
  });

  it('does not balance when an operation type went unclassified', () => {
    // The whole point of the check: an amount the engine could not place has
    // to surface here rather than quietly vanish.
    const operations = [op('2024-01-01', 'CASH', 'NEVER_SEEN_TYPE', { amount: '100.00' })];
    const { difference, balanced } = reconcile(operations, calculate(operations));
    expect(difference.toFixed(2)).toBe('100.00');
    expect(balanced).toBe(false);
  });
});
