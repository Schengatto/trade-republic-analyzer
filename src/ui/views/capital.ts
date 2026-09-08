/**
 * Quanto capitale era a rischio, e quanto ha prodotto.
 *
 * Una figura sola, un anno per volta: due barre coricate per ogni mese, il
 * capitale sopra e il suo risultato sotto. Impilate in due grafici separati le
 * due grandezze si confrontavano leggendo in verticale attraverso una cornice;
 * accostate, il confronto di un mese è una differenza di lunghezza.
 *
 * Orizzontali e non verticali perché le due grandezze sono entrambe in euro ma
 * di ordini di grandezza diversi: sullo stesso asse la seconda è alta pochi
 * pixel, mentre una barra corta accanto alla sua etichetta resta una lunghezza
 * che si legge.
 *
 * Il selettore governa il solo disegno. La tabella sotto elenca sempre tutti i
 * mesi di tutti gli anni: è la forma accessibile della figura ed è quella che
 * la stampa porta con sé, e stampare il solo anno aperto significherebbe
 * stampare una scelta fatta a schermo da qualcun altro. Su carta il `<select>`
 * sparisce, quindi l'anno disegnato lo dichiara la riga sopra la figura.
 */
import {
  monthlyCapital,
  overallCapital,
  type MonthlyCapital,
  type OverallCapital,
} from '../../core/capital';
import { groupedRowChart } from '../chart/bars';
import { figure } from '../chart/figure';
import { extent } from '../chart/geometry';
import { POLE_NEGATIVE, POLE_POSITIVE, SERIES_1, poleFor } from '../chart/palette';
import { el } from '../dom';
import {
  formatCompactCurrency,
  formatCurrency,
  formatInteger,
  formatMonth,
  formatSignedCurrency,
  formatSignedPercent,
} from '../format';
import {
  NOTHING,
  note,
  section,
  signedCell,
  signedPercentCell,
  statTile,
  type ReportContext,
} from './common';

export function capitalSection(context: ReportContext): HTMLElement | null {
  const { language, operations, report, t } = context;
  const months = monthlyCapital(operations, report);
  if (months.length === 0) return null;

  const overall = overallCapital(operations, report);

  const years = [...new Set(months.map((month) => month.month.slice(0, 4)))];
  // L'ultimo: è il periodo di cui il lettore sta chiedendo conto. Aprire sul
  // primo lo obbligherebbe a un click per arrivare a ieri.
  let selected = years[years.length - 1]!;

  /*
   * Il dominio è misurato su tutta la storia, non sull'anno mostrato. Misurato
   * sull'anno, il metro cambierebbe a ogni cambio di anno e due anni si
   * potrebbero confrontare solo rileggendo i tick — cioè proprio il confronto
   * che le barre dovrebbero fare da sole.
   */
  const domain = extent(
    months.flatMap((month) => [month.averageCapital.toNumber(), month.profit.toNumber()]),
  );

  const yearSlot = el('p', { class: 'capital__year' });
  const yearSelect = el('select', {
    class: 'control__select',
    id: 'capital-year',
  }) as HTMLSelectElement;
  for (const year of years) {
    const option = el('option', { value: year }, [year]);
    if (year === selected) option.setAttribute('selected', 'selected');
    yearSelect.append(option);
  }

  /*
   * Riempito dalla `figure`, che chiama `controls(rebuild)` — ma solo *dopo*
   * aver disegnato il grafico la prima volta. Il no-op iniziale non è
   * difensivo: è il valore che questa variabile ha davvero durante il primo
   * `plot()`, e nessuno lo chiama lì.
   */
  let refresh = (): void => {};

  const redraw = (): void => {
    yearSlot.textContent = t('capital.showing', { year: selected });
    refresh();
  };

  yearSelect.addEventListener('change', () => {
    selected = yearSelect.value;
    redraw();
  });

  redraw();

  return section('capital', t('capital.heading'), [
    overall && wholePeriod(context, overall),
    // La base, subito sotto le cifre che la usano. In fondo alla sezione
    // arriverebbe a confronto già fatto: è lì che il lettore mette questo tasso
    // accanto a quello della Sintesi e conclude che uno dei due è sbagliato.
    overall && note(t('capital.basis')),
    // Prima della figura, non dopo: su carta il selettore sparisce e questa
    // riga è la sola cosa che dichiara l'anno disegnato.
    yearSlot,
    figure({
      t,
      title: t('capital.figure'),
      description: t('capital.description'),
      /*
       * Tre voci per due barre, e non è un errore di conteggio: una legenda
       * spiega i colori che stanno sulla pagina, e la seconda barra ne usa due
       * a seconda del segno. Dichiararne uno solo lascerebbe il rosso senza
       * nome. Senza chiavi: nascondere una delle due serie toglierebbe metà del
       * confronto per cui la figura esiste.
       */
      legend: [
        { label: t('capitalInvested.series'), color: SERIES_1 },
        { label: t('capital.legend.gain'), color: POLE_POSITIVE },
        { label: t('capital.legend.loss'), color: POLE_NEGATIVE },
      ],
      controls: (rebuild) => {
        refresh = rebuild;
        return el('div', { class: 'control-group' }, [
          el('label', { class: 'control' }, [
            el('span', { class: 'control__label' }, [t('capital.year')]),
            yearSelect,
          ]),
        ]);
      },
      plot: () => {
        const host = el('div', { class: 'plot-host' });
        const plot = groupedRowChart(
          {
            // Solo i mesi che esistono: un anno parziale con dodici righe
            // direbbe «niente capitale» dove la verità è «il conto non c'era
            // ancora».
            rows: months
              .filter((month) => month.month.startsWith(selected))
              .map((month) => ({
                label: formatMonth(language, month.month),
                values: [month.averageCapital.toNumber(), month.profit.toNumber()],
                // Il rendimento non è disegnato — non ha un asse in euro — ma è
                // la cifra che lega le due barre, quindi viaggia col readout.
                readout: [
                  {
                    label: t('capital.column.return'),
                    value:
                      month.returnPercent === null
                        ? NOTHING
                        : formatSignedPercent(language, month.returnPercent),
                  },
                ],
              })),
            series: [
              {
                label: t('capitalInvested.series'),
                // Un capitale non ha polarità: una serie, un colore.
                color: () => SERIES_1,
                format: (value) => formatCurrency(language, value),
              },
              {
                label: t('capitalProfit.series'),
                color: poleFor,
                format: (value) => formatSignedCurrency(language, value),
              },
            ],
            domain,
            formatTick: (value) => formatCompactCurrency(language, value),
            title: t('capital.figure'),
          },
          host,
        );
        if (!plot) return null;
        host.append(plot);
        return host;
      },
      table: table(context, months),
    }),
    note(t('capital.caution')),
  ]);
}

