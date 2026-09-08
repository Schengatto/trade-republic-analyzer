import { describe, expect, it } from 'vitest';
import { MIN_IRR_DAYS, annualReturn } from '../../src/core/irr';
import { calculate } from '../../src/core/fifo';
import type { Operation } from '../../src/core/operation';
import { op } from '../helpers/operations';

function rateOf(operations: Operation[]): string | null {
  const rate = annualReturn(operations, calculate(operations));
  return rate === null ? null : rate.toFixed(2);
}

/**
 * 2024-01-01 più 730 giorni: il 2024 è bisestile, quindi i due anni esatti
 * finiscono il 31 dicembre 2025 e non il 1° gennaio 2026.
 */
const TWO_YEARS_LATER = '2025-12-31';

describe('annualReturn', () => {
  it('compounds the rate instead of dividing the period by the years', () => {
    // 100 € versati, 165 € due anni dopo. Un +65% in due anni non è un +32,5%
    // l'anno: √1,65 − 1 fa 28,45%, ed è la stessa domanda dell'utente — un anno
    // a +10% e uno a +50% fanno 28,45%, non 30%.
    expect(
      rateOf([
        op('2024-01-01', 'CASH', 'CUSTOMER_INBOUND', { amount: '100.00' }),
        op('2024-01-01', 'TRADING', 'BUY', { shares: '10', amount: '-100.00' }),
        op(TWO_YEARS_LATER, 'TRADING', 'SELL', { shares: '-10', amount: '165.00' }),
      ]),
    ).toBe('28.45');
  });

  it('rewards the euro that arrived late for the time it was not there', () => {
    // Stesso utile, stesso valore finale, stessi versamenti: cambia solo
    // *quando* è arrivato il secondo. Se il tasso non guardasse le date le due
    // cifre sarebbero identiche, ed è esattamente l'errore che questa funzione
    // esiste per non fare: 65 € guadagnati da 200 € fermi due anni non sono lo
    // stesso rendimento di 65 € guadagnati da 100 €, con gli altri 100 €
    // arrivati un mese prima della fine.
    const fromDayOne = rateOf([
      op('2024-01-01', 'CASH', 'CUSTOMER_INBOUND', { amount: '200.00' }),
      op('2024-01-01', 'TRADING', 'BUY', { shares: '10', amount: '-100.00' }),
      op('2024-01-01', 'TRADING', 'BUY', { shares: '10', amount: '-100.00' }),
      op(TWO_YEARS_LATER, 'TRADING', 'SELL', { shares: '-20', amount: '265.00' }),
    ])!;
    const paidLate = rateOf([
      op('2024-01-01', 'CASH', 'CUSTOMER_INBOUND', { amount: '100.00' }),
      op('2024-01-01', 'TRADING', 'BUY', { shares: '10', amount: '-100.00' }),
      op('2025-12-01', 'CASH', 'CUSTOMER_INBOUND', { amount: '100.00' }),
      op('2025-12-01', 'TRADING', 'BUY', { shares: '10', amount: '-100.00' }),
      op(TWO_YEARS_LATER, 'TRADING', 'SELL', { shares: '-20', amount: '265.00' }),
    ])!;
    // 265/200 su due anni pieni: √1,325 − 1.
    expect(fromDayOne).toBe('15.11');
    expect(Number(paidLate)).toBeGreaterThan(Number(fromDayOne));
  });

  it('treats card spending as money taken out of the account', () => {
    const withoutCard = [
      op('2024-01-01', 'CASH', 'CUSTOMER_INBOUND', { amount: '200.00' }),
      op('2024-01-01', 'TRADING', 'BUY', { shares: '10', amount: '-100.00' }),
      op(TWO_YEARS_LATER, 'TRADING', 'SELL', { shares: '-10', amount: '165.00' }),
    ];
    // Cinquanta euro spesi a metà strada sono cinquanta euro tornati a chi
    // investe: senza contarli, il capitale risulterebbe fermo sul conto fino
    // alla fine e il tasso ne uscirebbe più basso.
    const withCard = [
      ...withoutCard,
      op('2025-01-01', 'CASH', 'CARD_TRANSACTION', { amount: '-50.00' }),
    ];
    expect(rateOf(withCard)).not.toBe(rateOf(withoutCard));
  });

  it('says nothing below the ninetieth day, and speaks on it', () => {
    // La soglia è inclusiva: senza il caso esatto, `<` e `<=` restano
    // indistinguibili. E i giorni sono quelli *trascorsi*, non quelli coperti
    // come in `capital.ts`: dal 1° gennaio 2024 il novantesimo è il 31 marzo,
    // non il 30 — il 2024 è bisestile, e un anno normale sposterebbe la data.
    const until = (day: string): Operation[] => [
      op('2024-01-01', 'CASH', 'CUSTOMER_INBOUND', { amount: '100.00' }),
      op('2024-01-01', 'TRADING', 'BUY', { shares: '10', amount: '-100.00' }),
      op(day, 'TRADING', 'SELL', { shares: '-10', amount: '110.00' }),
    ];
    expect(MIN_IRR_DAYS).toBe(90);
    expect(rateOf(until('2024-03-30'))).toBeNull();
    expect(rateOf(until('2024-03-31'))).not.toBeNull();
  });

  it('has no rate for an account that never saw a deposit', () => {
    // Senza flussi di capitale non c'è un denaro investito su cui misurare un
    // rendimento, per quanto lungo sia lo storico.
    expect(
      rateOf([
        op('2024-01-01', 'TRADING', 'BUY', { shares: '10', amount: '-100.00' }),
        op('2025-01-01', 'TRADING', 'SELL', { shares: '-10', amount: '165.00' }),
      ]),
    ).toBeNull();
  });

  it('has no rate when the flows never change sign', () => {
    // Solo prelievi, e un conto che vale ancora qualcosa: ogni flusso è denaro
    // che torna indietro, e un tasso che li annulli tutti non esiste. Meglio il
    // trattino di una radice inventata agli estremi della ricerca.
    expect(
      rateOf([
        op('2024-01-01', 'CASH', 'CUSTOMER_OUTBOUND_REQUEST', { amount: '-50.00' }),
        op('2025-01-01', 'CASH', 'DIVIDEND', { amount: '100.00' }),
      ]),
    ).toBeNull();
  });

  it('has nothing to say about an empty file', () => {
    expect(rateOf([])).toBeNull();
  });
});
