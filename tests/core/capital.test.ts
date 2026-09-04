import { describe, expect, it } from 'vitest';
import { monthlyCapital } from '../../src/core/capital';
import { monthlyAggregates } from '../../src/core/analytics';
import { calculate } from '../../src/core/fifo';
import type { Operation } from '../../src/core/operation';
import { op } from '../helpers/operations';

/** Compare a Decimal-valued result against an exact decimal literal. */
function eur(value: { toFixed(dp: number): string }): string {
  return value.toFixed(2);
}

function capitalOf(operations: Operation[]) {
  return monthlyCapital(operations, calculate(operations));
}

describe('monthlyCapital', () => {
  it('averages over the days, not over the month-end snapshot', () => {
    // 310 € a rischio dal 1° al 20 marzo, zero dal 21 al 31: la media è 200 €,
    // la fotografia di fine mese sarebbe zero. Senza questo caso una media e
    // uno snapshot passano lo stesso test.
    const months = capitalOf([
      op('2024-03-01', 'TRADING', 'BUY', { shares: '10', amount: '-310.00' }),
      op('2024-03-21', 'TRADING', 'SELL', { shares: '-10', amount: '400.00' }),
      op('2024-03-31', 'CASH', 'CUSTOMER_INBOUND', { amount: '100.00' }),
    ]);
    expect(months).toHaveLength(1);
    expect(months[0]!.month).toBe('2024-03');
    expect(eur(months[0]!.averageCapital)).toBe('200.00');
    expect(months[0]!.days).toBe(31);
    expect(eur(months[0]!.profit)).toBe('90.00');
    expect(eur(months[0]!.returnPercent!)).toBe('45.00');
  });

  it('divides the first and the last month by the days the data covers', () => {
    const months = capitalOf([
      op('2024-01-30', 'TRADING', 'BUY', { shares: '10', amount: '-100.00' }),
      op('2024-02-02', 'TRADING', 'SELL', { shares: '-10', amount: '120.00' }),
    ]);
    expect(months.map((m) => [m.month, m.days])).toEqual([
      ['2024-01', 2],
      ['2024-02', 2],
    ]);
    // Gennaio: 100 € il 30 e il 31. Febbraio: 100 € il 1°, zero il 2.
    expect(eur(months[0]!.averageCapital)).toBe('100.00');
    expect(eur(months[1]!.averageCapital)).toBe('50.00');
  });

  it('keeps a month with an open position and no operations', () => {
    const months = capitalOf([
      op('2024-01-15', 'TRADING', 'BUY', { shares: '10', amount: '-100.00' }),
      op('2024-03-10', 'TRADING', 'SELL', { shares: '-10', amount: '100.00' }),
    ]);
    const february = months.find((m) => m.month === '2024-02')!;
    expect(february.days).toBe(29);
    expect(eur(february.averageCapital)).toBe('100.00');
    expect(eur(february.profit)).toBe('0.00');
    // Capitale immobilizzato che non ha reso nulla è uno zero pieno, non un buco.
    expect(eur(february.returnPercent!)).toBe('0.00');
  });

  it('states no return where there was no capital, and leaves interest out of the profit', () => {
    const operations = [
      op('2024-01-10', 'CASH', 'CUSTOMER_INBOUND', { amount: '1000.00' }),
      op('2024-01-20', 'CASH', 'INTEREST_PAYMENT', { amount: '5.00' }),
    ];
    const months = capitalOf(operations);
    expect(eur(months[0]!.averageCapital)).toBe('0.00');
    expect(months[0]!.returnPercent).toBeNull();
    // Gli interessi sono il rendimento del non investito: fuori dal numeratore,
    // benché la heatmap li conti nel profitto dello stesso mese.
    expect(eur(months[0]!.profit)).toBe('0.00');
    expect(eur(monthlyAggregates(operations, calculate(operations))[0]!.profit)).toBe('5.00');
  });

  it('never lets an uncovered sale push the capital below zero', () => {
    const months = capitalOf([
      op('2024-01-05', 'TRADING', 'BUY', { shares: '5', amount: '-50.00' }),
      op('2024-01-06', 'TRADING', 'SELL', { shares: '-10', amount: '200.00' }),
      op('2024-02-10', 'CASH', 'CUSTOMER_INBOUND', { amount: '1.00' }),
    ]);
    expect(months[0]!.averageCapital.isNegative()).toBe(false);
    // Febbraio non ha più lotti: se la vendita scoperta avesse consumato più
    // del costo esistente, qui comparirebbe un capitale negativo.
    expect(eur(months[1]!.averageCapital)).toBe('0.00');
    expect(months[1]!.returnPercent).toBeNull();
  });

  it('takes the profit from the same components the composition chart uses', () => {
    const operations = [
      op('2024-01-05', 'TRADING', 'BUY', { shares: '10', amount: '-100.00' }),
      op('2024-01-25', 'TRADING', 'SELL', { shares: '-10', amount: '130.00', tax: '-3.00' }),
      op('2024-01-28', 'CASH', 'DIVIDEND', { amount: '7.00' }),
    ];
    const aggregate = monthlyAggregates(operations, calculate(operations))[0]!;
    const month = capitalOf(operations)[0]!;
    expect(eur(month.profit)).toBe(
      eur(aggregate.components.trading.plus(aggregate.components.dividends)),
    );
    expect(eur(month.profit)).toBe('37.00');
  });

  it('has nothing to say about an empty file', () => {
    expect(capitalOf([])).toEqual([]);
  });

  it('does not mistake arithmetic dust for capital still at risk', () => {
    // 3 quote a -100,00: il costo unitario 100/3 non termina entro le 28
    // cifre di precisione. Vendendo tutto, il residuo che resta in
    // `investedDelta` è dell'ordine di 1e-26 — sopra zero in aritmetica
    // esatta, ma stampato come 0,00 €. Un dividendo due mesi dopo, senza
    // capitale reale nel mezzo, è il caso che smaschera un gate su `.gt(0)`.
    const operations = [
      op('2024-01-10', 'TRADING', 'BUY', { shares: '3', amount: '-100.00' }),
      op('2024-01-20', 'TRADING', 'SELL', { shares: '-3', amount: '130.00' }),
      op('2024-03-15', 'CASH', 'DIVIDEND', { amount: '7.00' }),
    ];
    const months = capitalOf(operations);
    const march = months.find((m) => m.month === '2024-03')!;
    expect(eur(march.averageCapital)).toBe('0.00');
    expect(march.returnPercent).toBeNull();
  });

  it('does not lose a delta booked on a blank date', () => {
    // csv.ts mappa una data mancante su '': la riga ordina prima di ogni
    // data reale ed esce da [range.from, range.to]. Se il suo delta non
    // viene seminato prima della camminata, la vendita a data vuota non
    // annulla mai il costo del lotto, e il capitale resta sovrastimato per
    // ogni mese successivo.
    const operations = [
      op('2024-01-05', 'TRADING', 'BUY', { shares: '10', amount: '-100.00' }),
      op('2024-01-06', 'TRADING', 'SELL', { shares: '-10', amount: '100.00', date: '' }),
      op('2024-03-10', 'CASH', 'CUSTOMER_INBOUND', { amount: '50.00' }),
    ];
    const months = capitalOf(operations);
    const march = months.find((m) => m.month === '2024-03')!;
    expect(eur(march.averageCapital)).toBe('0.00');
    expect(march.returnPercent).toBeNull();
  });
});