/**
 * L'intero periodo in due cifre che sono un conto: l'utile diviso il capitale
 * medio fa il rendimento del periodo, stampato dentro il secondo tassello.
 *
 * Un terzo tassello annualizzava quel rendimento dividendolo per gli anni. È
 * stato scritto, stampato e respinto: accanto al «rendimento sul capitale»
 * della Sintesi si leggeva come una contraddizione — un 44% annuo sotto un 46%
 * su due anni — e la contraddizione era reale, perché quella scalatura ignora
 * la capitalizzazione e prende per denominatore il capitale a rischio invece
 * del portafoglio. Il tasso annuo ora è un TIR sui flussi datati e sta in
 * Sintesi, accanto alla percentuale con cui il lettore lo confronterebbe
 * comunque.
 *
 * Restano però due cifre che differiscono per numeratore (qui compravendite e
 * dividendi lordi, là l'utile netto) e denominatore (qui il capitale a rischio,
 * là tutto il denaro versato): lo dichiara la nota sotto i tasselli, o restano
 * due percentuali inconciliabili.
 *
 * L'etichetta della prima è quella della legenda: è la stessa serie, misurata
 * una volta sull'intero periodo invece che mese per mese.
 */
function wholePeriod(context: ReportContext, overall: OverallCapital): HTMLElement {
  const { language, t } = context;
  const period =
    overall.periodPercent === null ? null : formatSignedPercent(language, overall.periodPercent);

  return el('div', { class: 'tiles' }, [
    statTile({
      label: t('capitalInvested.series'),
      value: formatCurrency(language, overall.averageCapital),
      hint: t('capital.averageCapital.hint', { days: formatInteger(language, overall.days) }),
    }),
    statTile({
      label: t('capital.overallProfit'),
      value: formatSignedCurrency(language, overall.profit),
      signed: overall.profit,
      hint:
        period === null
          ? t('capital.noCapital')
          : t('capital.overallProfit.hint', { period, days: formatInteger(language, overall.days) }),
    }),
  ]);
}

/** Tutti i mesi di tutti gli anni: la figura ne mostra uno, la tabella li tiene. */
function table(context: ReportContext, months: readonly MonthlyCapital[]) {
  const { language, t } = context;
  return {
    columns: [
      t('capital.column.month'),
      t('capital.column.capital'),
      t('capital.column.days'),
      t('capital.column.profit'),
      t('capital.column.return'),
    ],
    rows: months.map((month) => [
      formatMonth(language, month.month),
      formatCurrency(language, month.averageCapital),
      formatInteger(language, month.days),
      signedCell(language, month.profit),
      signedPercentCell(language, month.returnPercent),
    ]),
  };
}
