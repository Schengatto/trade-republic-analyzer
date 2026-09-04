import type { Report, SecurityResult } from './fifo';
import { Decimal, ZERO, dec } from './money';
import type { Operation } from './operation';
import { daysBetween, minusPeriod, plusOneDay } from './dates';

/** Asset class bucket for securities whose export rows leave the field blank. */
export const UNCLASSIFIED_ASSET_CLASS = 'UNCLASSIFIED';

// --- cumulative daily series ---------------------------------------------

export interface SeriesPoint {
  date: string;
  /** Cumulative trading profit. */
  trading: Decimal;
  /** Cumulative net profit: trading plus income minus charges. */
  net: Decimal;
  /** What that single day contributed. */
  dayProfit: Decimal;
}

/**
 * Day-by-day cumulative profit, for the line chart. Only days on which the
 * profit actually moved get a point: a purchase moves cash, not profit.
 */
export function timeSeries(report: Report): SeriesPoint[] {
  let trading = ZERO;
  let income = ZERO;
  let charges = ZERO;
  const points: SeriesPoint[] = [];
  for (const day of Object.keys(report.perDay).sort()) {
    const [dayTrading, dayIncome, dayCharges] = report.perDay[day]!;
    trading = trading.plus(dayTrading);
    income = income.plus(dayIncome);
    charges = charges.plus(dayCharges);
    points.push({
      date: day,
      trading,
      net: trading.plus(income).minus(charges),
      dayProfit: dayTrading.plus(dayIncome).minus(dayCharges),
    });
  }
  return points;
}

// --- date helpers ---------------------------------------------------------

/**
 * Latest value date in the file. Windows are measured back from here rather
 * than from today, so an export from six months ago still shows real numbers
 * instead of seven empty windows.
 */
export function anchorDate(operations: readonly Operation[]): string | null {
  let latest: string | null = null;
  for (const row of operations) {
    if (row.date && (latest === null || row.date > latest)) latest = row.date;
  }
  return latest;
}

function earliestDate(operations: readonly Operation[]): string | null {
  let first: string | null = null;
  for (const row of operations) {
    if (row.date && (first === null || row.date < first)) first = row.date;
  }
  return first;
}

// --- profit components -----------------------------------------------------

/**
 * A realized profit, split by what produced it.
 *
 * `trading + dividends + interest + otherIncome - charges` is the profit — not
 * by convention but by construction: both callers derive their total from
 * these five with `totalOf`, so a total and the parts under it cannot drift
 * apart. The same split serves a month and a time window; only the range of
 * days folded into it differs.
 */
export interface ProfitComponents {
  /** Realized result of closed positions, fees on the lots included. */
  trading: Decimal;
  dividends: Decimal;
  interest: Decimal;
  /** Every other income type — saveback today, whatever classify.ts adds later. */
  otherIncome: Decimal;
  /** Fees and taxes together, as a positive cost; the view puts them below zero. */
  charges: Decimal;
}

/** The two income types the composition names in their own right. */
const DIVIDEND_TYPE = 'DIVIDEND';
const INTEREST_TYPE = 'INTEREST_PAYMENT';

function emptyComponents(): ProfitComponents {
  return {
    trading: ZERO,
    dividends: ZERO,
    interest: ZERO,
    otherIncome: ZERO,
    charges: ZERO,
  };
}

/**
 * Route one day's income of one type into its bucket.
 *
 * Shared so that a type named here stays named in both the monthly and the
 * window split: classifying in two places is how the same dividend ends up
 * under "other income" in one table and not the other.
 */
function addIncome(into: ProfitComponents, type: string, amount: Decimal): void {
  if (type === DIVIDEND_TYPE) into.dividends = into.dividends.plus(amount);
  else if (type === INTEREST_TYPE) into.interest = into.interest.plus(amount);
  else into.otherIncome = into.otherIncome.plus(amount);
}

function totalOf(components: ProfitComponents): Decimal {
  return components.trading
    .plus(components.dividends)
    .plus(components.interest)
    .plus(components.otherIncome)
    .minus(components.charges);
}

/**
 * The split over a closed range of days, with whether anything landed in it.
 *
 * `moved` answers a different question from "are there rows here": a deposit
 * fills a day with activity and moves no profit at all.
 */
