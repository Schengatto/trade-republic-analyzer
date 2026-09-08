// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { dec } from '../../src/core/money';
import { formatCurrency, formatDate } from '../../src/ui/format';
import { trendSection } from '../../src/ui/views/trend';
import { contextFor } from './helpers';
import { op } from '../helpers/operations';

/**
 * Net profit by day: 0, +100, +70, +50, +110.
 *
 * All four tiles get their own figure and their own date — fall 50 on 04-01,
 * rise 110 on 05-01, worst day 30 on 03-01, best day 100 on 02-01 — so a tile
 * reading the wrong field, or the wrong date for the right field, cannot pass
 * by coincidence.
 */
const DIPS = [
  ...['AAA', 'BBB', 'CCC', 'DDD'].map((symbol) =>
    op('2024-01-01T09:00:00Z', 'TRADING', 'BUY', { shares: '1', amount: '-100', symbol }),
  ),
  op('2024-02-01T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '200', symbol: 'AAA' }),
  op('2024-03-01T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '70', symbol: 'BBB' }),
  op('2024-04-01T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '80', symbol: 'CCC' }),
  op('2024-05-01T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '160', symbol: 'DDD' }),
];

/** Never falls: no fee on the buy, and the one sale is a gain. */
const ONLY_RISES = [
  op('2024-01-01T09:00:00Z', 'TRADING', 'BUY', { shares: '1', amount: '-100' }),
  op('2024-06-01T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '150' }),
];

/** Never rises: the one sale is a loss, so the curve leaves zero downwards. */
const ONLY_FALLS = [
  op('2024-01-01T09:00:00Z', 'TRADING', 'BUY', { shares: '1', amount: '-100' }),
  op('2024-06-01T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '60' }),
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
  it('sizes the swing before drawing it, amounts across and days below', () => {
    const rendered = trendSection(contextFor('it', DIPS));

    // The two comparable figures sit side by side, so a narrow screen wrapping
    // the row into 2×2 still pairs fall with rise and day with day.
    expect(tiles(rendered).map((tile) => tile.label)).toEqual([
      'Discesa massima',
      'Salita massima',
      'Giorno peggiore',
      'Giorno migliore',
    ]);
    // The figures answer "how far did it swing"; the chart is the working.
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

  it('measures the run-up from the trough, not from the start', () => {
    const [, runUp] = tiles(trendSection(contextFor('it', DIPS)));

    // 0 up to 110, not the 100 of the first climb nor the 60 of the last day.
    expect(runUp!.value).toBe(formatCurrency('it', dec('110')));
    expect(runUp!.hint).toContain(formatDate('it', '2024-05-01'));
  });

  it('dates the worst day by its own day, not by the trough', () => {
    const [, , worstDay] = tiles(trendSection(contextFor('it', DIPS)));

    expect(worstDay!.value).toBe(formatCurrency('it', dec('30')));
    expect(worstDay!.hint).toContain(formatDate('it', '2024-03-01'));
    expect(worstDay!.hint).not.toContain(formatDate('it', '2024-04-01'));
  });

  it('dates the best day by its own day, not by the peak', () => {
    const [, , , bestDay] = tiles(trendSection(contextFor('it', DIPS)));

    expect(bestDay!.value).toBe(formatCurrency('it', dec('100')));
    expect(bestDay!.hint).toContain(formatDate('it', '2024-02-01'));
    expect(bestDay!.hint).not.toContain(formatDate('it', '2024-05-01'));
  });

  it('prints all four as plain magnitudes, unsigned and uncoloured', () => {
    // Each tile is already labelled with its direction. A minus sign and a red
    // would say it a second and a third time, and a green under "best day"
    // would be the only colour on the page that adds nothing.
    for (const tile of tiles(trendSection(contextFor('it', DIPS)))) {
      expect(tile.value).not.toContain('-');
      expect(tile.value).not.toContain('−');
      expect(tile.classes).toBe('tile__value');
    }
  });

  it('says nothing about a fall on a curve that never fell', () => {
    const rendered = trendSection(contextFor('it', ONLY_RISES));

    expect(tiles(rendered).map((tile) => tile.label)).toEqual([
      'Salita massima',
      'Giorno migliore',
    ]);
    expect(rendered.querySelector('figure.figure')).not.toBeNull();
  });

  it('says nothing about a rise on a curve that never rose', () => {
    const rendered = trendSection(contextFor('it', ONLY_FALLS));

    expect(tiles(rendered).map((tile) => tile.label)).toEqual([
      'Discesa massima',
      'Giorno peggiore',
    ]);
  });
});
