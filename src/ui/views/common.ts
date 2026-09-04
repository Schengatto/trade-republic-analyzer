/**
 * Pieces shared by the report sections, and the context handed to each of them.
 *
 * Views receive figures that `src/core/` already computed and turn them into
 * elements. They do no arithmetic of their own.
 */

import type { Reconciliation } from '../../core/reconcile';
import type { Report } from '../../core/fifo';
import type { Operation } from '../../core/operation';
import type { Cell } from '../chart/figure';
import { el } from '../dom';
import {
  formatCurrency,
  formatDays,
  formatDeduction,
  formatPercent,
  formatSignedCurrency,
  formatSignedPercent,
} from '../format';
import type { Language, MessageKey, Translator } from '../i18n';
import type { Decimal } from '../../core/money';

export interface ReportContext {
  operations: readonly Operation[];
  report: Report;
  reconciliation: Reconciliation;
  language: Language;
  t: Translator;
}

export type SectionView = (context: ReportContext) => HTMLElement | null;

/**
 * How much weight a section carries.
 *
 * `lead` is for the one section that answers the question the reader arrived
 * with — the rest are the evidence behind it. Fourteen sections rendered at
 * identical weight is a list, not a report: nothing tells the eye where to land.
 */
export type SectionVariant = 'lead' | 'default';

/** A titled report section, addressable from the print header and the rail. */
export function section(
  id: string,
  title: string,
  children: (Node | false | null)[],
  variant: SectionVariant = 'default',
): HTMLElement {
  const root = el('section', { class: `section section--${variant}`, id }, [
    el('h2', { class: 'section__title' }, [title]),
    ...children,
  ]);

  // A section holding one figure names it twice: once as the section heading,
  // once as the figure's own. The figure keeps its heading for screen readers
  // and for the table view, but stops printing the same words twice.
  const figureTitles = [...root.querySelectorAll('.figure__title')];
  const only = figureTitles.length === 1 ? figureTitles[0] : undefined;
  if (only?.textContent === title) only.classList.add('visually-hidden');

  return root;
}

/** A short explanatory paragraph under a heading. */
export function note(message: string): HTMLElement {
  return el('p', { class: 'note' }, [message]);
}

export interface TileSpec {
  label: string;
  value: string;
  hint?: string;
  /** Colours the value by sign. Only for figures where sign is the message. */
  signed?: Decimal;
}

export function statTile(spec: TileSpec): HTMLElement {
  return el('div', { class: 'tile' }, [
    el('p', { class: 'tile__label' }, [spec.label]),
    el(
      'p',
      { class: `tile__value ${spec.signed ? signClass(spec.signed) : ''}`.trim() },
      [spec.value],
    ),
    spec.hint ? el('p', { class: 'tile__hint' }, [spec.hint]) : false,
  ]);
}

/**
 * Half of the last digit any figure prints: money and percentages both show two
 * decimals, so anything under this rounds to `0,00` on the page. The bound is
 * exclusive because `Intl` rounds a tie away from zero, and so must this.
 */
const HALF_OF_THE_LAST_PRINTED_DIGIT = '0.005';

/**
 * Whether the figure the reader sees is zero — which is not the same question as
 * whether the value behind it is.
 *
 * Colour describes the printed number. A residue far below a cent prints
 * `0,00`, and colouring it by its true sign put a red zero directly beneath the
 * green "balanced" verdict in the cash reconciliation, whose own tolerance
 * accepts exactly that residue. The figure has to agree with itself.
 *
 * Exported because the same question decides whether a line is worth printing
 * at all: a sentence announcing `-0,00 €` of charges is noise.
 */
export function printsAsZero(value: Decimal): boolean {
  return value.abs().lt(HALF_OF_THE_LAST_PRINTED_DIGIT);
}

/**
 * Sign is carried by the explicit `+`/`-` in the formatted number as well as by
 * the colour, so the figure is never colour-alone.
 */
export function signClass(value: Decimal): string {
  if (printsAsZero(value)) return 'is-neutral';
  return value.isNegative() ? 'is-negative' : 'is-positive';
}

/**
 * A charge is never a gain, however it is stored.
 *
 * `signClass` would paint a fee of 8 € in the positive colour, because the
 * magnitude the engine keeps is positive. What is being shown is money leaving,
 * so it takes the negative colour — unless nothing was taken at all.
 */
export function deductionClass(value: Decimal): string {
  return printsAsZero(value) ? 'is-neutral' : 'is-negative';
}

export interface AmountRow {
  label: string;
  value: Decimal;
  signed?: boolean;
  /**
   * The row is subtracted from the total above it. Renders the positive
   * magnitude the core stores as the negative it represents.
   */
  deduction?: boolean;
  emphasis?: boolean;
}