function componentsIn(
  report: Report,
  from: string,
  to: string,
): { components: ProfitComponents; moved: boolean } {
  const components = emptyComponents();
  let moved = false;

  for (const [day, [trading, , charges]] of Object.entries(report.perDay)) {
    if (day < from || day > to) continue;
    moved = true;
    components.trading = components.trading.plus(trading);
    components.charges = components.charges.plus(charges);
  }

  // The daily income total in `perDay` is deliberately not read here:
  // `incomePerDay` holds the same money already split by type, so taking both
  // would double it.
  for (const [day, byType] of Object.entries(report.incomePerDay)) {
    if (day < from || day > to) continue;
    moved = true;
    for (const [type, amount] of Object.entries(byType)) addIncome(components, type, amount);
  }

  return { components, moved };
}

// --- time windows ---------------------------------------------------------

export const WINDOW_KEYS = ['ALL', '1Y', '6M', '3M', '1M', '1W', '1D'] as const;
export type WindowKey = (typeof WINDOW_KEYS)[number];

const WINDOW_PERIODS: Record<Exclude<WindowKey, 'ALL'>, { days?: number; months?: number }> = {
  '1Y': { months: 12 },
  '6M': { months: 6 },
  '3M': { months: 3 },
  '1M': { months: 1 },
  '1W': { days: 7 },
  '1D': { days: 1 },
};

/**
 * Il perimetro inclusivo di una finestra, o `null` su un file senza date.
 *
 * Esportata perché più di una sezione parla di «ultimi tre mesi»: due
 * definizioni dello stesso periodo sarebbero un difetto anche con ogni singolo
 * numero giusto.
 */
export function windowRange(
  operations: readonly Operation[],
  key: WindowKey,
): { from: string; to: string } | null {
  const anchor = anchorDate(operations);
  if (anchor === null) return null;
  const from =
    key === 'ALL'
      ? earliestDate(operations)!
      : plusOneDay(minusPeriod(anchor, WINDOW_PERIODS[key]));
  return { from, to: anchor };
}

export interface WindowSummary {
  key: WindowKey;
  /** First day covered, inclusive. */
  from: string;
  /** Last day covered, inclusive: the anchor date. */
  to: string;
  /**
   * True when nothing in the window moved the profit and nothing was traded.
   * A window can still hold rows — a deposit moves cash, not profit. Callers
   * must say "no movement" rather than show 0,00, which reads as "broke even".
   *
   * Note this is never about having no rows: the anchor is the last date in
   * the file, so even the one day window always contains at least one row.
   */
  empty: boolean;
  /** Realized profit: closed trades plus income minus fees and taxes. */
  profit: Decimal;
  /** What that profit is made of, for the composition table under the totals. */
  components: ProfitComponents;
  buys: Decimal;
  sells: Decimal;
  netDeposits: Decimal;
  operations: number;
}

export function windowSummaries(
  operations: readonly Operation[],
  report: Report,
): WindowSummary[] {
  return WINDOW_KEYS.flatMap((key) => {
    const range = windowRange(operations, key);
    if (range === null) return [];
    return [summarize(operations, report, key, range.from, range.to)];
  });
}

function summarize(
  operations: readonly Operation[],
  report: Report,
  key: WindowKey,
  from: string,
  to: string,
): WindowSummary {
  let buys = ZERO;
  let sells = ZERO;
  let netDeposits = ZERO;
  let count = 0;
  let touched = false;

  for (const row of operations) {
    if (row.date < from || row.date > to) continue;
    count += 1;
    const amount = dec(row.amount);
    if (row.type === 'BUY') {
      buys = buys.plus(amount.abs());
      touched = true;
    } else if (row.type === 'SELL') {
      sells = sells.plus(amount);
      touched = true;
    }
    // Deposits and withdrawals are classified by the engine; the same category
    // boundary applies here, over the window.
    if (CAPITAL_TYPES.has(row.type)) netDeposits = netDeposits.plus(amount);
  }

  const { components, moved } = componentsIn(report, from, to);
  if (moved) touched = true;

  return {
    key,
    from,
    to,
    empty: !touched,
    // Derived from the components, never summed on its own: the totals table
    // and the composition table under it show the same arithmetic.
    profit: totalOf(components),
    components,
    buys,
    sells,
    netDeposits,
    operations: count,
  };
}

