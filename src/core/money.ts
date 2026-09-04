import Decimal from 'decimal.js';

// Match the arithmetic context of the reference Python engine, whose numbers
// this port has to reproduce to the cent: `decimal` defaults to 28 significant
// digits and banker's rounding. decimal.js defaults to 20, which shifts unit
// costs (computed by division) just enough to move totals.
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_EVEN });

/** Parse an export field into a Decimal. Blank fields mean zero, not missing. */
export function dec(value: string | undefined | null): Decimal {
  const trimmed = (value ?? '').trim();
  return trimmed === '' ? ZERO : new Decimal(trimmed);
}

export const ZERO = new Decimal(0);

export { Decimal };
