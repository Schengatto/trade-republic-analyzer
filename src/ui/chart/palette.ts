/**
 * Chart colour roles.
 *
 * Every value is a CSS custom property declared in `app.css`, so light and dark
 * swap in one place and the chart code never mentions a hex value.
 *
 * The underlying palette was checked with the data-visualization validator
 * rather than by eye, against the surfaces the charts actually render on:
 *
 *   categorical, light (#ffffff): #2a78d6, #eb6834, #7c5cd6, #eda100, #e87ba4 —
 *     every hard check PASSES on the adjacent pairlist, the one that applies to
 *     a stack; yellow and magenta WARN below 3:1 against the surface
 *   categorical, dark  (#131313): #3987e5, #d95926, #8b6ee8, #c98500, #d55181 —
 *     every hard check PASSES on the adjacent pairlist
 *   diverging poles, light:       #0a8f57, #e5484d — all checks PASS,
 *     ΔE 8.2 protan / 37.6 normal
 *   diverging poles, dark:        #0f9e6a, #ef4444 — all checks PASS,
 *     ΔE 7.7 deutan / 36.2 normal
 *
 * The diverging pair is the green↔red of the product this report reads, at the
 * owner's instruction. It is the one pair a red-green colour blind reader
 * cannot separate by hue, and the ΔE above sits in the 6–8 floor band that is
 * legal ONLY with a second, non-colour channel — so the sign is never carried
 * by the fill alone anywhere it is drawn: a heatmap cell and a treemap tile
 * both print a signed amount inside the tint, a bar hangs from its zero
 * baseline, and every figure has a mandatory table under it. That discharges
 * the band; it does not dismiss it. Removing one of those readouts would put
 * profit and loss back on a hue a deuteranope cannot resolve.
 *
 * Slot 3 is violet rather than the green it once was: beside a green gain pole,
 * a green category reads as a profit it is not.
 *
 * The sub-3:1 contrast warnings are discharged, not dismissed: every figure
 * carries a legend, a hover readout and a mandatory table, so no slot has to be
 * told apart from the surface by its fill alone.
 *
 * The slot ORDER is the colour-blind safety mechanism, not decoration — the
 * checks are run on neighbouring pairs, so reordering the slots means running
 * the validator again. Charges take slot 5 rather than the red of the diverging
 * scale, which would have been the obvious choice for a cost: red sits ΔE 6.7
 * from slot 4 under deuteranopia on the dark surface. Their sign is carried by
 * the baseline they hang below.
 */

/** Categorical slot 1. Assigned in fixed order, never by rank. */
export const SERIES_1 = 'var(--series-1)';
/** Categorical slot 2. */
export const SERIES_2 = 'var(--series-2)';
/** Categorical slot 3. */
export const SERIES_3 = 'var(--series-3)';
/** Categorical slot 4. */
export const SERIES_4 = 'var(--series-4)';
/** Categorical slot 5. */
export const SERIES_5 = 'var(--series-5)';

/** Diverging pole for values at or above zero. */
export const POLE_POSITIVE = 'var(--pole-positive)';
/** Diverging pole for values below zero. */
export const POLE_NEGATIVE = 'var(--pole-negative)';
/** The neutral midpoint. A diverging scale never puts a hue at zero. */
export const POLE_NEUTRAL = 'var(--pole-neutral)';

export const GRID = 'var(--grid)';
export const AXIS = 'var(--axis)';
export const INK_MUTED = 'var(--ink-muted)';
export const SURFACE = 'var(--surface-1)';

/**
 * The diverging colour for a signed value.
 *
 * Zero takes the neutral, not the positive pole: a month that closed at exactly
 * nothing would otherwise be painted the same blue as a month that made money,
 * and its one-pixel bar read as a small gain.
 */
export function poleFor(value: number): string {
  if (value === 0) return POLE_NEUTRAL;
  return value < 0 ? POLE_NEGATIVE : POLE_POSITIVE;
}
