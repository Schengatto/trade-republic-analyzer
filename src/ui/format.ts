/**
 * Locale-aware rendering of the values the core produces.
 *
 * Presentation only: this module reads `Decimal` values and turns them into
 * strings. It never does arithmetic on them — every figure shown here was
 * already computed in `src/core/`.
 */

import type { Decimal } from '../core/money';
import type { Language } from './i18n';

/**
 * Every locale here is a euro-area one, because the euro is the account
 * currency and `Intl` formats it natively there (€1.234,56) instead of marking
 * it as foreign. That is why English is `en-IE` rather than `en-GB` or `en-US`,
 * and why Portuguese is `pt-PT`: `pt-BR` would put the real first.
 */
const LOCALES: Record<Language, string> = {
  it: 'it-IT',
  en: 'en-IE',
  de: 'de-DE',
  fr: 'fr-FR',
  es: 'es-ES',
  nl: 'nl-NL',
  pt: 'pt-PT',
};

/**
 * `Intl` formatters are expensive to build and get called once per table cell,
 * so each distinct shape is built once and reused.
 */
const cache = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat>();

function numberFormat(language: Language, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `n:${language}:${JSON.stringify(options)}`;
  let found = cache.get(key);
  if (!found) {
    found = new Intl.NumberFormat(LOCALES[language], options);
    cache.set(key, found);
  }
  return found as Intl.NumberFormat;
}

function dateFormat(language: Language, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `d:${language}:${JSON.stringify(options)}`;
  let found = cache.get(key);
  if (!found) {
    // Always UTC: the dates are plain calendar days from the export, and a
    // local timezone would shift them a day either way.
    found = new Intl.DateTimeFormat(LOCALES[language], { ...options, timeZone: 'UTC' });
    cache.set(key, found);
  }
  return found as Intl.DateTimeFormat;
}

/**
 * Amounts arrive either as a `Decimal` from the core or as a plain number from
 * a plotted coordinate. Both go through the same locale rules.
 */
export type Amount = Decimal | number;

function toNumber(value: Amount): number {
  return typeof value === 'number' ? value : value.toNumber();
}

/** An amount in euro, e.g. `1.234,56 €` in Italian. */
export function formatCurrency(language: Language, value: Amount): string {
  return numberFormat(language, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

/**
 * An amount that carries an explicit `+` when positive.
 *
 * Used wherever the figure is a result rather than a size: a profit of 12 € and
 * a loss of 12 € must not look alike at a glance.
 */
export function formatSignedCurrency(language: Language, value: Amount): string {
  return numberFormat(language, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: 'exceptZero',
  }).format(toNumber(value));
}

/**
 * The same signed amount, abbreviated: `+22,4K €`, `-19,4K €`, `+1,2 Mln €`.
 *
 * For grid cells, where twelve figures share a row and the widest one would
 * otherwise set the width of every column. The abbreviation is locale-owned —
 * Italian says `K` and `Mln`, `en-IE` says `K` and `M` and leads with the
 * symbol — so nothing here is spelled by hand.
 *
 * One decimal, which loses the cents below a thousand: `5,10 €` prints as
 * `+5,1 €`. Anywhere this is used the exact figure must stay one hover, one
 * accessible name or one table row away, because this string alone cannot be
 * added up or reconciled.
 */
export function formatCompactCurrency(language: Language, value: Amount): string {
  return numberFormat(language, {
    style: 'currency',
    currency: 'EUR',
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
    signDisplay: 'exceptZero',
  }).format(toNumber(value));
}

/**
 * A charge, written with the minus sign it earns.
 *
 * The engine stores fees and taxes as positive magnitudes, because that is what
 * they are: a size, not a result (`report.fees` collects `fee.negated()`).
 * Printed that way under a heading promising to show how the net profit is
 * reached, they leave the reader to infer the subtraction — and `netProfit`
 * really is `grossProfit.minus(fees).minus(totalTaxes)`, so the subtraction is
 * the whole point.
 *
 * The flip happens on the float `Intl` is handed anyway, and negation is exact
 * in IEEE-754. No decimal arithmetic occurs here and the magnitude the core
 * computed is untouched.
 */
export function formatDeduction(language: Language, value: Amount): string {
  const amount = toNumber(value);
  // Nothing taken away is zero, never "-0,00 €".
  return formatSignedCurrency(language, amount === 0 ? 0 : -amount);
}

/**
 * A percentage already expressed on a 0–100 scale by the core.
 *
 * Formatted with the `percent` unit rather than `style: 'percent'`, which would
 * multiply by 100 — the core already did that, and re-scaling here would be
 * arithmetic in the presentation layer.
 */
export function formatPercent(language: Language, value: Amount, digits = 2): string {
  return numberFormat(language, {
    style: 'unit',
    unit: 'percent',
    unitDisplay: 'narrow',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(toNumber(value));
}

/**
 * A percentage that carries an explicit `+` when positive.
 *
 * The percent counterpart of `formatSignedCurrency`, for a column whose sign is
 * the message: a yield of +50% and one of -50% must not look alike at a glance.
 */
export function formatSignedPercent(language: Language, value: Amount, digits = 2): string {
  return numberFormat(language, {
    style: 'unit',
    unit: 'percent',
    unitDisplay: 'narrow',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    signDisplay: 'exceptZero',
  }).format(toNumber(value));
}

/** A share count, which can carry fractions on savings plans. */
export function formatQuantity(language: Language, value: Amount): string {
  return numberFormat(language, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  }).format(toNumber(value));
}

/**
 * A bare ratio — a profit factor, not a quantity and not a currency.
 *
 * Two decimals because a third says nothing a reader can act on, and because
 * `formatQuantity`'s six would print `1,750000`.
 */
export function formatRatio(language: Language, value: Decimal): string {
  return numberFormat(language, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

export function formatInteger(language: Language, value: number): string {
  return numberFormat(language, { maximumFractionDigits: 0 }).format(value);
}

export function formatDays(language: Language, value: number): string {
  return numberFormat(language, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value);
}

/** `2024-03-07` rendered as a full calendar date in the reader's language. */
export function formatDate(language: Language, iso: string): string {
  const parsed = parseIsoDate(iso);
  if (parsed === null) return iso;
  return dateFormat(language, { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed);
}

/** `2024-03` rendered as a month and year. */
export function formatMonth(language: Language, iso: string): string {
  const parsed = parseIsoDate(`${iso}-01`);
  if (parsed === null) return iso;
  return dateFormat(language, { month: 'short', year: 'numeric' }).format(parsed);
}

/** A date and time, for the "generated on" line of the printed report. */
export function formatDateTime(language: Language, when: Date): string {
  return new Intl.DateTimeFormat(LOCALES[language], {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(when);
}

function parseIsoDate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return null;
  const [, year, month, day] = match as unknown as [string, string, string, string];
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
}
