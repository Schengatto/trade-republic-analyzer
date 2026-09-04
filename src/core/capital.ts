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

const PERCENT = 100;
const HALF_OF_THE_LAST_PRINTED_DIGIT = '0.005';

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

export function monthlyCapital(
  operations: readonly Operation[],
  report: Report,
): MonthlyCapital[] {
  const range = windowRange(operations, 'ALL');
  if (range === null) return [];

  const walked = new Map<string, { total: Decimal; days: number }>();
  // Una riga con data vuota (csv.ts) ordina prima di ogni data reale e resta
  // fuori da [range.from, range.to]: il suo delta va comunque contato nel
  // totale corrente, o resterebbe falsato per ogni mese successivo.
  let open = Object.entries(report.investedDelta)
    .filter(([day]) => day < range.from)
    .reduce((sum, [, delta]) => sum.plus(delta), ZERO);
  for (let day = range.from; day <= range.to; day = plusOneDay(day)) {
    open = open.plus(report.investedDelta[day] ?? ZERO);
    const month = day.slice(0, 7);
    let bucket = walked.get(month);
    if (!bucket) walked.set(month, (bucket = { total: ZERO, days: 0 }));
    bucket.total = bucket.total.plus(open);
    bucket.days += 1;
  }

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
