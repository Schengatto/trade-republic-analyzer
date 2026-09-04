import { categoryOf } from './classify';
import { Decimal, ZERO, dec } from './money';
import type { Operation } from './operation';

/**
 * A holding acquired at a point in time, at a unit cost *excluding* fees.
 *
 * The purchase fee never enters the lot: `amount` is gross of `fee` (see
 * `Operation.amount`), and the fee is expensed once, into `Report.fees`.
 * Adding it here as well would subtract it twice — once inside the cost of
 * what was sold, once again in `netProfit`.
 */
interface Lot {
  quantity: Decimal;
  unitCost: Decimal;
  /** Value date of the purchase, used for holding duration. */
  acquiredAt: string;
}

/** One lot consumed by one sale. Produced for holding-duration analytics. */
export interface Closure {
  symbol: string;
  assetClass: string;
  quantity: Decimal;
  acquiredAt: string;
  soldAt: string;
  cost: Decimal;
  proceeds: Decimal;
}

export class SecurityResult {
  /** Gross proceeds from sales. */
  proceeds = ZERO;
  /** Carrying cost of the lots that were sold. */
  costOfSold = ZERO;
  remainingQuantity = ZERO;
  remainingCost = ZERO;
  uncoveredSales = ZERO;

  /** Filled from the first trading row that declares one; often blank. */
  assetClass = '';

  constructor(
    readonly symbol: string,
    readonly name: string,
  ) {}

  get profit(): Decimal {
    return this.proceeds.minus(this.costOfSold);
  }
}

/**
 * What went wrong in the data, as something a view can translate.
 *
 * `UNCOVERED_SALE` — shares left after the lots ran out: the export starts
 * after the purchase, or a row is missing.
 * `UNMATCHED_FREE_LOT_CANCELLATION` — a bonus issue was cancelled with no
 * free lot left to draw the shares from.
 */
export type AnomalyCode = 'UNCOVERED_SALE' | 'UNMATCHED_FREE_LOT_CANCELLATION';

/**
 * The engine states which anomaly and on how much, never in which words: the
 * reader's language belongs to the UI. Symbol and quantity only — a name, a
 * counterparty or an IBAN must never reach a banner.
 */
export interface Anomaly {
  code: AnomalyCode;
  symbol: string;
  /** Units left uncovered or unmatched. */
  quantity: Decimal;
}

/** Daily buckets: realized trading result, income, charges. */
export type DailyLedger = Record<string, [Decimal, Decimal, Decimal]>;

export class Report {
  operationsRead = 0;
  bySecurity: Record<string, SecurityResult> = {};
  /** Gross income, by operation type. */
  income: Record<string, Decimal> = {};
  /**
   * Gross income by day and then by operation type.
   *
   * `perDay` keeps only the daily income total, which is enough for the profit
   * but not for the monthly composition chart. Recomputing the split from the
   * rows later would put "for income, only `amount` counts" in two places, and
   * a future divergence would silently unstack the chart from its own total.
   */
  incomePerDay: Record<string, Record<string, Decimal>> = {};
  /** Every fee found on any row, as a positive cost. */
  fees = ZERO;
  /** Every tax found on any row, as a positive cost, by operation type. */
  taxes: Record<string, Decimal> = {};
  cardSpending = ZERO;
  deposits = ZERO;
  withdrawals = ZERO;
  anomalies: Anomaly[] = [];
  closures: Closure[] = [];
  perDay: DailyLedger = {};
  /**
   * Variazione, nel giorno, del costo di carico delle posizioni aperte.
   *
   * Positiva dove un lotto si apre, negativa dove si consuma; i giorni fermi
   * non compaiono. Una serie di variazioni invece di uno snapshot per giorno,
   * così la memoria segue l'attività e non la vita del conto — e la camminata
   * di calendario resta dove il calendario abita, fuori dall'engine.
   *
   * Invariante: la somma di tutte le variazioni è `openPositionsCost`.
   */
  investedDelta: Record<string, Decimal> = {};
  /**
   * Rows whose type the engine does not know. Their amount is deliberately
   * kept out of the profit so that cash reconciliation reports the gap rather
   * than absorbing it.
   */
  unclassified: { types: string[]; count: number; amount: Decimal } = {
    types: [],
    count: 0,
    amount: ZERO,
  };

