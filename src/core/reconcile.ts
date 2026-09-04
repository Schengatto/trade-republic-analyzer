import type { Report } from './fifo';
import { Decimal, ZERO, dec } from './money';
import type { Operation } from './operation';

/** Anything below this is rounding noise, not a classification error. */
const TOLERANCE = new Decimal('0.01');

export interface Reconciliation {
  /** Profit implied by cash flows alone, with no FIFO involved. */
  expected: Decimal;
  /** `expected` minus the FIFO net profit. Zero means the two agree. */
  difference: Decimal;
  balanced: boolean;
}

/**
 * Recompute the profit from cash movements only and compare it with the FIFO
 * result. The two are independent paths to the same number, so a mismatch
 * means an operation type is classified wrongly — this check is what surfaced
 * every classification bug found so far.
 */
export function reconcile(operations: readonly Operation[], report: Report): Reconciliation {
  const cash = operations.reduce(
    (total, row) => total.plus(dec(row.amount)).plus(dec(row.fee)).plus(dec(row.tax)),
    ZERO,
  );
  const expected = cash
    .minus(report.netCapitalPaidIn)
    .plus(report.cardSpending)
    .plus(report.openPositionsCost);
  const difference = expected.minus(report.netProfit);
  return { expected, difference, balanced: difference.abs().lt(TOLERANCE) };
}