const CAPITAL_TYPES = new Set([
  'CUSTOMER_INBOUND',
  'CUSTOMER_OUTBOUND_REQUEST',
  'TRANSFER_INBOUND',
  'TRANSFER_OUTBOUND',
  'TRANSFER_INSTANT_INBOUND',
  'TRANSFER_INSTANT_OUTBOUND',
  'MANUAL_CASH_TRANSFER',
]);

// --- monthly aggregates ---------------------------------------------------

export interface MonthlyAggregate {
  /** YYYY-MM */
  month: string;
  profit: Decimal;
  /**
   * BUY and SELL rows in the month. An order is often split across two rows,
   * so this exceeds the number of orders actually placed — callers must say so
   * on the chart label.
   */
  transactions: number;
  /** What the month's profit is made of, for the stacked chart. */
  components: ProfitComponents;
}

/**
 * Profit and trade count per month, over a continuous axis: months with no
 * activity stay in the list as empty buckets, because skipping them would
 * compress the axis and falsify the tempo of the account.
 */
export function monthlyAggregates(
  operations: readonly Operation[],
  report: Report,
): MonthlyAggregate[] {
  const first = earliestDate(operations);
  const last = anchorDate(operations);
  if (first === null || last === null) return [];

  const parts = new Map<string, ProfitComponents>();
  const partsOf = (month: string): ProfitComponents => {
    let found = parts.get(month);
    if (!found) parts.set(month, (found = emptyComponents()));
    return found;
  };

  for (const [day, [trading, , charges]] of Object.entries(report.perDay)) {
    const month = partsOf(day.slice(0, 7));
    month.trading = month.trading.plus(trading);
    month.charges = month.charges.plus(charges);
  }

  // The daily income total is deliberately not read here: `incomePerDay` holds
  // the same money already split by type, so taking both would double it.
  for (const [day, byType] of Object.entries(report.incomePerDay)) {
    const month = partsOf(day.slice(0, 7));
    for (const [type, amount] of Object.entries(byType)) addIncome(month, type, amount);
  }

  const counts = new Map<string, number>();
  for (const row of operations) {
    if (row.type !== 'BUY' && row.type !== 'SELL') continue;
    const month = row.date.slice(0, 7);
    counts.set(month, (counts.get(month) ?? 0) + 1);
  }

  const months: MonthlyAggregate[] = [];
  for (const month of monthRange(first.slice(0, 7), last.slice(0, 7))) {
    const components = parts.get(month) ?? emptyComponents();
    months.push({
      month,
      // Derived from the components rather than summed separately: the total
      // shown above the stacked chart is then the same arithmetic the stack is.
      profit: totalOf(components),
      transactions: counts.get(month) ?? 0,
      components,
    });
  }
  return months;
}

export interface YearMargin {
  year: string;
  profit: Decimal;
}

export interface CalendarMonthMargin {
  /** 1-12. */
  month: number;
  profit: Decimal;
  /** False where no year in the file reaches this month at all. */
  present: boolean;
}

export interface MonthlyMargins {
  byYear: YearMargin[];
  /** Twelve, January first: every year's January added together, and so on. */
  byMonth: CalendarMonthMargin[];
  /** Every month in the file. Both margins add up to this. */
  grand: Decimal;
}

/**
 * The two margins of the month grid: one total per year, one per calendar
 * month, and the corner where they meet.
 *
 * The same money read two ways, so the two sums must agree — and they do by
 * construction, both being folds of the one list of months. Summed here rather
 * than in the view because `src/ui` may do no decimal arithmetic: adding the
 * plotted floats back up would drift the cents against the figure the report
 * prints elsewhere on the page.
 */
export function monthlyMargins(months: readonly MonthlyAggregate[]): MonthlyMargins {
  const years = new Map<string, Decimal>();
  const calendar = new Map<number, Decimal>();

  for (const entry of months) {
    const year = entry.month.slice(0, 4);
    const month = Number(entry.month.slice(5, 7));
    years.set(year, (years.get(year) ?? ZERO).plus(entry.profit));
    calendar.set(month, (calendar.get(month) ?? ZERO).plus(entry.profit));
  }

  return {
    byYear: [...years].map(([year, profit]) => ({ year, profit })),
    byMonth: Array.from({ length: 12 }, (_, index) => ({
      month: index + 1,
      profit: calendar.get(index + 1) ?? ZERO,
      present: calendar.has(index + 1),
    })),
    grand: months.reduce((sum, entry) => sum.plus(entry.profit), ZERO),
  };
}

