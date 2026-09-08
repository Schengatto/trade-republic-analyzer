/*
 * Il rendimento annuo del portafoglio: tasso interno di rendimento sui flussi
 * datati, non una percentuale divisa per gli anni.
 *
 * Perché serve un TIR e non una scalatura. Il rendimento sul capitale della
 * Sintesi è un totale: quanto ha reso in tutto il denaro versato. Riportarlo a
 * un anno dividendolo per la durata dà due risposte sbagliate insieme — ignora
 * la capitalizzazione (un +10% seguito da un +50% fa 28,45% l'anno, non 30%) e
 * assume che tutto il capitale fosse lì dal primo giorno, mentre i versamenti
 * sono arrivati scaglionati. Il TIR è il tasso che, applicato a ogni euro per
 * il tempo in cui è stato effettivamente sul conto, riporta il valore finale:
 * è la sola cifra che risponde a «quanto rende in media all'anno».
 *
 * Il limite. Come tutto il report, le posizioni ancora aperte sono valutate al
 * costo di carico e non ai prezzi di mercato, quindi il non realizzato non
 * entra nel valore finale. La percentuale che ne esce è prudente, e la vista
 * deve dirlo.
 */

import { categoryOf } from './classify';
import { daysBetween } from './dates';
import type { Report } from './fifo';
import { Decimal, dec } from './money';
import type { Operation } from './operation';

/** Sotto questa soglia il tasso annuo amplifica il rumore, come in `capital.ts`. */
export const MIN_IRR_DAYS = 90;

const DAYS_IN_A_YEAR = 365;
const PERCENT = 100;

/** Estremi della ricerca: −99,99% è la rovina totale, +1000% il tetto oltre cui
 * la cifra non sarebbe comunque credibile. */
const LOWEST_RATE = -0.9999;
const HIGHEST_RATE = 10;

/*
 * Cinquanta bisezioni portano l'intervallo iniziale sotto 1e-14: ben oltre le
 * due cifre decimali che la pagina stampa, e senza le divergenze che Newton
 * può avere su serie di flussi lunghe e irregolari come queste.
 */
const ITERATIONS = 50;

interface Flow {
  /** Giorni dal primo movimento. */
  day: number;
  /** Positivo se il denaro torna a chi investe, negativo se esce di tasca. */
  value: number;
}

/**
 * Valore attuale netto dei flussi a un dato tasso annuo.
 *
 * In virgola mobile e non in `Decimal`: il TIR è la radice di un polinomio di
 * grado pari ai giorni, non ha forma chiusa, e va comunque cercato per
 * approssimazioni. La doppia precisione tiene quindici cifre significative
 * dove la pagina ne stampa quattro, e `Decimal.pow` con esponente frazionario
 * costerebbe un ordine di grandezza in più per zero differenza sul risultato.
 */
function presentValue(flows: readonly Flow[], rate: number): number {
  return flows.reduce(
    (total, flow) => total + flow.value / Math.pow(1 + rate, flow.day / DAYS_IN_A_YEAR),
    0,
  );
}

/**
 * Il tasso che annulla il valore attuale, cercato per bisezione.
 *
 * `null` quando la domanda non ha una risposta sola: senza cambio di segno agli
 * estremi non c'è radice nell'intervallo, e un conto che non ha mai visto un
 * versamento non ha un rendimento da misurare.
 */
function solve(flows: readonly Flow[]): number | null {
  let low = LOWEST_RATE;
  let high = HIGHEST_RATE;
  const atLow = presentValue(flows, low);
  if (!Number.isFinite(atLow) || atLow * presentValue(flows, high) > 0) return null;

  for (let i = 0; i < ITERATIONS; i += 1) {
    const middle = (low + high) / 2;
    if (atLow * presentValue(flows, middle) <= 0) high = middle;
    else low = middle;
  }
  return (low + high) / 2;
}

/**
 * Rendimento annuo del portafoglio, in percentuale, o `null` quando non è
 * misurabile: storia troppo breve, nessun movimento di capitale, o flussi che
 * non cambiano mai segno.
 */
export function annualReturn(
  operations: readonly Operation[],
  report: Report,
): Decimal | null {
  const days = operations.map((row) => row.date.slice(0, 10)).sort();
  const first = days[0];
  const last = days.at(-1);
  if (first === undefined || last === undefined) return null;
  if (daysBetween(first, last) < MIN_IRR_DAYS) return null;

  // Dal punto di vista di chi investe il segno è rovesciato rispetto al conto:
  // un versamento esce di tasca, un prelievo rientra. La spesa con la carta è
  // denaro uscito dal conto per un uso personale, quindi è un prelievo anche
  // se l'export non la classifica così.
  const flows: Flow[] = [];
  for (const row of operations) {
    const category = categoryOf(row.type);
    if (category !== 'CAPITAL_MOVEMENTS' && category !== 'CARD_SPENDING') continue;
    const amount = dec(row.amount);
    if (amount.isZero()) continue;
    flows.push({
      day: daysBetween(first, row.date.slice(0, 10)),
      value: amount.negated().toNumber(),
    });
  }
  if (flows.length === 0) return null;

  // Quanto varrebbe il conto oggi: versato più utile netto, meno quello che è
  // uscito con la carta. È l'identità che `reconcile.ts` verifica riga per
  // riga, quindi non è una seconda definizione del valore finale.
  const terminal = report.netCapitalPaidIn
    .plus(report.netProfit)
    .minus(report.cardSpending)
    .toNumber();
  flows.push({ day: daysBetween(first, last), value: terminal });

  const rate = solve(flows);
  return rate === null ? null : new Decimal(rate).times(PERCENT);
}
