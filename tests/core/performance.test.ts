import { describe, expect, it } from 'vitest';

import { calculate } from '../../src/core/fifo';
import {
  PERFORMANCE_WINDOW_KEYS,
  performanceRange,
  performanceWindows,
} from '../../src/core/performance';
import type { PerformanceWindow } from '../../src/core/performance';
import type { Operation } from '../../src/core/operation';
import { executionQuality, sales } from '../../src/core/execution';
import { plusOneDay } from '../../src/core/dates';
import { ZERO } from '../../src/core/money';
import type { Decimal } from '../../src/core/money';
import { op } from '../helpers/operations';

function windowsOf(operations: Operation[]): Map<string, PerformanceWindow> {
  return new Map(
    performanceWindows(operations, calculate(operations)).map((window) => [window.key, window]),
  );
}

describe('the set of windows', () => {
  it('leaves out the one-day window, where a mean and a median coincide', () => {
    expect(PERFORMANCE_WINDOW_KEYS).toEqual(['ALL', '1Y', '6M', '3M', '1M', '1W']);
  });

  it('has nothing to say about an empty file', () => {
    expect(performanceWindows([], calculate([]))).toEqual([]);
  });

  it('returns every window even when a file is two days long', () => {
    const operations = [
      op('2024-06-29T09:00:00Z', 'TRADING', 'BUY', { shares: '1', amount: '-10' }),
      op('2024-06-30T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '15' }),
    ];

    const windows = performanceWindows(operations, calculate(operations));
    expect(windows.map((window) => window.key)).toEqual([...PERFORMANCE_WINDOW_KEYS]);

    // La settimana non sfora l'inizio del file solo perché il file è corto:
    // la finestra è un periodo, non l'intersezione con i dati.
    expect(windows.find((window) => window.key === '1W')!.from).toBe('2024-06-24');
    expect(windows.find((window) => window.key === 'ALL')!.from).toBe('2024-06-29');
  });
});

describe('counting the sales', () => {
  const operations = [
    op('2024-01-01T09:00:00Z', 'TRADING', 'BUY', { shares: '3', amount: '-30' }),
    op('2024-01-01T09:00:00Z', 'TRADING', 'BUY', { shares: '1', amount: '-10', symbol: 'BBB' }),
    op('2024-01-01T09:00:00Z', 'TRADING', 'BUY', { shares: '1', amount: '-10', symbol: 'CCC' }),
    // Tre vendite lo stesso giorno: due simboli più uno, un giorno solo.
    op('2024-06-10T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '20' }),
    op('2024-06-10T10:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '5', symbol: 'BBB' }),
    op('2024-06-10T11:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '10', symbol: 'CCC' }),
  ];

  it('counts days, not sales, as the active ones', () => {
    const all = windowsOf(operations).get('ALL')!;
    expect(all.sales).toBe(3);
    expect(all.activeDays).toBe(1);
  });

  it('splits the sales into wins, losses and break-even', () => {
    const all = windowsOf(operations).get('ALL')!;
    expect(all.wins).toBe(1); // AAA: 10 -> 20
    expect(all.losses).toBe(1); // BBB: 10 -> 5
    expect(all.breakEven).toBe(1); // CCC: 10 -> 10
    expect(all.winPercent!.toFixed(2)).toBe('33.33');
  });

  it('gives that one day the sum of its three sales, not the last of them', () => {
    // `meanPerActiveDay` divide un totale calcolato altrove, quindi non
    // vedrebbe la differenza: la mediana è la sola cifra che legge davvero i
    // valori giorno per giorno, e con l'ultimo che sovrascrive gli altri
    // questo giorno varrebbe 0 (CCC) invece di +10 −5 +0.
    const all = windowsOf(operations).get('ALL')!;
    expect(all.medianPerActiveDay!.toFixed(2)).toBe('5.00');
  });
});

describe('the daily rate', () => {
  it('divides the profit over every calendar day of the window', () => {
    const operations = [
      op('2024-06-01T09:00:00Z', 'TRADING', 'BUY', { shares: '1', amount: '-10' }),
      op('2024-06-10T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '110' }),
    ];

    const all = windowsOf(operations).get('ALL')!;
    expect(all.calendarDays).toBe(10); // 1 giugno..10 giugno, estremi inclusi
    expect(all.profit.toString()).toBe('100');
    expect(all.meanPerCalendarDay!.toString()).toBe('10');

    // Un giorno operativo solo: tutto l'utile è caduto lì.
    expect(all.activeDays).toBe(1);
    expect(all.meanPerActiveDay!.toString()).toBe('100');
    expect(all.medianPerActiveDay!.toString()).toBe('100');
  });

  it('averages the two middle days when the count is even', () => {
    const operations = [
      op('2024-06-01T09:00:00Z', 'TRADING', 'BUY', { shares: '1', amount: '-10' }),
      op('2024-06-01T09:00:00Z', 'TRADING', 'BUY', { shares: '1', amount: '-10', symbol: 'BBB' }),
      // Due giorni operativi: 5,00 e 10,00. La mediana è la semisomma.
      op('2024-06-02T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '15' }),
      op('2024-06-03T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '20', symbol: 'BBB' }),
    ];

    const all = windowsOf(operations).get('ALL')!;
    expect(all.activeDays).toBe(2);
    expect(all.medianPerActiveDay!.toString()).toBe('7.5');
  });

  it('sorts the days before picking the middle one, not the arrival order', () => {
    const operations = [
      op('2024-01-01T09:00:00Z', 'TRADING', 'BUY', { shares: '1', amount: '-10' }),
      op('2024-01-01T09:00:00Z', 'TRADING', 'BUY', { shares: '1', amount: '-10', symbol: 'BBB' }),
      op('2024-01-01T09:00:00Z', 'TRADING', 'BUY', { shares: '1', amount: '-10', symbol: 'CCC' }),
      // Tre giorni operativi fuori ordine: 10, poi 1, poi 4. Ordinati fanno
      // 1, 4, 10 — la mediana è 4. Il valore centrale del vettore così
      // com'è arrivato (senza ordinare) sarebbe invece 1.
      op('2024-06-01T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '20' }),
      op('2024-06-02T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '11', symbol: 'BBB' }),
      op('2024-06-03T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '14', symbol: 'CCC' }),
    ];

    const all = windowsOf(operations).get('ALL')!;
    expect(all.activeDays).toBe(3);
    expect(all.medianPerActiveDay!.toString()).toBe('4');
  });

  it('reaches the same mean by both roads', () => {
    const operations = [
      op('2024-01-05T09:00:00Z', 'TRADING', 'BUY', { shares: '2', amount: '-20' }),
      op('2024-02-05T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '17' }),
      op('2024-03-08T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '4' }),
    ];
    const report = calculate(operations);
    const all = windowsOf(operations).get('ALL')!;

    // Ricostruita qui da zero, non presa in prestito dal modulo: cammina la
    // finestra giorno per giorno — estremi inclusi — sommando il profitto di
    // ogni vendita di quel giorno. È l'altra strada verso la stessa media,
    // quella che il modulo non percorre.
    const byDay = new Map<string, Decimal>();
    for (const sale of sales(report)) {
      byDay.set(sale.soldAt, (byDay.get(sale.soldAt) ?? ZERO).plus(sale.profit));
    }
    const series: Decimal[] = [];
    for (let day = all.from; day <= all.to; day = plusOneDay(day)) {
      series.push(byDay.get(day) ?? ZERO);
    }

    expect(series.length).toBe(all.calendarDays);
    // La media della serie giornaliera e utile ÷ giorni sono due strade allo
    // stesso numero: se divergono, una delle due è sbagliata.
    const byHand = series.reduce((sum, value) => sum.plus(value), ZERO).div(series.length);
    expect(all.meanPerCalendarDay!.toString()).toBe(byHand.toString());
  });

  it('counts both ends of the window, and keeps the sale made on the anchor', () => {
    const operations = [
      op('2024-06-01T09:00:00Z', 'TRADING', 'BUY', { shares: '1', amount: '-10' }),
      // Vendita il giorno stesso dell'ancora, l'estremo destro della finestra.
      op('2024-06-02T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '15' }),
    ];

    const all = windowsOf(operations).get('ALL')!;
    // Due giorni, non uno: gli estremi sono inclusi tutti e due.
    expect(all.calendarDays).toBe(2);
    // 5,00 su due giorni. Se il filtro escludesse l'ultimo giorno la vendita
    // sparirebbe del tutto e questa cifra sarebbe `null`, non un altro numero.
    expect(all.meanPerCalendarDay!.toString()).toBe('2.5');
  });
});

describe('a window with nothing in it', () => {
  const operations = [
    op('2024-01-05T09:00:00Z', 'TRADING', 'BUY', { shares: '1', amount: '-10' }),
    op('2024-02-05T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '17' }),
    op('2024-12-31T09:00:00Z', 'CASH', 'CUSTOMER_INBOUND', { amount: '500' }),
  ];

  it('states the absence rather than a zero', () => {
    const week = windowsOf(operations).get('1W')!;
    expect(week.sales).toBe(0);
    expect(week.activeDays).toBe(0);
    expect(week.profit.toString()).toBe('0');

    // Mai zero: `0,00 €` leggerebbe come «ho chiuso in pari».
    expect(week.winPercent).toBeNull();
    expect(week.meanPerCalendarDay).toBeNull();
    expect(week.meanPerActiveDay).toBeNull();
    expect(week.medianPerActiveDay).toBeNull();
  });
});

describe('a window that only lost money', () => {
  it('is zero per cent, not the absence of a percentage', () => {
    const operations = [
      op('2024-06-01T09:00:00Z', 'TRADING', 'BUY', { shares: '1', amount: '-10' }),
      op('2024-06-05T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '4' }),
    ];

    const all = windowsOf(operations).get('ALL')!;
    expect(all.sales).toBe(1);
    expect(all.winPercent!.toString()).toBe('0');
    expect(all.meanPerActiveDay!.toString()).toBe('-6');
  });
});

describe('the window boundary', () => {
  it('counts a sale that lands exactly on the first day of the window', () => {
    const operations = [
      op('2024-06-01T09:00:00Z', 'TRADING', 'BUY', { shares: '1', amount: '-10' }),
      // La finestra 1W di un'ancora al 30 giugno parte esattamente dal 24:
      // questa vendita cade sull'estremo, non appena dentro.
      op('2024-06-24T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '15' }),
      op('2024-06-30T09:00:00Z', 'CASH', 'CUSTOMER_INBOUND', { amount: '100' }),
    ];

    const week = windowsOf(operations).get('1W')!;
    expect(week.from).toBe('2024-06-24');
    expect(week.sales).toBe(1);
  });

  it('excludes a sale that lands the day before the window starts', () => {
    const operations = [
      op('2024-01-01T09:00:00Z', 'TRADING', 'BUY', { shares: '1', amount: '-10' }),
      op('2024-01-01T09:00:00Z', 'TRADING', 'BUY', { shares: '1', amount: '-10', symbol: 'BBB' }),
      // La finestra 1W parte dal 24: questa vendita cade sull'estremo e
      // conta.
      op('2024-06-24T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '15' }),
      // Un giorno prima dell'estremo: fuori dalla finestra, dentro ALL.
      op('2024-06-23T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '12', symbol: 'BBB' }),
      op('2024-06-30T09:00:00Z', 'CASH', 'CUSTOMER_INBOUND', { amount: '100' }),
    ];

    const windows = windowsOf(operations);
    expect(windows.get('1W')!.sales).toBe(1);
    expect(windows.get('ALL')!.sales).toBe(2);

    // Nessun test simmetrico serve sull'estremo superiore: `to` è la data di
    // ancoraggio, l'ultima del file, quindi nessuna vendita può cadere dopo.
  });
});

describe('an interval the reader chose', () => {
  const operations = [
    op('2024-01-01T09:00:00Z', 'TRADING', 'BUY', { shares: '1', amount: '-10' }),
    op('2024-01-01T09:00:00Z', 'TRADING', 'BUY', { shares: '1', amount: '-10', symbol: 'BBB' }),
    op('2024-01-01T09:00:00Z', 'TRADING', 'BUY', { shares: '1', amount: '-10', symbol: 'CCC' }),
    op('2024-06-10T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '15' }),
    op('2024-06-12T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '4', symbol: 'BBB' }),
    op('2024-06-14T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '20', symbol: 'CCC' }),
  ];
  const report = calculate(operations);

  it('holds a sale sitting on either end of it', () => {
    // Gli estremi sono inclusi tutti e due: le vendite del 10 e del 14 sono
    // dentro, quella di mezzo pure. Se un estremo fosse escluso resterebbero
    // due vendite, o una.
    const chosen = performanceRange(report, '2024-06-10', '2024-06-14');
    expect(chosen.sales).toBe(3);
    expect(chosen.calendarDays).toBe(5);
    expect(chosen.activeDays).toBe(3);
    expect(chosen.profit.toString()).toBe('9');
  });

  it('narrows to the days asked for, and to nothing else', () => {
    const chosen = performanceRange(report, '2024-06-11', '2024-06-13');
    expect(chosen.sales).toBe(1);
    expect(chosen.wins).toBe(0);
    expect(chosen.losses).toBe(1);
    expect(chosen.meanPerActiveDay!.toString()).toBe('-6');
  });

  it('reports the empty summary when the dates arrive the wrong way round', () => {
    // Nessuna eccezione: nessuna vendita soddisfa un intervallo rovesciato,
    // quindi il riassunto è quello vuoto. Dire che le date sono invertite
    // tocca alla vista — qui il motore non ha niente da inventare.
    const reversed = performanceRange(report, '2024-06-14', '2024-06-10');
    expect(reversed.sales).toBe(0);
    expect(reversed.profit.toString()).toBe('0');
    expect(reversed.winPercent).toBeNull();
    expect(reversed.meanPerCalendarDay).toBeNull();
    expect(reversed.medianPerActiveDay).toBeNull();
  });

  it('carries back the interval it was handed, not one of the six windows', () => {
    const chosen = performanceRange(report, '2024-03-01', '2024-06-11');
    expect(chosen.from).toBe('2024-03-01');
    expect(chosen.to).toBe('2024-06-11');
  });
});

describe('the net basis', () => {
  /*
   * Un onere in ognuna delle tre posizioni possibili: su un giorno senza
   * vendite (la commissione d'acquisto dell'1 giugno), su un giorno con una
   * vendita (il 10) e su un giorno con l'imposta di un'altra (il 14). In mezzo
   * un dividendo, che è denaro incassato e non un onere: serve a tenere il 12
   * fuori dal denominatore.
   */
  const operations = [
    op('2024-06-01T09:00:00Z', 'TRADING', 'BUY', { shares: '1', amount: '-10', fee: '-1' }),
    op('2024-06-01T09:00:00Z', 'TRADING', 'BUY', { shares: '1', amount: '-10', symbol: 'BBB' }),
    op('2024-06-10T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '15', fee: '-2' }),
    op('2024-06-12T09:00:00Z', 'CASH', 'DIVIDEND', { amount: '3' }),
    op('2024-06-14T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '20', symbol: 'BBB', tax: '-4' }),
  ];
  const report = calculate(operations);
  const from = '2024-06-01';
  const to = '2024-06-14';

  it('leaves the gross reading alone when nobody asks for the other one', () => {
    const gross = performanceRange(report, from, to);
    expect(gross.basis).toBe('gross');
    expect(gross.profit.toString()).toBe('15');
    expect(gross.activeDays).toBe(2);
    expect(gross.meanPerActiveDay!.toFixed(2)).toBe('7.50');
    expect(gross.medianPerActiveDay!.toFixed(2)).toBe('7.50');
  });

  it('subtracts every charge dated inside the period, not only the ones on a sale', () => {
    // 15 di vendite meno 1 (commissione d'acquisto) meno 2 (commissione di
    // vendita) meno 4 (imposta): la commissione dell'1 giugno è quella che
    // sparirebbe se si guardassero solo i giorni con una vendita.
    const net = performanceRange(report, from, to, 'net');
    expect(net.basis).toBe('net');
    expect(net.profit.toString()).toBe('8');
  });

  it('counts a day of pure charges among the active ones', () => {
    const net = performanceRange(report, from, to, 'net');
    // L'1 giugno entra, il 12 no: quel giorno ha un dividendo e zero oneri, e
    // un giorno che vale zero abbasserebbe la mediana senza essere successo.
    expect(net.activeDays).toBe(3);
  });

  it('reads mean and median off the same daily series', () => {
    const net = performanceRange(report, from, to, 'net');
    // I giorni valgono −1, +3 e +6: la media è 8/3 e la mediana è il 10 giugno.
    // Una mediana presa sulla serie lorda direbbe 7,50 €.
    expect(net.meanPerActiveDay!.toFixed(2)).toBe('2.67');
    expect(net.medianPerActiveDay!.toFixed(2)).toBe('3.00');
  });

  it('divides the net figure by the calendar days, not the gross one', () => {
    const net = performanceRange(report, from, to, 'net');
    expect(net.calendarDays).toBe(14);
    expect(net.meanPerCalendarDay!.toFixed(4)).toBe('0.5714');
  });

  it('counts the same sales either way: a fee is not a trade', () => {
    const net = performanceRange(report, from, to, 'net');
    const gross = performanceRange(report, from, to);
    expect(net.sales).toBe(gross.sales);
    expect(net.wins).toBe(gross.wins);
    expect(net.losses).toBe(gross.losses);
    expect(net.winPercent!.toString()).toBe(gross.winPercent!.toString());
  });

  it('ignores a charge dated outside the chosen interval', () => {
    // Lo stesso periodo meno il primo giorno: sparisce la commissione da 1 e
    // sparisce il suo giorno operativo.
    const later = performanceRange(report, '2024-06-02', to, 'net');
    expect(later.profit.toString()).toBe('9');
    expect(later.activeDays).toBe(2);
  });

  it('stays empty on a period without sales, however much it cost', () => {
    // Dall'1 al 9 giugno c'è solo la commissione d'acquisto. Stampare
    // «−1,00 €» come rendimento giornaliero chiamerebbe performance il costo
    // di stare fermi.
    const quiet = performanceRange(report, from, '2024-06-09', 'net');
    expect(quiet.sales).toBe(0);
    expect(quiet.activeDays).toBe(0);
    expect(quiet.profit.toString()).toBe('0');
    expect(quiet.meanPerCalendarDay).toBeNull();
    expect(quiet.medianPerActiveDay).toBeNull();
  });

  it('declares a withheld sum that reconciles the two readings', () => {
    /*
     * La proprietà per cui il campo esiste: `charges` deve essere esattamente
     * la distanza fra le due letture. Misurata contro il lordo e non contro la
     * somma 1+2+4, che è l'espressione del modulo riscritta nel test.
     */
    const gross = performanceRange(report, from, to);
    const net = performanceRange(report, from, to, 'net');
    expect(net.charges.toString()).toBe('7');
    expect(gross.profit.minus(net.profit).toString()).toBe(net.charges.toString());
  });

  it('withholds nothing on the gross basis', () => {
    // Non «gli oneri del periodo» in astratto: quanto è stato tolto qui.
    expect(performanceRange(report, from, to).charges.toString()).toBe('0');
  });

  it('follows the chosen interval, like the figure it explains', () => {
    // Fuori il primo giorno, fuori la sua commissione da 1: 7 diventa 6.
    const later = performanceRange(report, '2024-06-02', to, 'net');
    expect(later.charges.toString()).toBe('6');
  });

  it('withholds nothing where nothing was taken from anything', () => {
    /*
     * Dall'1 al 9 giugno la commissione d'acquisto c'è, ma non c'è una vendita
     * da cui sottrarla: `profit` non viene toccato, quindi la cifra dichiarata
     * al lettore è zero e la vista non ha una seconda regola da ricordare.
     */
    const quiet = performanceRange(report, from, '2024-06-09', 'net');
    expect(quiet.charges.toString()).toBe('0');
  });

  it('carries the basis into every one of the six windows', () => {
    const windows = performanceWindows(operations, report, 'net');
    expect(windows.map((window) => window.basis)).toEqual(
      PERFORMANCE_WINDOW_KEYS.map(() => 'net'),
    );
    expect(windows.find((window) => window.key === 'ALL')!.profit.toString()).toBe('8');
  });
});

describe('the cross-check with execution quality', () => {
  it('agrees with executionQuality over a bounded window, not just the whole file', () => {
    const operations = [
      op('2024-01-01T09:00:00Z', 'TRADING', 'BUY', { shares: '1', amount: '-10' }),
      op('2024-01-01T09:00:00Z', 'TRADING', 'BUY', { shares: '1', amount: '-10', symbol: 'BBB' }),
      op('2024-01-01T09:00:00Z', 'TRADING', 'BUY', { shares: '1', amount: '-10', symbol: 'CCC' }),
      // Fuori dalla finestra di un mese: un titolo venduto a gennaio non
      // deve comparire nel gruppo filtrato.
      op('2024-01-15T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '15' }),
      op('2024-06-20T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '5', symbol: 'BBB' }),
      op('2024-07-01T09:00:00Z', 'TRADING', 'SELL', { shares: '-1', amount: '20', symbol: 'CCC' }),
    ];
    const report = calculate(operations);

    // Per la finestra ALL il gruppo filtrato è l'intero `sales(report)`: un
    // confronto con `executionQuality` lì sopra sarebbe circolare, perché
    // verificherebbe la delega e non il filtro. Qui il filtro fa davvero
    // qualcosa — un titolo su tre resta fuori.
    const oneMonth = windowsOf(operations).get('1M')!;
    const expected = executionQuality(
      sales(report).filter((sale) => sale.soldAt >= oneMonth.from && sale.soldAt <= oneMonth.to),
    )!;

    expect(oneMonth.sales).toBe(2);
    expect(expected.count).toBe(2);
    expect(oneMonth.sales).toBe(expected.count);
    expect(oneMonth.winPercent!.toString()).toBe(expected.winPercent.toString());
  });
});