function monthRange(from: string, to: string): string[] {
  const [fromYear, fromMonth] = from.split('-').map(Number) as [number, number];
  const [toYear, toMonth] = to.split('-').map(Number) as [number, number];
  const months: string[] = [];
  for (let n = fromYear * 12 + fromMonth - 1; n <= toYear * 12 + toMonth - 1; n++) {
    months.push(`${String(Math.floor(n / 12)).padStart(4, '0')}-${String((n % 12) + 1).padStart(2, '0')}`);
  }
  return months;
}

// --- asset class ----------------------------------------------------------

export interface AssetClassProfit {
  assetClass: string;
  profit: Decimal;
}

/** Realized profit split by asset class, largest first. */
export function profitByAssetClass(report: Report): AssetClassProfit[] {
  const totals = new Map<string, Decimal>();
  for (const security of Object.values(report.bySecurity)) {
    const key = security.assetClass || UNCLASSIFIED_ASSET_CLASS;
    totals.set(key, (totals.get(key) ?? ZERO).plus(security.profit));
  }
  return [...totals]
    .map(([assetClass, profit]) => ({ assetClass, profit }))
    .sort((a, b) => b.profit.comparedTo(a.profit));
}

// --- return on capital ----------------------------------------------------

/**
 * Net profit as a percentage of the capital actually left with the broker.
 *
 * Null when nothing net was paid in: with a zero denominator there is no
 * percentage to state, and a withdrawn-in-full account would otherwise divide
 * by zero. The caller shows the capital figure without a rate.
 */
export function returnOnCapital(report: Report): Decimal | null {
  const capital = report.netCapitalPaidIn;
  if (capital.isZero()) return null;
  return report.netProfit.div(capital).times(100);
}

// --- cost drag ------------------------------------------------------------

/**
 * Fees as a percentage of the gross profit: how much of what the account
 * earned went to the broker for the trading itself.
 *
 * The base is the gross profit, income included, because a fee is paid out of
 * everything earned and not out of the trading alone. It is sound to divide by
 * it: `amount` is gross of `fee`, so the fee is expensed exactly once, into
 * `Report.fees`, and never folded into the cost of a lot (see `fifo.ts`).
 *
 * Null unless the gross profit is positive. A share of zero does not exist,
 * and a share of a loss would carry the sign of the base rather than the size
 * of the drag — fees of 1.00 against a gross loss of 40.00 would print
 * -2.50%, which reads as though the fee had paid the account. The caller shows
 * the fee figure without a rate.
 */
export function costDrag(report: Report): Decimal | null {
  const gross = report.grossProfit;
  if (!gross.gt(0)) return null;
  return report.fees.div(gross).times(100);
}

// --- win rate -------------------------------------------------------------

export interface WinRate {
  /** Securities on which at least one sale has been matched. */
  closed: number;
  wins: number;
  losses: number;
  /** Closed at exactly break-even: neither a win nor a loss. */
  breakEven: number;
  ratePercent: Decimal;
  /** Mean gain across winners, as a positive number. */
  averageWin: Decimal;
  /** Mean loss across losers, as a positive number. */
  averageLoss: Decimal;
}

/**
 * Hit rate together with average win and average loss. Never report the rate
 * on its own: a high rate with losses larger than wins still ends up negative.
 */
export function winRate(report: Report): WinRate | null {
  const closedPositions = Object.values(report.bySecurity).filter(isClosed);
  if (closedPositions.length === 0) return null;

  const wins = closedPositions.filter((s) => s.profit.gt(0));
  const losses = closedPositions.filter((s) => s.profit.lt(0));
  const totalWin = wins.reduce((total, s) => total.plus(s.profit), ZERO);
  const totalLoss = losses.reduce((total, s) => total.plus(s.profit.negated()), ZERO);

  return {
    closed: closedPositions.length,
    wins: wins.length,
    losses: losses.length,
    breakEven: closedPositions.length - wins.length - losses.length,
    ratePercent: new Decimal(wins.length).div(closedPositions.length).times(100),
    averageWin: wins.length === 0 ? ZERO : totalWin.div(wins.length),
    averageLoss: losses.length === 0 ? ZERO : totalLoss.div(losses.length),
  };
}

