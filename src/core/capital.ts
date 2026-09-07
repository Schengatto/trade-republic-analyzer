/**
 * Quanto capitale era a rischio in ogni mese, e quanto ha prodotto.
 *
 * Il capitale è il costo di carico delle posizioni aperte, misurato a fine
 * giornata e mediato sui giorni di calendario del mese, weekend inclusi: una
 * posizione è a rischio anche il sabato, e mediare sui soli giorni operativi
 * gonfierebbe il denominatore dei mesi tranquilli — cioè esattamente la
 * distorsione che questa metrica esiste per evitare.
 *
 * Sta fuori da `analytics.ts` perché quel file serve già cinque sezioni.
 */
import { monthlyAggregates, windowRange } from './analytics';
import { plusOneDay } from './dates';
import type { Report } from './fifo';
import { ZERO } from './money';
import type { Decimal } from './money';
import type { Operation } from './operation';

export interface MonthlyCapital {
  /** YYYY-MM */
  month: string;
  /** Costo medio delle posizioni aperte sui giorni coperti del mese. */
  averageCapital: Decimal;
  /** Giorni su cui la media è calcolata: parziale nel primo e nell'ultimo mese. */
  days: number;
  /** Trading realizzato + dividendi del mese. */
  profit: Decimal;
  /** `null` quando non c'era capitale: un rapporto senza denominatore. */
  returnPercent: Decimal | null;
}

export interface OverallCapital {
  /** Costo medio delle posizioni aperte su tutti i giorni del periodo. */
  averageCapital: Decimal;
  /** Giorni di calendario coperti, dal primo movimento all'ultimo. */
  days: number;
  /** Trading realizzato + dividendi dell'intero periodo. */
  profit: Decimal;
  /** `null` quando non c'era capitale, o quando la storia è troppo breve. */
  annualPercent: Decimal | null;
}

const PERCENT = 100;
const HALF_OF_THE_LAST_PRINTED_DIGIT = '0.005';
const DAYS_IN_A_YEAR = 365;

/**
 * Sotto questa soglia l'annualizzazione moltiplica il rumore, non il segnale:
 * tre settimane riportate a un anno vengono moltiplicate per diciassette, e il
 * risultato dice più sulla lunghezza del file che sull'operatività.
 */
export const MIN_ANNUALISED_DAYS = 90;

/**
 * Se la colonna del capitale stampa una cifra sopra zero.
 *
 * La divisione che fissa il costo unitario in `fifo.ts` non sempre termina
 * entro le 28 cifre di precisione: chiudere del tutto una posizione può
 * lasciare un residuo dell'ordine di 1e-26, che `.gt(0)` sul valore esatto
 * scambierebbe per capitale reale. Il gate deve rispondere alla stessa
 * domanda della cifra che il lettore vede.
 *
 * La soglia è **inclusiva**, ed è la stessa di `printsAsZero` in `src/ui`
 * (riscritta qui perché `src/core` non può dipendere dalla vista): `Intl`
 * arrotonda il pareggio lontano dallo zero, quindi mezzo centesimo esatto
 * stampa un centesimo e va trattato come capitale. Arrotondare qui con
 * `toDecimalPlaces` non funzionerebbe: il contesto è `ROUND_HALF_EVEN`, che
 * sullo stesso pareggio va nella direzione opposta e metterebbe un trattino
 * accanto a una cifra visibile.
 */
function hasPrintedCapital(averageCapital: Decimal): boolean {
  return averageCapital.gte(HALF_OF_THE_LAST_PRINTED_DIGIT);
}

interface Bucket {
  total: Decimal;
  days: number;
}

/**
 * Il costo delle posizioni aperte, giorno per giorno, raccolto per mese.
 *
 * Una sola camminata per entrambe le funzioni pubbliche: due sarebbero due
 * definizioni dello stesso capitale, libere di divergere.
 */
