// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { dec } from '../../src/core/money';
import { formatCurrency, formatDate } from '../../src/ui/format';
import { trendSection } from '../../src/ui/views/trend';
import { contextFor } from './helpers';
import { op } from '../helpers/operations';

/**
 * Net profit by day: 0, +100, +70, +50.
 *
 * The deepest fall (100 → 50) bottoms out on a different day from the worst
 * single day (−30, on 2024-03-01), so a tile reading the wrong date, or the
 * wrong one of the two figures, cannot pass by coincidence.
 */
const DIPS = [
  ...['AAA', 'BBB', 'CCC'].map((symbol) =>
    op('2024-01-01T09:00:00Z', 'TRADING', 'BUY', { shares: '1', amount: '-100', symbol }),
  ),
  op('2024-02-01T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '200', symbol: 'AAA' }),
  op('2024-03-01T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '70', symbol: 'BBB' }),
  op('2024-04-01T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '80', symbol: 'CCC' }),
];

/** Never falls: no fee on the buy, and the one sale is a gain. */
const ONLY_RISES = [
  op('2024-01-01T09:00:00Z', 'TRADING', 'BUY', { shares: '1', amount: '-100' }),
  op('2024-06-01T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '150' }),
];

function tiles(rendered: HTMLElement) {
  return [...rendered.querySelectorAll('.tile')].map((tile) => ({
    label: tile.querySelector('.tile__label')?.textContent ?? '',
    value: tile.querySelector('.tile__value')?.textContent ?? '',
    classes: tile.querySelector('.tile__value')?.className ?? '',
    hint: tile.querySelector('.tile__hint')?.textContent ?? '',
  }));
}

describe('trendSection', () => {
  it('sizes the fall before drawing it', () => {
    const rendered = trendSection(contextFor('it', DIPS));

    expect(tiles(rendered).map((tile) => tile.label)).toEqual([
      'Discesa massima',
      'Giorno peggiore',
    ]);
    // The figures answer "how bad did it get"; the chart is the working.
    expect(rendered.querySelector('.tiles')!.compareDocumentPosition(
      rendered.querySelector('figure.figure')!,
    )).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('measures the drawdown from the peak, not from zero', () => {
    const [drawdown] = tiles(trendSection(contextFor('it', DIPS)));

    // 100 down to 50, while the account is still 50 in profit.
    expect(drawdown!.value).toBe(formatCurrency('it', dec('50')));
    expect(drawdown!.hint).toContain(formatDate('it', '2024-04-01'));
  });

  it('dates the worst day by its own day, not by the trough', () => {
    const [, worstDay] = tiles(trendSection(contextFor('it', DIPS)));

    expect(worstDay!.value).toBe(formatCurrency('it', dec('30')));
    expect(worstDay!.hint).toContain(formatDate('it', '2024-03-01'));
    expect(worstDay!.hint).not.toContain(formatDate('it', '2024-04-01'));
  });

  it('prints both as plain magnitudes, unsigned and uncoloured', () => {
    // Each tile is already labelled as a fall. A minus sign and a red would say
    // it a second and a third time, and the red would collide with the gains
    // coloured that way everywhere else on the page.
    for (const tile of tiles(trendSection(contextFor('it', DIPS)))) {
      expect(tile.value).not.toContain('-');
      expect(tile.value).not.toContain('−');
      expect(tile.classes).toBe('tile__value');
    }
  });

  it('says nothing about a fall on a curve that never fell', () => {
    const rendered = trendSection(contextFor('it', ONLY_RISES));

    expect(rendered.querySelector('.tiles')).toBeNull();
    expect(rendered.querySelector('figure.figure')).not.toBeNull();
  });
});
