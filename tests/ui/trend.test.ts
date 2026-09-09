// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { dec } from '../../src/core/money';
import { formatCurrency, formatDate, formatPercent } from '../../src/ui/format';
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

/**
 * A fall the curve never climbs back out of, one day after the peak: net 100 on
 * 02-01, then 40 on 02-02 and nothing after it.
 */
const UNRECOVERED = [
  ...['AAA', 'BBB'].map((symbol) =>
    op('2024-01-01T09:00:00Z', 'TRADING', 'BUY', { shares: '1', amount: '-100', symbol }),
  ),
  op('2024-02-01T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '200', symbol: 'AAA' }),
  op('2024-02-02T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '40', symbol: 'BBB' }),
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

/**
 * Two falls of different depths and very different lengths: the deep one is
 * over in two months, the shallow one takes eight.
 *
 * Net by day: 100, 40, 140, 120, 110, 210. Depth 60 against 30, length 60 days
 * against 244, and every date in the table its own — so a column reading its
 * neighbour's field, or the longest tile ranking by depth, cannot pass.
 */
const SEVERAL_FALLS = [
  ...['AAA', 'BBB', 'CCC', 'DDD', 'EEE', 'FFF'].map((symbol) =>
    op('2024-01-01T09:00:00Z', 'TRADING', 'BUY', { shares: '1', amount: '-100', symbol }),
  ),
  op('2024-02-01T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '200', symbol: 'AAA' }),
  op('2024-03-01T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '40', symbol: 'BBB' }),
  op('2024-04-01T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '200', symbol: 'CCC' }),
  op('2024-05-01T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '80', symbol: 'DDD' }),
  op('2024-06-01T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '90', symbol: 'EEE' }),
  op('2024-12-01T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '200', symbol: 'FFF' }),
];

/** Every tile, or only those of one `.tiles` row when a row is named. */
function tiles(rendered: HTMLElement, row?: number) {
  const scope = row === undefined ? rendered : [...rendered.querySelectorAll('.tiles')][row]!;
  return [...scope.querySelectorAll('.tile')].map((tile) => ({
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

  it('says how long the fall lasted and when it was made good', () => {
    const [drawdown] = tiles(trendSection(contextFor('it', DIPS)));

    // Written out whole: the two dates are the peak and the trough in that
    // order, and a sentence that named them the other way round would still
    // contain both.
    expect(drawdown!.hint).toBe(
      `Dal picco del ${formatDate('it', '2024-02-01')} al minimo del ${formatDate('it', '2024-04-01')}: 60 giorni. Recuperata il ${formatDate('it', '2024-05-01')}, dopo altri 30 giorni.`,
    );
  });

  it('says the fall is still on when the curve never regained the peak', () => {
    const [drawdown] = tiles(trendSection(contextFor('it', UNRECOVERED)));

    expect(drawdown!.hint).toBe(
      `Dal picco del ${formatDate('it', '2024-02-01')} al minimo del ${formatDate('it', '2024-02-02')}: 1 giorno, non ancora recuperata.`,
    );
  });

  it('names only the trough when the fall started from the account’s zero', () => {
    // No day carried that peak, so there is no span to state: the sentence is
    // the one the tile printed before it could measure a duration.
    const [drawdown] = tiles(trendSection(contextFor('it', ONLY_FALLS)));

    expect(drawdown!.hint).toBe(
      `Dal picco precedente, minimo toccato il ${formatDate('it', '2024-06-01')}.`,
    );
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

  it('counts the falls, times the usual one, and ranks the longest by length', () => {
    const [count, typical, longest] = tiles(trendSection(contextFor('it', SEVERAL_FALLS)), 1);

    expect(count!.label).toBe('Numero di discese');
    expect(count!.value).toBe('2');
    expect(count!.hint).toBe('Tutte rientrate.');

    expect(typical!.label).toBe('Durata tipica');
    // Two lengths, 60 and 244, so the median is their mean.
    expect(typical!.value).toBe('152 giorni');

    // The 30-euro fall, not the 60-euro one: this tile ranks by how long it
    // lasted, and the deepest was over in a sixth of the time.
    expect(longest!.label).toBe('La più lunga');
    expect(longest!.value).toBe('244 giorni');
    expect(longest!.hint).toBe(
      `Minimo toccato il ${formatDate('it', '2024-06-01')}, rientrata il ${formatDate('it', '2024-12-01')}.`,
    );
  });

  it('states the threshold it counted by', () => {
    const rendered = trendSection(contextFor('it', SEVERAL_FALLS));

    // A tenth of the deepest fall, in euro: without the figure the reader has
    // no way to tell which of their dips were left out.
    expect(rendered.querySelector('.note')!.textContent).toBe(
      `Sono contate le discese oltre ${formatCurrency('it', dec('6'))}, il ${formatPercent('it', dec('10'), 0)} della più profonda. In ordine di profondità.`,
    );
  });

  it('gives every fall its own row, deepest first', () => {
    const rendered = trendSection(contextFor('it', SEVERAL_FALLS));

    expect(episodeRows(rendered)).toEqual([
      [
        formatDate('it', '2024-02-01'),
        formatDate('it', '2024-03-01'),
        formatCurrency('it', dec('60')),
        '29 giorni',
        formatDate('it', '2024-04-01'),
        '31 giorni',
      ],
      [
        formatDate('it', '2024-04-01'),
        formatDate('it', '2024-06-01'),
        formatCurrency('it', dec('30')),
        '61 giorni',
        formatDate('it', '2024-12-01'),
        '183 giorni',
      ],
    ]);
  });

  it('leaves the columns of a fall still under water empty', () => {
    // A fall that has not ended has no recovery day and no time to it. Zero
    // days, or today's date, would both state one.
    const rendered = trendSection(
      contextFor('it', [
        ...SEVERAL_FALLS.slice(0, -1),
        op('2024-12-01T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '120', symbol: 'FFF' }),
      ]),
    );

    expect(episodeRows(rendered)[1]!.slice(4)).toEqual(['—', '—']);
    expect(tiles(rendered, 1)[0]!.hint).toBe("L'ultima non è ancora rientrata.");
  });

  it('says nothing about how falls behave when there has only been one', () => {
    // With a single fall the block would restate the tile above it four times:
    // that tile already names its peak, trough, length and recovery.
    const rendered = trendSection(contextFor('it', DIPS));

    expect(rendered.querySelectorAll('.tiles')).toHaveLength(1);
    expect(rendered.textContent).not.toContain('Discese e recuperi');
  });
});

/** The episode table, found by its own first heading rather than by position. */
function episodeRows(rendered: HTMLElement): string[][] {
  const table = [...rendered.querySelectorAll('table.data-table')].find(
    (candidate) => candidate.querySelector('th')?.textContent === 'Dal picco',
  )!;
  return [...table.querySelectorAll('tbody tr')].map((row) =>
    [...row.querySelectorAll('td')].map((cell) => cell.textContent ?? ''),
  );
}
