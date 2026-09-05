// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { summarySection } from '../../src/ui/views/summary';
import { contextFor } from './helpers';
import { op } from '../helpers/operations';

/** No transfer in or out, so there is no capital to measure a return against. */
const NO_CAPITAL = [
  op('2024-01-03T09:00:00Z', 'TRADING', 'BUY', { shares: '10', amount: '-100.00' }),
  op('2024-03-07T09:00:00Z', 'TRADING', 'SELL', { shares: '-10', amount: '150.00' }),
];

function tiles(rendered: HTMLElement) {
  return [...rendered.querySelectorAll('.tile')].map((tile) => ({
    label: tile.querySelector('.tile__label')?.textContent ?? '',
    value: tile.querySelector('.tile__value')?.textContent ?? '',
    classes: tile.querySelector('.tile__value')?.className ?? '',
    hint: tile.querySelector('.tile__hint')?.textContent ?? '',
  }));
}

describe('summarySection', () => {
  it('carries the return as a headline figure, last of five', () => {
    // It used to be grey hint text under the capital, where a reader looking
    // for the result of the account had to find it by accident.
    const rendered = summarySection(contextFor('it'));

    expect(tiles(rendered).map((tile) => tile.label)).toEqual([
      'Profitto netto',
      'Utile da compravendita',
      'Oneri totali',
      'Capitale netto versato',
      'Rendimento sul capitale',
    ]);
  });

  it('names the period the percentage covers, and refuses to annualise it', () => {
    // A percentage with no period attached is read as a year. This one is not:
    // the capital was paid in progressively, so scaling it to twelve months
    // would divide by a base that was never there for twelve months.
    const rendered = summarySection(contextFor('it'));
    const [, , , , ret] = tiles(rendered);
    const meta = rendered.querySelector('.section__meta')?.textContent ?? '';
    const period = /Periodo da (.+) a (.+)$/.exec(meta.split('·').pop()!.trim());

    expect(period).not.toBeNull();
    expect(ret!.hint).toContain(period![1]!);
    expect(ret!.hint).toContain(period![2]!);
    expect(ret!.hint).toContain('Non annualizzato');
  });

  it('colours the return by its sign', () => {
    const [, , , , ret] = tiles(summarySection(contextFor('it')));

    expect(ret!.value).toContain('%');
    expect(ret!.classes).toBe('tile__value is-positive');
  });

  it('gives the capital tile back its own hint', () => {
    // The capital's hint used to be spent on the return underneath it.
    const [, , , capital] = tiles(summarySection(contextFor('it')));

    expect(capital!.hint).toBe('Versamenti meno prelievi.');
  });

  it('states why the return is missing rather than printing a zero', () => {
    const [, , , , ret] = tiles(summarySection(contextFor('it', NO_CAPITAL)));

    expect(ret!.value).toBe('—');
    expect(ret!.classes).toBe('tile__value');
    expect(ret!.hint).toContain('capitale netto versato pari a zero');
  });
});