/**
 * A rate stated underneath the sum it was measured against.
 *
 * Its own row, and its own label, because the figure beside it is in euro: a
 * bare percentage next to a fee reads as the rate that was charged rather than
 * the share of the result it consumed.
 *
 * `null` is a rate that does not exist, and prints as `NOTHING`. The core
 * returns it where the base is not positive, and `0%` there would state a
 * result — that no fee was paid — instead of the absence of one.
 */
export interface RateRow {
  label: string;
  rate: Decimal | null;
}

/** A label/amount list, the shape most of the composition sections take. */
export function amountList(context: ReportContext, rows: (AmountRow | RateRow)[]): HTMLElement {
  return el(
    'dl',
    { class: 'amounts' },
    rows.flatMap((row) =>
      'rate' in row ? rateCells(context.language, row) : amountCells(context, row),
    ),
  );
}

function rateCells(language: Language, row: RateRow): HTMLElement[] {
  return [
    el('dt', {}, [row.label]),
    el('dd', { class: 'is-numeric is-rate' }, [
      row.rate === null ? NOTHING : formatPercent(language, row.rate),
    ]),
  ];
}

function amountCells(context: ReportContext, row: AmountRow): HTMLElement[] {
  return [
    el('dt', { class: row.emphasis ? 'is-emphasis' : undefined }, [row.label]),
    el(
      'dd',
      {
        class: [
          'is-numeric',
          row.emphasis ? 'is-emphasis' : '',
          row.signed ? signClass(row.value) : '',
          row.deduction ? deductionClass(row.value) : '',
        ]
          .filter(Boolean)
          .join(' '),
      },
      [amountText(context.language, row)],
    ),
  ];
}

/**
 * A money cell for a table column whose sign is the message.
 *
 * The tiles and amount lists have always coloured a loss; the tables printed it
 * in body ink, so the same figure meant different things in different parts of
 * the report. The `+`/`-` in the text still carries the sign on its own — the
 * colour is a second channel, never the only one.
 */
export function signedCell(language: Language, value: Decimal): Cell {
  return {
    text: formatSignedCurrency(language, value),
    tone: printsAsZero(value) ? 'neutral' : value.isNegative() ? 'negative' : 'positive',
  };
}

/**
 * A number of days, in the singular when there is exactly one.
 *
 * Both catalogues pluralize on exactly 1, so the check is an equality rather
 * than `Intl.PluralRules`: a language whose rules differ would need the real
 * thing, and this app ships two that do not. A mean of 1.5 stays plural.
 */
export function daysLabel(t: Translator, language: Language, days: number): string {
  return t(days === 1 ? 'holding.day' : 'holding.days', {
    count: formatDays(language, days),
  });
}

/**
 * Stands in for a figure that does not exist, as opposed to one that is zero.
 *
 * A percentage of nothing and a holding period of nothing are not `0`: printing
 * the number would state a result where none was reached.
 */
export const NOTHING = '—';

/** The percent counterpart of `signedCell`, for a column that states a return. */
export function signedPercentCell(language: Language, value: Decimal | null): Cell {
  if (value === null) return NOTHING;
  return {
    text: formatSignedPercent(language, value),
    tone: printsAsZero(value) ? 'neutral' : value.isNegative() ? 'negative' : 'positive',
  };
}

/**
 * A money cell for a column that is subtracted from the total beside it.
 *
 * The engine keeps charges as positive magnitudes. In a row that also holds the
 * total they were taken out of, printing them unsigned makes the row fail to
 * add up — so the cell states the subtraction, in text and in colour.
 */
export function deductionCell(language: Language, value: Decimal): Cell {
  return {
    text: formatDeduction(language, value),
    tone: printsAsZero(value) ? 'neutral' : 'negative',
  };
}

function amountText(language: Language, row: AmountRow): string {
  if (row.deduction) return formatDeduction(language, row.value);
  if (row.signed) return formatSignedCurrency(language, row.value);
  return formatCurrency(language, row.value);
}

/**
 * Operation types come from the file as raw identifiers like
 * `INTEREST_PAYMENT`. Shown as-is they read as machine output, so they are
 * lower-cased and spaced — but never translated, because the reader may have to
 * quote them in a bug report.
 */
export function humanizeType(type: string): string {
  return type.toLowerCase().replaceAll('_', ' ');
}

/** Asset classes have a translated name only for the "not stated" bucket. */
export function assetClassLabel(t: Translator, assetClass: string): string {
  const key = `assetClass.${assetClass}` as MessageKey;
  return assetClass === 'UNCLASSIFIED' ? t(key) : assetClass;
}
