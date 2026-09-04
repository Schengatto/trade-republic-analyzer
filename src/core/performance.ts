/*
 * A che ritmo il conto produce, dentro un periodo scelto dal lettore.
 *
 * L'unità è la vendita di `execution.ts` — un simbolo, un giorno — e non la
 * posizione-titolo chiusa di `analytics.ts`: sugli stessi dati le due danno
 * percentuali diverse, e la vendita è la cosa che il titolare del conto ha
 * effettivamente deciso di fare.
 *
 * L'utile è quello da trading, cioè esattamente il risultato delle vendite
 * contate qui accanto. Dividendi e interessi resterebbero denaro che nessuna
 * di queste vendite ha prodotto — e restano fuori da entrambe le basi.
 *
 * Gli oneri invece sono una scelta del lettore, `ProfitBasis`: quel denaro il
 * broker se l'è preso davvero nel periodo, ma non l'ha prodotto una vendita in
 * particolare, quindi nessuna delle due letture è più vera dell'altra.
 */

import { WINDOW_KEYS, windowRange } from './analytics';
import type { WindowKey } from './analytics';
import { daysBetween } from './dates';
import { executionQuality, sales } from './execution';
import type { Sale } from './execution';
import type { DailyLedger, Report } from './fifo';
import { ZERO } from './money';
import type { Decimal } from './money';
import type { Operation } from './operation';

/**
 * Cosa misura `profit`: il solo risultato delle vendite, o quel risultato meno
 * tutte le commissioni e imposte datate dentro il periodo.
 *
 * `net` sottrae anche oneri che nessuna di quelle vendite ha causato — la
 * commissione di un acquisto, l'imposta su un dividendo, il bollo. È voluto: è
 * quanto il periodo ha davvero lasciato, e attribuire ogni onere alla vendita
 * «giusta» sarebbe un'invenzione, non un calcolo.
 */
export type ProfitBasis = 'gross' | 'net';

/** Ogni finestra tranne `1D`, dove media e mediana stampano lo stesso numero. */
export const PERFORMANCE_WINDOW_KEYS: readonly WindowKey[] = WINDOW_KEYS.filter(
  (key) => key !== '1D',
);

export interface PerformancePeriod {
  /** Primo giorno coperto, incluso. */
  from: string;
  /** Ultimo giorno coperto, incluso: la data di ancoraggio. */
  to: string;
  /** Quale delle due letture raccontano `profit` e le tre cifre giornaliere. */
  basis: ProfitBasis;
  wins: number;
  losses: number;
  breakEven: number;
  /** `wins + losses + breakEven`. Gli oneri non sono vendite: non lo muovono. */
  sales: number;
  /**
   * Somma dei risultati di quelle vendite; su base `net`, meno gli oneri del
   * periodo. Il nome non dice «trading» perché non sempre è solo quello.
   */
  profit: Decimal;
  /**
   * Di quanto `profit` è stato ridotto: magnitudine positiva, `ZERO` su base
   * lorda. Non è «gli oneri del periodo» in astratto ma esattamente la cifra
   * tolta qui, quindi vale `ZERO` anche dove non si è tolto niente da niente —
   * un periodo senza vendite chiuse.
   *
   * Esiste perché la differenza fra le due basi, altrimenti, il lettore la può
   * solo ricordare: la casella sostituisce i numeri, non li affianca.
   */
  charges: Decimal;
  /** Giorni della finestra, estremi inclusi. I giorni fermi contano. */
  calendarDays: number;
  /**
   * Giorni distinti con qualcosa dentro: una vendita chiusa, e su base `net`
   * anche un solo onere pagato. Il denominatore cambia con la base, ed è il
   * motivo per cui la vista deve dirlo accanto alla cifra.
   */
  activeDays: number;

  /*
   * Questi quattro campi — non `profit`, che resta `ZERO` a vendite
   * zero, perché zero euro di utile da vendite chiuse è il fatto vero in quel
   * caso — sono tutti `null` quando `sales === 0`, mai zero: il tipo impedisce
   * alla vista di stampare un valore dove non si è chiuso niente, che
   * leggerebbe come «ho chiuso in pari». Una finestra con vendite tutte in
   * perdita vale invece zero per cento, e lo deve dire.
   */
  winPercent: Decimal | null;
  meanPerCalendarDay: Decimal | null;
  meanPerActiveDay: Decimal | null;
  medianPerActiveDay: Decimal | null;
}

/*
 * Non esiste una mediana per giorno di calendario, ed è una scelta: i giorni
 * fermi sono quasi sempre la maggioranza, quindi il valore di mezzo della
 * serie di calendario è zero per qualunque conto e qualunque intervallo lungo.
 * Sarebbe una cella che stampa la stessa cifra per tutti i lettori.
 */

