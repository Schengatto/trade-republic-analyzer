/**
 * One row of a Trade Republic transaction export, normalized to camelCase.
 *
 * Every field stays a string: the export leaves numeric fields blank rather
 * than zero, and parsing belongs in one place (`money.ts`) so the whole engine
 * shares a single arithmetic context.
 */
export interface Operation {
  /** Booking timestamp. The FIFO matching orders by this field. */
  datetime: string;
  /** Value date. Time aggregations group by this field, which can differ. */
  date: string;
  category: string;
  type: string;
  assetClass: string;
  name: string;
  symbol: string;
  shares: string;
  price: string;
  /** Gross: excludes `fee` and `tax`, which arrive already signed negative. */
  amount: string;
  fee: string;
  tax: string;
}
