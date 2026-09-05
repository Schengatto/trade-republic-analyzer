// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { executionSection } from '../../src/ui/views/execution';
import { contextFor } from './helpers';
import { op } from '../helpers/operations';

const OPEN_ONLY = [
  op('2024-01-01T09:00:00Z', 'TRADING', 'BUY', { shares: '1', amount: '-100' }),
];

const ALL_WINNERS = [
  op('2024-01-01T09:00:00Z', 'TRADING', 'BUY', { shares: '1', amount: '-100' }),
  op('2024-06-01T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '150' }),
];

/** -100, -50, -30, -20: the worst three carry 90% of the 200 lost. */
const FOUR_LOSSES = [
  ...['AAA', 'BBB', 'CCC', 'DDD'].map((symbol) =>
    op('2024-01-01T09:00:00Z', 'TRADING', 'BUY', { shares: '1', amount: '-200', symbol }),
  ),
  op('2024-03-01T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '100', symbol: 'AAA' }),
  op('2024-03-02T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '150', symbol: 'BBB' }),
  op('2024-03-03T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '170', symbol: 'CCC' }),
  op('2024-03-04T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '180', symbol: 'DDD' }),
];

/**
 * +100, +50, +30, +20: the best three carry 90% of the 200 gained. Symbols the
 * loss fixture does not use, so the two can be loaded into one account.
 */
const FOUR_WINS = [
  ...['EEE', 'FFF', 'GGG', 'HHH'].map((symbol) =>
    op('2024-01-01T09:00:00Z', 'TRADING', 'BUY', { shares: '1', amount: '-100', symbol }),
  ),
  op('2024-03-01T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '200', symbol: 'EEE' }),
  op('2024-03-02T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '150', symbol: 'FFF' }),
  op('2024-03-03T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '130', symbol: 'GGG' }),
  op('2024-03-04T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '120', symbol: 'HHH' }),
];

describe('executionSection', () => {
  it('renders nothing for an account that never sold', () => {
    expect(executionSection(contextFor('it', OPEN_ONLY))).toBeNull();
  });

  it('leads with the caution, before any number', () => {
    const rendered = executionSection(contextFor('it'))!;
    const note = rendered.querySelector('.note');

    expect(note?.textContent).toContain('simbolo');
    // The note precedes the tiles in document order, as in winRateSection.
    expect(note?.compareDocumentPosition(rendered.querySelector('.tiles')!))
      .toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('shows only the two tiles the performance gauge does not already carry', () => {
    // The gauge states the count of sales and the share in profit. Repeating
    // them here made the same pair of figures appear twice on one page.
    const rendered = executionSection(contextFor('it'))!;
    const labels = [...rendered.querySelectorAll('.tile__label')].map((el) => el.textContent);

    expect(labels).toEqual(['Profit factor', 'Risultato medio']);
  });

  it('explains an absent profit factor instead of printing a number', () => {
    const rendered = executionSection(contextFor('it', ALL_WINNERS))!;
    const tile = [...rendered.querySelectorAll('.tile')].find((el) =>
      el.querySelector('.tile__label')?.textContent === 'Profit factor',
    );

    expect(tile?.querySelector('.tile__value')?.textContent).toBe('—');
    expect(tile?.querySelector('.tile__hint')?.textContent).toContain('perdita');
  });

  it('sets the winners against the losers in one table', () => {
    const rendered = executionSection(contextFor('it'))!;
    const rows = [...rendered.querySelectorAll('tbody tr')].slice(0, 2);
    const cells = rows.map((row) => [...row.querySelectorAll('td, th')].map((c) => c.textContent));

    expect(cells[0][0]).toBe('In utile');
    expect(cells[1][0]).toBe('In perdita');
    // The outcome label plus three figures: sales, mean result, mean holding.
    expect(cells[0]).toHaveLength(4);
  });

  it('always lists all four holding bands', () => {
    const rendered = executionSection(contextFor('it'))!;
    const text = rendered.textContent ?? '';

    for (const label of ['Meno di 1 mese', 'Da 1 a 6 mesi', 'Da 6 a 12 mesi', 'Oltre 1 anno']) {
      expect(text).toContain(label);
    }
  });

  it('prints an empty band as absent, not as a zero result', () => {
    const rendered = executionSection(contextFor('it'))!;
    const empty = [...rendered.querySelectorAll('tbody tr')].find(
      (row) => row.querySelector('th, td')?.textContent === 'Meno di 1 mese',
    )!;
    const cells = [...empty.querySelectorAll('td, th')].map((c) => c.textContent);

    // "0" sales is a count and is true; the euro and the yield are not results.
    expect(cells).toEqual(['Meno di 1 mese', '0', '—', '—']);
  });

  it('stays silent about loss concentration with three losses or fewer', () => {
    const rendered = executionSection(contextFor('it'))!;

    expect(rendered.textContent).not.toContain('peggiori');
  });

  it('states the loss concentration once there are four losses', () => {
    const rendered = executionSection(contextFor('it', FOUR_LOSSES))!;

    expect(rendered.textContent).toContain('90');
    expect(rendered.textContent).toContain('peggiori');
  });

  it('stays silent about profit concentration with three winners or fewer', () => {
    const rendered = executionSection(contextFor('it'))!;

    expect(rendered.textContent).not.toContain('migliori');
  });

  it('states the profit concentration once there are four winners', () => {
    const rendered = executionSection(contextFor('it', FOUR_WINS))!;

    expect(rendered.textContent).toContain('90');
    expect(rendered.textContent).toContain('migliori');
  });

  it('asks the same question of both sides, winners first', () => {
    // An account with four winners and four losers carries both sentences, in
    // the order the outcome table above reads them.
    const rendered = executionSection(contextFor('it', [...FOUR_WINS, ...FOUR_LOSSES]))!;
    const notes = [...rendered.querySelectorAll('.note')].map((n) => n.textContent ?? '');

    const best = notes.findIndex((text) => text.includes('migliori'));
    const worst = notes.findIndex((text) => text.includes('peggiori'));
    expect(best).toBeGreaterThan(-1);
    expect(worst).toBeGreaterThan(best);
  });

  it('renders in English too, with no Italian left behind', () => {
    const rendered = executionSection(contextFor('en'))!;
    const text = rendered.textContent ?? '';

    expect(rendered.querySelector('.section__title')?.textContent).toBe('Trading quality');
    expect(text).toContain('Under 1 month');
    expect(text).toContain('Over 1 year');
    expect(text).not.toContain('Vendite');
  });

  it('keeps both tables inside a scroller', () => {
    const rendered = executionSection(contextFor('it'))!;

    const tables = rendered.querySelectorAll('table');

    // Counted first: an empty list satisfies the loop below, so without this
    // the assertion would survive both tables being deleted.
    expect(tables).toHaveLength(2);
    for (const table of tables) {
      expect(table.closest('.table-scroll')).not.toBeNull();
    }
  });
});