/** Una delle finestre predefinite: il prospetto fisso accanto all'intervallo scelto. */
export interface PerformanceWindow extends PerformancePeriod {
  key: WindowKey;
}

export function performanceWindows(
  operations: readonly Operation[],
  report: Report,
  basis: ProfitBasis = 'gross',
): PerformanceWindow[] {
  const all = sales(report);

  return PERFORMANCE_WINDOW_KEYS.flatMap((key) => {
    const range = windowRange(operations, key);
    if (range === null) return [];
    return [{ key, ...summarize(all, report.perDay, range.from, range.to, basis) }];
  });
}

/**
 * Lo stesso riassunto, su un intervallo che sceglie il lettore.
 *
 * `from` e `to` sono inclusi entrambi. Un intervallo rovesciato non solleva
 * niente qui: nessuna vendita lo soddisfa, quindi torna il riassunto vuoto.
 * Tocca alla vista dire che le date sono invertite, invece di lasciar credere
 * al lettore che non abbia venduto niente.
 */
export function performanceRange(
  report: Report,
  from: string,
  to: string,
  basis: ProfitBasis = 'gross',
): PerformancePeriod {
  return summarize(sales(report), report.perDay, from, to, basis);
}

function summarize(
  all: readonly Sale[],
  perDay: DailyLedger,
  from: string,
  to: string,
  basis: ProfitBasis,
): PerformancePeriod {
  const group = all.filter((sale) => sale.soldAt >= from && sale.soldAt <= to);
  const quality = executionQuality(group);
  const calendarDays = daysBetween(from, to) + 1;

  /*
   * Nessuna vendita, nessuna cifra — anche su base `net`, anche se il periodo
   * ha pagato oneri. Questa card misura come sono andate le vendite: dire
   * «−12,40 € al giorno» dove non se n'è chiusa nessuna significherebbe
   * chiamare performance il costo di stare fermi.
   */
  if (quality === null) {
    return {
      from,
      to,
      basis,
      wins: 0,
      losses: 0,
      breakEven: 0,
      sales: 0,
      profit: ZERO,
      charges: ZERO,
      calendarDays,
      activeDays: 0,
      winPercent: null,
      meanPerCalendarDay: null,
      meanPerActiveDay: null,
      medianPerActiveDay: null,
    };
  }

  // Un valore per giorno operativo: tre vendite lo stesso giorno sono un
  // giorno solo, e portano la loro somma.
  const byDay = new Map<string, Decimal>();
  for (const sale of group) {
    byDay.set(sale.soldAt, (byDay.get(sale.soldAt) ?? ZERO).plus(sale.profit));
  }

  let profit = group.reduce((sum, sale) => sum.plus(sale.profit), ZERO);
  let withheld = ZERO;

  if (basis === 'net') {
    for (const [day, [, , charges]] of Object.entries(perDay)) {
      if (day < from || day > to) continue;
      // Un giorno di soli dividendi ha il secchio oneri a zero e non deve
      // diventare un giorno operativo: entrerebbe nel denominatore, e nella
      // mediana, portando uno zero che nessuno ha vissuto.
      if (charges.isZero()) continue;
      // Somma, totale sottratto e serie giornaliera dallo stesso passaggio:
      // media, mediana e la cifra dichiarata al lettore devono leggere gli
      // stessi numeri, o la card racconta due periodi.
      profit = profit.minus(charges);
      withheld = withheld.plus(charges);
      byDay.set(day, (byDay.get(day) ?? ZERO).minus(charges));
    }
  }

  return {
    from,
    to,
    basis,
    wins: quality.wins,
    losses: quality.losses,
    breakEven: quality.breakEven,
    sales: quality.count,
    profit,
    charges: withheld,
    calendarDays,
    activeDays: byDay.size,
    winPercent: quality.winPercent,
    // I giorni fermi pesano nel denominatore: è il senso di tenere questa
    // base distinta da quella operativa.
    meanPerCalendarDay: profit.div(calendarDays),
    // `byDay` non è mai vuota quando `quality` non è nulla: un gruppo non
    // vuoto ha almeno un giorno.
    meanPerActiveDay: profit.div(byDay.size),
    medianPerActiveDay: median([...byDay.values()]),
  };
}

/**
 * Il valore di mezzo, o la semisomma dei due centrali.
 *
 * Su `Decimal` e non su `number`: con un numero pari di giorni la mediana è
 * una semisomma, e in centesimi deve arrotondare come tutto il resto del
 * motore.
 */
function median(values: readonly Decimal[]): Decimal | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a.comparedTo(b));
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle]!;
  return sorted[middle - 1]!.plus(sorted[middle]!).div(2);
}
