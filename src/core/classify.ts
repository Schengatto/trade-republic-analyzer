/**
 * Every operation type the export is known to produce, grouped by how the
 * engine has to treat it. A type that matches nothing here is never dropped in
 * silence: see the unclassified handling in `fifo.ts`.
 */
export const CATEGORIES = {
  INCOME: ['DIVIDEND', 'INTEREST_PAYMENT', 'BENEFITS_SAVEBACK'],
  /** Stamp duty and tax adjustments: the amount is in `tax`, never in `amount`. */
  TAXES: ['TAX_OPTIMIZATION'],
  /** The amount is in `fee`, never in `amount`. */
  ACCOUNT_COSTS: ['CARD_ORDERING_FEE'],
  CARD_SPENDING: ['CARD_TRANSACTION', 'CARD_TRANSACTION_INTERNATIONAL'],
  CAPITAL_MOVEMENTS: [
    'CUSTOMER_INBOUND',
    'CUSTOMER_OUTBOUND_REQUEST',
    'TRANSFER_INBOUND',
    'TRANSFER_OUTBOUND',
    'TRANSFER_INSTANT_INBOUND',
    'TRANSFER_INSTANT_OUTBOUND',
    'MANUAL_CASH_TRANSFER',
  ],
  /** Load/unload pairs that net to zero. */
  NEUTRAL: ['MIGRATION'],
  /** Units granted at zero cost. */
  FREE_LOTS: ['BONUS_ISSUE'],
  FREE_LOTS_CANCELLED: ['BONUS_ISSUE_CANCELLED'],
  TRADING: ['BUY', 'SELL'],
} as const satisfies Record<string, readonly string[]>;

export type Category = keyof typeof CATEGORIES;

const BY_TYPE = new Map<string, Category>();
for (const [category, types] of Object.entries(CATEGORIES) as [Category, readonly string[]][]) {
  for (const type of types) BY_TYPE.set(type, category);
}

export function categoryOf(type: string): Category | null {
  return BY_TYPE.get(type) ?? null;
}