function walkCapital(report: Report, from: string, to: string): Map<string, Bucket> {
  const walked = new Map<string, Bucket>();
  // Una riga con data vuota (csv.ts) ordina prima di ogni data reale e resta
  // fuori da [from, to]: il suo delta va comunque contato nel totale corrente,
  // o resterebbe falsato per ogni mese successivo.
  let open = Object.entries(report.investedDelta)
    .filter(([day]) => day < from)
    .reduce((sum, [, delta]) => sum.plus(delta), ZERO);
  for (let day = from; day <= to; day = plusOneDay(day)) {
    open = open.plus(report.investedDelta[day] ?? ZERO);
    const month = day.slice(0, 7);
    let bucket = walked.get(month);
    if (!bucket) walked.set(month, (bucket = { total: ZERO, days: 0 }));
    bucket.total = bucket.total.plus(open);
    bucket.days += 1;
  }
  return walked;
}

export function monthlyCapital(
  operations: readonly Operation[],
  report: Report,
): MonthlyCapital[] {
  const range = windowRange(operations, 'ALL');
  if (range === null) return [];

  const walked = walkCapital(report, range.from, range.to);

  return monthlyAggregates(operations, report).map((month) => {
    const bucket = walked.get(month.month) ?? { total: ZERO, days: 0 };
    const averageCapital = bucket.days === 0 ? ZERO : bucket.total.div(bucket.days);
    // Mai ricalcolato qui: sarebbe una seconda definizione dello stesso denaro.
    const profit = month.components.trading.plus(month.components.dividends);
    return {
      month: month.month,
      averageCapital,
      days: bucket.days,
      profit,
      // `0,0%` si leggerebbe come «non ha reso niente» invece che «non c'era
      // niente a rischio». Stessa regola di `returnOnCapital` e `costDrag`.
      returnPercent: hasPrintedCapital(averageCapital)
        ? profit.div(averageCapital).times(PERCENT)
        : null,
    };
  });
}

/**
 * Lo stesso rapporto dei mesi, misurato una volta sola sull'intero periodo e
 * riportato a un anno.
 *
 * Il capitale medio è pesato sui giorni, non sui mesi: è la somma esatta della
 * camminata divisa per i giorni percorsi, mai la media delle medie mensili, che
 * darebbe lo stesso peso a un dicembre intero e a un gennaio di tre giorni.
 * Ricostruirlo da `averageCapital × days` dei mesi reintrodurrebbe per ogni
 * riga il resto della divisione che l'ha prodotto.
 *
 * L'annualizzazione è una scalatura semplice, non geometrica: il denominatore è
 * misurato direttamente ogni giorno, quindi non c'è una base da capitalizzare —
 * comporre implicherebbe un reinvestimento che la media giornaliera già
 * contiene. È anche il motivo per cui questo numero si può annualizzare mentre
 * `returnOnCapital` no: là il denominatore è tutto il denaro mai versato, che
 * non è mai stato sul conto per l'intero periodo.
 */
export function overallCapital(
  operations: readonly Operation[],
  report: Report,
): OverallCapital | null {
  const range = windowRange(operations, 'ALL');
  if (range === null) return null;

  let total = ZERO;
  let days = 0;
  for (const bucket of walkCapital(report, range.from, range.to).values()) {
    total = total.plus(bucket.total);
    days += bucket.days;
  }
  const averageCapital = days === 0 ? ZERO : total.div(days);

  // Gli stessi addendi dei mesi, sommati: il tassello è il totale della colonna
  // che la tabella stampa, non una seconda misura dello stesso utile.
  const profit = monthlyAggregates(operations, report).reduce(
    (sum, month) => sum.plus(month.components.trading).plus(month.components.dividends),
    ZERO,
  );

  return {
    averageCapital,
    days,
    profit,
    annualPercent:
      hasPrintedCapital(averageCapital) && days >= MIN_ANNUALISED_DAYS
        ? profit.div(averageCapital).times(PERCENT).times(DAYS_IN_A_YEAR).div(days)
        : null,
  };
}
