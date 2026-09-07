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
    // L'ultima nota della sezione, non la prima: sopra la tabella c'è quella
    // che dichiara la base del tasso annuo.
    const notes = [...render('en').querySelectorAll('.note')];
    expect(notes.at(-1)?.textContent).toContain('Month by month');
  });

  it('says nothing at all when the file holds no operations', () => {
    expect(capitalSection(contextFor('en', []))).toBeNull();
  });
});

/** Etichetta, cifra e nota di ogni tassello, nell'ordine in cui stanno. */
function tiles(root: HTMLElement): { label: string; value: string; hint: string }[] {
  return [...root.querySelectorAll('.tiles .tile')].map((tile) => ({
    label: tile.querySelector('.tile__label')?.textContent ?? '',
    value: tile.querySelector('.tile__value')?.textContent ?? '',
    hint: tile.querySelector('.tile__hint')?.textContent ?? '',
  }));
}

describe('the whole-period tiles', () => {
  /* 1.000 € per due giorni e 100 € per quasi tre mesi: 117,39 € di media
   * pesata, 60 € di utile, 202,78% annuo. Le due cifre sono deliberatamente
   * diverse fra loro e diverse da ogni figura della tabella, o due tasselli
   * scambiati resterebbero verdi. */
  const UNEVEN: Operation[] = [
    op('2024-01-30', 'TRADING', 'BUY', { shares: '10', amount: '-1000.00' }),
    op('2024-02-01', 'TRADING', 'SELL', { shares: '-10', amount: '1000.00' }),
    op('2024-02-02', 'TRADING', 'BUY', { shares: '10', amount: '-100.00' }),
    op('2024-04-30', 'TRADING', 'SELL', { shares: '-10', amount: '160.00' }),
  ];

  it('prints the whole calculation, not just its result', () => {
    // Un tasso annuo da solo, accanto al rendimento sul capitale della Sintesi,
    // si legge come una contraddizione: servono la base, l'utile e la
    // percentuale del periodo perché il lettore possa rifare il conto.
    expect(tiles(render('en', UNEVEN))).toEqual([
      {
        label: 'Average capital invested',
        value: '€117.39',
        hint: 'Averaged over the 92 days of the period, weekends included.',
      },
      {
        label: 'Profit on the capital',
        value: '+€60.00',
        hint: '+51.11% of the average capital, over 92 days.',
      },
      {
        label: 'Annual return',
        value: '+202.78%',
        hint: '+51.11% for the period, scaled to 365 days. Simple scaling, not compounded.',
      },
    ]);
  });

  it('names the basis under the tiles, before the figure', () => {
    // La nota deve arrivare prima che il lettore metta questo tasso accanto a
    // quello della Sintesi: in fondo alla sezione il confronto è già fatto.
    const children = [...render('en', UNEVEN).children];
    const tilesAt = children.findIndex((child) => child.className === 'tiles');
    const basis = children[tilesAt + 1]!;
    expect(basis.className).toContain('note');
    expect(basis.textContent).toContain('not comparable');
    expect(tilesAt).toBe(1);
    expect(tilesAt).toBeLessThan(
      children.findIndex((child) => child.className.includes('capital__year')),
    );
  });

  it('withholds the rate on a history too short to annualise', () => {
    const short = tiles(render('en', ACCOUNT))[2]!;
    expect(short.value).toBe('—');
    expect(short.hint).toBe('At least 90 days of history are needed to scale the result to a year.');
    // Solo la scalatura manca: il rendimento del periodo è misurato e resta.
    expect(tiles(render('en', ACCOUNT))[1]!.hint).toContain('%');
  });

  it('leaves the withheld rate uncoloured', () => {
    // Un trattino verde direbbe che il periodo è andato bene.
    const value = render('en', ACCOUNT).querySelectorAll('.tiles .tile__value')[2]!;
    expect(value.className).toBe('tile__value');
  });

  it('says which of the two reasons withheld it', () => {
    // Nessun capitale investito e storia troppo breve stampano lo stesso
    // trattino: se la nota non li distingue, la cifra mancante è inspiegabile.
    const cashOnly: Operation[] = [
      op('2024-01-10', 'CASH', 'CUSTOMER_INBOUND', { amount: '1000.00' }),
      op('2024-06-15', 'CASH', 'INTEREST_PAYMENT', { amount: '5.00' }),
    ];
    const withoutCapital = tiles(render('en', cashOnly));
    expect(withoutCapital[2]!.hint).toBe('No capital was invested in the period.');
    // Senza denominatore non c'è nemmeno la percentuale del periodo: il
    // tassello di mezzo deve dire la stessa cosa, non una divisione per zero.
    expect(withoutCapital[1]!.hint).toBe('No capital was invested in the period.');
  });
});
