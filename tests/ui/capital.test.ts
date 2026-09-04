// @vitest-environment jsdom

/**
 * La sezione mette due grafici sulle stesse colonne mese: il confronto si legge
 * in verticale, quindi le etichette e il loro ordine sono parte del contratto.
 */

import { describe, expect, it } from 'vitest';
import { monthlyCapital } from '../../src/core/capital';
import { calculate } from '../../src/core/fifo';
import type { Operation } from '../../src/core/operation';
import { formatMonth } from '../../src/ui/format';
import { capitalSection } from '../../src/ui/views/capital';
import { op } from '../helpers/operations';
import { contextFor } from './helpers';

const ACCOUNT: Operation[] = [
  op('2024-03-01', 'TRADING', 'BUY', { shares: '10', amount: '-310.00' }),
  op('2024-03-21', 'TRADING', 'SELL', { shares: '-10', amount: '400.00' }),
  op('2024-04-15', 'CASH', 'CUSTOMER_INBOUND', { amount: '100.00' }),
];

const render = (language = 'en' as const, operations = ACCOUNT): HTMLElement => {
  const node = capitalSection(contextFor(language, operations));
  if (!node) throw new Error('capital section missing');
  return node;
};

describe('the capital section', () => {
  it('draws both charts over the same months, in the same order', () => {
    // Le etichette non si riscrivono a mano: `formatMonth` passa per `Intl`, e
    // in `en-IE` settembre si abbrevia `Sept`.
    const months = monthlyCapital(ACCOUNT, calculate(ACCOUNT)).map((month) =>
      formatMonth('en', month.month),
    );
    const charts = [...render().querySelectorAll('.chart--bars')];
    expect(charts).toHaveLength(2);
    for (const chart of charts) {
      const axis = [...chart.querySelectorAll('text')]
        .map((text) => text.textContent ?? '')
        .filter((label) => months.includes(label));
      expect(axis).toEqual(months);
    }
  });

  it('gives each chart its own table, with the days the average was taken over', () => {
    const tables = [...render().querySelectorAll('table.data-table')];
    expect(tables).toHaveLength(2);
    expect([...tables[0]!.querySelectorAll('th')].map((th) => th.textContent)).toEqual([
      'Month',
      'Average capital',
      'Days',
    ]);
    expect([...tables[1]!.querySelectorAll('th')].map((th) => th.textContent)).toEqual([
      'Month',
      'Profit',
      'Return',
    ]);
    const march = [...tables[0]!.querySelectorAll('tbody tr')][0]!;
    expect([...march.querySelectorAll('td')].at(-1)!.textContent).toBe('31');
  });

  it('prints a dash, not a zero, where there was no capital to return on', () => {
    // Aprile non ha posizioni aperte: il rendimento non esiste, non è zero.
    const rows = [...render().querySelectorAll('table.data-table')][1]!.querySelectorAll(
      'tbody tr',
    );
    const april = [...rows].at(-1)!;
    expect([...april.querySelectorAll('td')].at(-1)!.textContent).toBe('—');
  });

  it('does not print a dash beside a capital the column shows as non-zero', () => {
    // Media esattamente di mezzo centesimo: un centesimo a rischio su due
    // giorni. `Intl` arrotonda il pareggio lontano dallo zero e stampa un
    // centesimo, mentre `toDecimalPlaces` in ROUND_HALF_EVEN lo porterebbe a
    // zero: il trattino direbbe «non c'era niente a rischio» accanto a una
    // cifra che il lettore vede. Il gate deve leggere la colonna, non il
    // proprio arrotondamento.
    const halfACent: Operation[] = [
      op('2024-03-01', 'CASH', 'CUSTOMER_INBOUND', { amount: '100.00' }),
      op('2024-03-02', 'TRADING', 'BUY', { shares: '1', amount: '-0.01' }),
    ];
    const tables = [...render('en', halfACent).querySelectorAll('table.data-table')];
    const capital = [...tables[0]!.querySelectorAll('tbody tr')][0]!;
    const printed = [...capital.querySelectorAll('td')][1]!.textContent ?? '';
    expect(printed).not.toMatch(/0[.,]00/);
    const returns = [...tables[1]!.querySelectorAll('tbody tr')][0]!;
    expect([...returns.querySelectorAll('td')].at(-1)!.textContent).not.toBe('—');
  });

  it('warns that this profit is not the one in the monthly heatmap', () => {
    expect(render('en').querySelector('.note')?.textContent).toContain('Month by month');
  });

  it('says nothing at all when the file holds no operations', () => {
    expect(capitalSection(contextFor('en', []))).toBeNull();
  });
});
