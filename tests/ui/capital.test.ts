// @vitest-environment jsdom

/**
 * La sezione disegna un anno per volta e ne tabella tutti.
 *
 * È la separazione su cui poggia la stampa: il `<select>` non si stampa, quindi
 * la figura stampata va dichiarata a parole e la tabella deve restare integrale,
 * o la carta perderebbe i mesi che il lettore non aveva aperto.
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

/** Due anni: il selettore non ha niente da scegliere sopra un anno solo. */
const TWO_YEARS: Operation[] = [
  op('2024-11-04', 'TRADING', 'BUY', { shares: '10', amount: '-200.00' }),
  op('2024-12-20', 'TRADING', 'SELL', { shares: '-10', amount: '260.00' }),
  op('2025-02-10', 'TRADING', 'BUY', { shares: '4', amount: '-120.00' }),
  op('2025-03-14', 'TRADING', 'SELL', { shares: '-4', amount: '90.00' }),
];

const render = (language = 'en' as const, operations = ACCOUNT): HTMLElement => {
  const node = capitalSection(contextFor(language, operations));
  if (!node) throw new Error('capital section missing');
  return node;
};

/**
 * Le etichette di riga del grafico, nell'ordine in cui sono disegnate.
 *
 * Distinte dai tick dell'asse per allineamento e non per contenuto: la scala
 * compatta di `Intl` scrive `€1.2K`, quindi «contiene una lettera» separerebbe
 * male, e su un conto piccolo separerebbe bene fino al primo migliaio.
 */
function drawnMonths(root: HTMLElement): string[] {
  const chart = root.querySelector('.chart--rows')!;
  return [...chart.querySelectorAll('text[text-anchor="end"]')].map(
    (text) => text.textContent ?? '',
  );
}

function tableRows(root: HTMLElement): string[][] {
  return [...root.querySelectorAll('table.data-table tbody tr')].map((row) =>
    [...row.querySelectorAll('td')].map((cell) => cell.textContent ?? ''),
  );
}

describe('the capital section', () => {
  it('draws one figure, with one table beside it', () => {
    // Due figure impilate confrontavano le due grandezze leggendo in verticale
    // attraverso una cornice; accostate, il confronto è una lunghezza.
    const node = render();
    expect(node.querySelectorAll('.chart--rows')).toHaveLength(1);
    expect(node.querySelectorAll('table.data-table')).toHaveLength(1);
  });

  it('draws the months of the open year, in order', () => {
    // Le etichette non si riscrivono a mano: `formatMonth` passa per `Intl`, e
    // in `en-IE` settembre si abbrevia `Sept`.
    const months = monthlyCapital(ACCOUNT, calculate(ACCOUNT)).map((month) =>
      formatMonth('en', month.month),
    );
    expect(drawnMonths(render())).toEqual(months);
  });

  it('gives each month two bars, capital first', () => {
    const labels = [...render().querySelectorAll('rect.chart__bar')].map((bar) =>
      bar.getAttribute('aria-label'),
    );
    // Marzo: 310 € impegnati per 20 giorni su 31 fanno 200 € di media, e il
    // risultato è quello che la vendita ha prodotto. Sono due grandezze
    // diverse, ed è per questo che la barra del capitale non è 310.
    const march = formatMonth('en', '2024-03');
    expect(labels.slice(0, 2)).toEqual([
      `${march}, Average capital invested: €200.00`,
      `${march}, Result for the month: +€90.00`,
    ]);
    expect(labels).toHaveLength(4);
  });

  it('opens on the most recent year and draws only its months', () => {
    const node = render('en', TWO_YEARS);
    expect(drawnMonths(node)).toEqual(
      ['2025-01', '2025-02', '2025-03'].map((month) => formatMonth('en', month)),
    );
    expect(node.querySelector('select')!.value).toBe('2025');
  });

  it('redraws the chart, and only the chart, when the year changes', () => {
    const node = render('en', TWO_YEARS);
    const select = node.querySelector('select')!;
    const before = tableRows(node);

    select.value = '2024';
    select.dispatchEvent(new Event('change'));

    expect(drawnMonths(node)).toEqual(
      ['2024-11', '2024-12'].map((month) => formatMonth('en', month)),
    );
    // La tabella non segue il selettore: è la forma accessibile della figura ed
    // è quella che la stampa porta con sé.
    expect(tableRows(node)).toEqual(before);
  });

  /**
   * Su carta il `<select>` sparisce. Senza questa riga la figura stampata
   * mostrerebbe dodici mesi senza dire di che anno sono, e sta *sopra* la
   * figura perché sotto arriverebbe a lettura già fatta.
   */
  it('names the year it is drawing, above the figure', () => {
    const node = render('en', TWO_YEARS);
    const line = node.querySelector('.capital__year')!;
    expect(line.textContent).toBe('The chart shows 2025.');
    expect(line.compareDocumentPosition(node.querySelector('.figure')!)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );

    const select = node.querySelector('select')!;
    select.value = '2024';
    select.dispatchEvent(new Event('change'));
    expect(node.querySelector('.capital__year')!.textContent).toBe('The chart shows 2024.');
  });

  it('tables every month of every year, whatever the chart is showing', () => {
    const node = render('en', TWO_YEARS);
    const all = monthlyCapital(TWO_YEARS, calculate(TWO_YEARS)).map((month) =>
      formatMonth('en', month.month),
    );
    expect(tableRows(node).map((row) => row[0])).toEqual(all);
    expect([...node.querySelectorAll('th')].map((th) => th.textContent)).toEqual([
      'Month',
      'Average capital',
      'Days',
      'Profit',
      'Return',
    ]);
  });

  it('keeps the days the average was taken over', () => {
    const march = tableRows(render())[0]!;
    expect(march[2]).toBe('31');
  });

  it('prints a dash, not a zero, where there was no capital to return on', () => {
    // Aprile non ha posizioni aperte: il rendimento non esiste, non è zero.
    expect(tableRows(render()).at(-1)!.at(-1)).toBe('—');
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
    const march = tableRows(render('en', halfACent))[0]!;
    expect(march[1]).not.toMatch(/0[.,]00/);
    expect(march.at(-1)).not.toBe('—');
  });

  it('names the loss colour as well as the gain', () => {
    // Tre voci per due barre: la seconda serie usa due colori a seconda del
    // segno, e dichiararne uno solo lascerebbe il rosso senza nome.
    const legend = [...render().querySelectorAll('.legend__item')].map((item) => item.textContent);
    expect(legend).toEqual(['Average capital invested', 'Month in profit', 'Month at a loss']);
  });

  it('warns that this profit is not the one in the monthly heatmap', () => {
    expect(render('en').querySelector('.note')?.textContent).toContain('Month by month');
  });

  it('says nothing at all when the file holds no operations', () => {
    expect(capitalSection(contextFor('en', []))).toBeNull();
  });
});