function isClosed(security: SecurityResult): boolean {
  return !security.proceeds.isZero() || !security.costOfSold.isZero();
}

// --- top and flop ---------------------------------------------------------

export interface RankedSecurity {
  symbol: string;
  name: string;
  profit: Decimal;
}

/**
 * The `count` best securities by realized profit, and the `count` worst of
 * those that actually lost money.
 *
 * The worst list is not the ranking read backwards. In an account where every
 * closed position gained, the tail of the ranking is still a set of profits,
 * and listing them as the worst states a loss that never happened — the table
 * would contradict its own heading, in the gain colour. A position that closed
 * exactly flat did not lose either, so it is left out of both.
 */
export function topAndFlop(
  report: Report,
  count: number,
): { top: RankedSecurity[]; flop: RankedSecurity[] } {
  const ranked = Object.values(report.bySecurity)
    .filter(isClosed)
    .map((s) => ({ symbol: s.symbol, name: s.name, profit: s.profit }))
    .sort((a, b) => b.profit.comparedTo(a.profit));

  return {
    top: ranked.slice(0, count),
    flop: [...ranked]
      .reverse()
      .filter((entry) => entry.profit.isNegative())
      .slice(0, count),
  };
}

// --- holding duration -----------------------------------------------------

export interface HoldingDuration {
  meanDays: number;
  /** Reported next to the mean: a few very long holds distort the mean. */
  medianDays: number;
  byAssetClass: { assetClass: string; meanDays: number; closures: number }[];
}

export function holdingDuration(report: Report): HoldingDuration | null {
  if (report.closures.length === 0) return null;

  const days = report.closures.map((c) => daysBetween(c.acquiredAt, c.soldAt));
  const byClass = new Map<string, number[]>();
  for (const closure of report.closures) {
    const key = closure.assetClass || UNCLASSIFIED_ASSET_CLASS;
    const bucket = byClass.get(key) ?? [];
    bucket.push(daysBetween(closure.acquiredAt, closure.soldAt));
    byClass.set(key, bucket);
  }

  return {
    meanDays: mean(days),
    medianDays: median(days),
    byAssetClass: [...byClass].map(([assetClass, values]) => ({
      assetClass,
      meanDays: mean(values),
      closures: values.length,
    })),
  };
}

// --- per-security detail ---------------------------------------------------

/**
 * One closed position, with the attributes that say what kind of trade it was.
 *
 * Deliberately not the five profit parts the monthly and window sections show.
 * Those parts sum to the profit printed beside them; a security's profit is
 * `proceeds - costOfSold` and nothing else, because interest is paid on cash,
 * and income and charges are collected per operation type rather than per
 * symbol. Columns that did not add up to the total next to them would be read
 * as an arithmetic error. These are attributes of the trade instead: none of
 * them is an addend, so none of them has to reconcile.
 */
export interface SecurityDetail {
  symbol: string;
  name: string;
  proceeds: Decimal;
  costOfSold: Decimal;
  profit: Decimal;
  /** Null when the sold lots cost nothing: a free grant has no base to return on. */
  yieldPercent: Decimal | null;
  lotsClosed: number;
  /** Null when no lot was actually consumed, as on an uncovered sale. */
  meanDays: number | null;
}

/** Every closed position, best profit first, with its shape alongside its size. */
export function securityDetails(report: Report): SecurityDetail[] {
  const closuresBySymbol = new Map<string, number[]>();
  for (const closure of report.closures) {
    const bucket = closuresBySymbol.get(closure.symbol) ?? [];
    bucket.push(daysBetween(closure.acquiredAt, closure.soldAt));
    closuresBySymbol.set(closure.symbol, bucket);
  }

  return Object.values(report.bySecurity)
    .filter(isClosed)
    .map((security) => {
      const days = closuresBySymbol.get(security.symbol) ?? [];
      return {
        symbol: security.symbol,
        name: security.name,
        proceeds: security.proceeds,
        costOfSold: security.costOfSold,
        profit: security.profit,
        yieldPercent: security.costOfSold.isZero()
          ? null
          : security.profit.div(security.costOfSold).times(100),
        lotsClosed: days.length,
        meanDays: days.length === 0 ? null : mean(days),
      };
    })
    .sort((a, b) => b.profit.comparedTo(a.profit));
}

function mean(values: number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]!
    : (sorted[middle - 1]! + sorted[middle]!) / 2;
}