  record(day: string, bucket: 0 | 1 | 2, amount: Decimal): void {
    if (amount.isZero()) return;
    const row = (this.perDay[day] ??= [ZERO, ZERO, ZERO]);
    row[bucket] = row[bucket].plus(amount);
  }

  /** Registra una variazione del capitale investito. Zero non muove nulla. */
  invest(day: string, amount: Decimal): void {
    if (amount.isZero()) return;
    this.investedDelta[day] = (this.investedDelta[day] ?? ZERO).plus(amount);
  }

  security(symbol: string): SecurityResult {
    const found = this.bySecurity[symbol];
    if (!found) throw new Error(`No result for symbol ${symbol}`);
    return found;
  }

  get tradingProfit(): Decimal {
    return sum(Object.values(this.bySecurity).map((s) => s.profit));
  }

  get totalIncome(): Decimal {
    return sum(Object.values(this.income));
  }

  get totalTaxes(): Decimal {
    return sum(Object.values(this.taxes));
  }

  get grossProfit(): Decimal {
    return this.tradingProfit.plus(this.totalIncome);
  }

  /** Everything the broker kept: fees and taxes together, as a positive cost. */
  get totalCharges(): Decimal {
    return this.fees.plus(this.totalTaxes);
  }

  get netProfit(): Decimal {
    return this.grossProfit.minus(this.fees).minus(this.totalTaxes);
  }

  get openPositionsCost(): Decimal {
    return sum(Object.values(this.bySecurity).map((s) => s.remainingCost));
  }

  get netCapitalPaidIn(): Decimal {
    return this.deposits.minus(this.withdrawals);
  }
}

function sum(values: Decimal[]): Decimal {
  return values.reduce((total, value) => total.plus(value), ZERO);
}

/**
 * Cancel a free grant by releasing zero-cost lots, most recent first.
 * Returns the quantity that had no free lot to draw from.
 */
function releaseFreeLots(lots: Lot[], quantity: Decimal): Decimal {
  let left = quantity;
  for (let i = lots.length - 1; i >= 0 && left.gt(0); i--) {
    const lot = lots[i]!;
    if (!lot.unitCost.isZero()) continue;
    const used = Decimal.min(left, lot.quantity);
    lot.quantity = lot.quantity.minus(used);
    left = left.minus(used);
  }
  while (lots.length > 0 && lots[0]!.quantity.isZero()) lots.shift();
  return left;
}

/**
 * Match purchases against sales FIFO, per security, and total up everything
 * the broker charged or paid out.
 *
 * Rows are matched in booking order (`datetime`), so the caller may pass them
 * in any order.
 */
