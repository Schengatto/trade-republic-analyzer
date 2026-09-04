import type { Operation } from '../../src/core/operation';

/**
 * Build a synthetic operation row. Mirrors the `op()` helper of the reference
 * Python test suite so the ported cases stay readable side by side.
 */
export function op(
  datetime: string,
  category: string,
  type: string,
  overrides: Partial<Operation> = {},
): Operation {
  return {
    datetime,
    date: datetime.slice(0, 10),
    category,
    type,
    assetClass: '',
    symbol: 'AAA',
    name: 'Security A',
    shares: '',
    price: '',
    amount: '',
    fee: '',
    tax: '',
    ...overrides,
  };
}