export function calculate(operations: readonly Operation[]): Report {
  const report = new Report();
  report.operationsRead = operations.length;
  const holdings = new Map<string, Lot[]>();

  const ordered = [...operations].sort((a, b) =>
    a.datetime < b.datetime ? -1 : a.datetime > b.datetime ? 1 : 0,
  );

  for (const row of ordered) {
    const { type, date: day } = row;
    const amount = dec(row.amount);
    const fee = dec(row.fee);
    const tax = dec(row.tax);

    // Fees and taxes must be collected wherever they appear, before any
    // branch bails out: TAX_OPTIMIZATION and CARD_ORDERING_FEE carry their
    // whole amount here and nowhere else.
    report.fees = report.fees.plus(fee.negated());
    if (!tax.isZero()) {
      report.taxes[type] = (report.taxes[type] ?? ZERO).plus(tax.negated());
    }
    report.record(day, 2, fee.negated().plus(tax.negated()));

    const category = categoryOf(type);

    if (category === null) {
      report.unclassified.count += 1;
      report.unclassified.amount = report.unclassified.amount.plus(amount);
      if (!report.unclassified.types.includes(type)) report.unclassified.types.push(type);
      continue;
    }

    if (category === 'NEUTRAL' || category === 'TAXES' || category === 'ACCOUNT_COSTS') continue;

    if (category === 'INCOME') {
      // On DIVIDEND rows `shares` is the position that produced the coupon,
      // not units received: income never touches the holdings.
      report.income[type] = (report.income[type] ?? ZERO).plus(amount);
      const byType = (report.incomePerDay[day] ??= {});
      byType[type] = (byType[type] ?? ZERO).plus(amount);
      report.record(day, 1, amount);
      continue;
    }

    if (category === 'CARD_SPENDING') {
      report.cardSpending = report.cardSpending.plus(amount.negated());
      continue;
    }

    if (category === 'CAPITAL_MOVEMENTS') {
      if (amount.gte(0)) report.deposits = report.deposits.plus(amount);
      else report.withdrawals = report.withdrawals.plus(amount.negated());
      continue;
    }

    const symbol = row.symbol;
    const security = (report.bySecurity[symbol] ??= new SecurityResult(symbol, row.name));
    if (security.assetClass === '') security.assetClass = row.assetClass;
    let lots = holdings.get(symbol);
    if (!lots) holdings.set(symbol, (lots = []));
    const quantity = dec(row.shares);

    if (category === 'FREE_LOTS') {
      lots.push({ quantity, unitCost: ZERO, acquiredAt: day });
      continue;
    }

    if (category === 'FREE_LOTS_CANCELLED') {
      // Cancelling a grant must release a zero-cost lot, not consume purchased
      // units: doing the latter invents a loss that never happened.
      const left = releaseFreeLots(lots, quantity.negated());
      if (!left.isZero()) {
        report.anomalies.push({
          code: 'UNMATCHED_FREE_LOT_CANCELLATION',
          symbol,
          quantity: left,
        });
      }
      continue;
    }

    if (type === 'BUY') {
      lots.push({ quantity, unitCost: amount.negated().div(quantity), acquiredAt: day });
      // Il costo del lotto è `amount` al lordo di zero commissioni: `fee` non
      // entra mai in un lotto, ed è già spesata una volta sola in `fees`.
      report.invest(day, amount.negated());
      continue;
    }

    // SELL: consume lots oldest first.
    const soldQuantity = quantity.negated();
    let left = soldQuantity;
    security.proceeds = security.proceeds.plus(amount);
    let costOfSale = ZERO;
    while (left.gt(0) && lots.length > 0) {
      const lot = lots[0]!;
      const used = Decimal.min(left, lot.quantity);
      const cost = used.times(lot.unitCost);
      costOfSale = costOfSale.plus(cost);
      report.closures.push({
        symbol,
        assetClass: security.assetClass,
        quantity: used,
        acquiredAt: lot.acquiredAt,
        soldAt: day,
        cost,
        proceeds: amount.times(used).div(soldQuantity),
      });
      lot.quantity = lot.quantity.minus(used);
      left = left.minus(used);
      if (lot.quantity.isZero()) lots.shift();
    }
    security.costOfSold = security.costOfSold.plus(costOfSale);
    report.record(day, 0, amount.minus(costOfSale));
    report.invest(day, costOfSale.negated());
    if (left.gt(0)) {
      security.uncoveredSales = security.uncoveredSales.plus(left);
      report.anomalies.push({ code: 'UNCOVERED_SALE', symbol, quantity: left });
    }
  }

  for (const [symbol, lots] of holdings) {
    const security = report.security(symbol);
    security.remainingQuantity = sum(lots.map((l) => l.quantity));
    security.remainingCost = sum(lots.map((l) => l.quantity.times(l.unitCost)));
  }

  return report;
}
