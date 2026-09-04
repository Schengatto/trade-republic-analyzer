/*
 * Performance — quanto spesso una vendita ha funzionato, e a che ritmo
 * giornaliero.
 *
 * Il lettore sceglie l'intervallo con due date, non da un elenco di periodi
 * preconfezionati: il conto è suo e i periodi che gli interessano non li
 * conosciamo. Le due date governano insieme il gauge, le tre tile e la riga
 * che dichiara l'intervallo — un solo `redraw`, chiamato da un punto solo,
 * quindi non esiste un percorso in cui le parti raccontino periodi diversi.
 *
 * La tabella no: quella resta il prospetto fisso delle sei finestre. È la
 * forma accessibile e la sola che la stampa porta con sé, e stampare la sola
 * finestra aperta significherebbe stampare una scelta fatta a schermo da
 * qualcun altro. L'intervallo scelto lo dichiara la riga di testo.
 *
 * La casella «al netto» invece la tabella la segue, e non è un'incoerenza con
 * quanto sopra: le date scelgono un periodo, la casella cambia cosa misurano
 * le colonne. Lasciata indietro, «Media per giorno di calendario» stamperebbe
 * due grandezze diverse sotto la stessa intestazione. Su carta la casella
 * sparisce, quindi a dichiarare la base è la nota in cima alla card — che
 * copre tabella e cifre insieme.
 *
 * Ogni cifra arriva già calcolata da `src/core/performance.ts`.
 */

import { windowRange } from '../../core/analytics';
import type { WindowKey } from '../../core/analytics';
import { performanceRange, performanceWindows } from '../../core/performance';
import type { PerformancePeriod, PerformanceWindow, ProfitBasis } from '../../core/performance';
import { figure } from '../chart/figure';
import type { Cell } from '../chart/figure';
import { gaugeChart } from '../chart/gauge';
import { POLE_NEGATIVE, POLE_NEUTRAL, POLE_POSITIVE } from '../chart/palette';
import { clear, el } from '../dom';
import {
  formatDate,
  formatDeduction,
  formatInteger,
  formatPercent,
  formatSignedCurrency,
} from '../format';
import type { Language, MessageKey, Translator } from '../i18n';
import { NOTHING, note, printsAsZero, section, signedCell, statTile } from './common';
import type { ReportContext, SectionView } from './common';

/*
 * Scritte per esteso e non costruite con un template: uno sweep delle chiavi
 * inutilizzate cerca la stringa letterale, e una chiave calcolata gli è
 * invisibile.
 */
const WINDOW_LABELS: Record<WindowKey, MessageKey> = {
  ALL: 'window.ALL',
  '1Y': 'window.1Y',
  '6M': 'window.6M',
  '3M': 'window.3M',
  '1M': 'window.1M',
  '1W': 'window.1W',
  '1D': 'window.1D',
};

export const performanceSection: SectionView = (context: ReportContext) => {
  const { operations, report, language, t } = context;

  const bounds = windowRange(operations, 'ALL');
  if (performanceWindows(operations, report).length === 0 || bounds === null) return null;

  /*
   * Si apre sul lordo: è il risultato delle vendite e basta, la cosa che il
   * lettore ha deciso. Gli oneri sono una domanda in più, e chi non se la pone
   * non deve trovarsela già risposta.
   */
  let basis: ProfitBasis = 'gross';

  /*
   * La card si apre sull'intero file — gli stessi estremi che i due campi
   * accettano — così il primo sguardo racconta il conto e non una selezione
   * che nessuno ha fatto.
   */
  let current = performanceRange(report, bounds.from, bounds.to, basis);

  const fromInput = dateInput('performance-from', bounds, bounds.from);
  const toInput = dateInput('performance-to', bounds, bounds.to);
  const netInput = el('input', {
    type: 'checkbox',
    class: 'control__check',
    id: 'performance-net',
  });

  const noteSlot = note('');
  const rangeSlot = el('p', { class: 'performance__range' });
  const withheldSlot = el('p', { class: 'performance__withheld' });
  const tileSlot = el('div', { class: 'performance__figures' });

  /*
   * Riempito dalla `figure`, che chiama `controls(rebuild)` — ma solo *dopo*
   * aver disegnato il grafico la prima volta. Il no-op iniziale non è
   * difensivo: è il valore che questa variabile ha davvero durante il primo
   * `plot()`, e nessuno lo chiama lì.
   */
  let refresh = (): void => {};

  const redraw = (): void => {
    clear(noteSlot);
    clear(rangeSlot);
    clear(withheldSlot);
    clear(tileSlot);
    // La nota sta sopra tutto e vale per tutto, tabella compresa: è il posto
    // dove la card dichiara cosa entra nei suoi numeri, e con la casella
    // accesa la frase di prima — «gli oneri non entrano» — sarebbe falsa.
    noteSlot.append(t(basis === 'net' ? 'performance.cautionNet' : 'performance.caution'));
    // Le date invertite non sono «nessuna vendita»: dirlo con la riga vuota
    // lascerebbe credere al lettore di non aver venduto niente.
    // Letto da `current`, non di nuovo dai campi: `performanceRange` restituisce
    // i due estremi verbatim, e un fatto solo va chiesto a una fonte sola.
    const reversed = current.from > current.to;
    rangeSlot.append(
      reversed
        ? t('performance.rangeInvalid')
        : t('performance.range', {
            from: formatDate(language, current.from),
            to: formatDate(language, current.to),
          }),
    );
    rangeSlot.classList.toggle('performance__range--invalid', reversed);
    /*
     * Quanto la casella ha tolto, detto in cifra invece che lasciato alla
     * differenza fra due letture: senza questa riga il lettore può conoscerlo
     * solo spuntando, ricordando il numero di prima e rispuntando.
     *
     * Non serve un secondo controllo sulle date invertite: là dentro non cade
     * nessuna vendita, quindi non si è sottratto niente da niente e `charges`
     * vale zero — come nel periodo che di vendite non ne ha, e come sul lordo.
     * Una condizione sola, e la riga compare esattamente quando c'è una
     * sottrazione da dichiarare.
     */
    if (!printsAsZero(current.charges)) {
      withheldSlot.append(
        t('performance.withheld', { amount: formatDeduction(language, current.charges) }),
      );
    }
    // Sotto la riga che corregge le date non va nient'altro: «Nessuna vendita
    // chiusa in questo periodo» è esattamente la frase che quella riga esiste
    // per evitare, e stamparla subito sotto la rimangia.
    if (!reversed) tileSlot.append(...dailyFigures(language, t, current));
  };

  const onChange = (): void => {
    basis = netInput.checked ? 'net' : 'gross';
    current = performanceRange(
      report,
      chosen(fromInput, bounds.from),
      chosen(toInput, bounds.to),
      basis,
    );
    // Grafico da una parte, riga e cifre dall'altra: le due chiamate stanno
    // qui insieme e in nessun altro punto del file. `refresh` ridisegna anche
    // la tabella, che con la casella cambia unità.
    refresh();
    redraw();
  };
  fromInput.addEventListener('change', onChange);
  toInput.addEventListener('change', onChange);
  netInput.addEventListener('change', onChange);

  redraw();

  return section('performance', t('performance.heading'), [
    noteSlot,
    // Prima del grafico, non dopo: su carta i due campi spariscono e questa
    // riga è la sola cosa che dichiara il periodo. Sotto al gauge arriverebbe
    // a lettura già fatta.
    rangeSlot,
    // Stesso motivo, e subito dopo: dice quanto è stato tolto dal periodo che
    // la riga sopra ha appena nominato. Su carta anche la casella sparisce, e
    // questa riga è l'unica traccia che qualcosa è stato sottratto.
    withheldSlot,
    figure({
      t,
      title: t('performance.gauge.title'),
      // Senza chiavi: nascondere «in utile» da un intero non significa niente.
      legend: [
        { label: t('performance.gauge.wins'), color: POLE_POSITIVE },
        { label: t('performance.gauge.losses'), color: POLE_NEGATIVE },
        { label: t('performance.gauge.breakEven'), color: POLE_NEUTRAL },
      ],
      controls: (rebuild) => {
        refresh = rebuild;
        // Senza `role="group"`: un gruppo senza nome accessibile si annuncia
        // come «gruppo» e non aggiunge niente ai due campi già etichettati.
        return el('div', { class: 'control-group' }, [
          el('label', { class: 'control' }, [
            el('span', { class: 'control__label' }, [t('performance.from')]),
            fromInput,
          ]),
          el('label', { class: 'control' }, [
            el('span', { class: 'control__label' }, [t('performance.to')]),
            toInput,
          ]),
          el('label', { class: 'control control--check' }, [
            netInput,
            el('span', { class: 'control__label control__label--inline' }, [
              t('performance.basis'),
            ]),
          ]),
        ]);
      },
      plot: () => {
        const chart = gaugeChart({
          segments: [
            { label: t('performance.gauge.wins'), value: current.wins, color: POLE_POSITIVE },
            { label: t('performance.gauge.losses'), value: current.losses, color: POLE_NEGATIVE },
            {
              label: t('performance.gauge.breakEven'),
              value: current.breakEven,
              color: POLE_NEUTRAL,
            },
          ],
          headline:
            current.winPercent === null ? NOTHING : formatPercent(language, current.winPercent),
          caption: t('performance.gauge.count', {
            wins: formatInteger(language, current.wins),
            total: formatInteger(language, current.sales),
          }),
          ariaLabel: t('performance.gauge.title'),
        });
        if (chart === null) return null;

        const host = el('div', { class: 'plot-host' });
        host.append(chart);
        return host;
      },
      // Sempre tutte e sei, qualunque siano le date scelte: è l'equivalente
      // accessibile del grafico ed è ciò che la stampa porta con sé. Le sei
      // finestre non dipendono dalle date, quindi ricalcolarle a ogni `refresh`
      // le lascia identiche: l'unica cosa che le muove è la base.
      table: () => ({
        columns: [
          t('performance.column.window'),
          t('performance.column.sales'),
          t('performance.column.winShare'),
          t('performance.column.profit'),
          t('performance.column.meanCalendar'),
          t('performance.column.meanActive'),
          t('performance.column.medianActive'),
        ],
        numericFrom: 1,
        rows: performanceWindows(operations, report, basis).map((window) =>
          tableRow(language, t, window),
        ),
      }),
    }),
    tileSlot,
  ]);
};

/**
 * La data scelta, o l'estremo del file quando il campo è vuoto.
 *
 * Un `input[type=date]` si può svuotare — Firefox ha il suo pulsante, Chrome
 * lo fa con un Backspace — e la stringa vuota non è una data: passata al
 * motore allargherebbe il filtro a tutto (`soldAt >= ''` è sempre vero) e
 * renderebbe `NaN` il conto dei giorni, che poi si stampa come `NaN €` in
 * verde. Un campo vuoto vale il giorno su cui la card si era aperta.
 */
function chosen(input: HTMLInputElement, fallback: string): string {
  return input.value === '' ? fallback : input.value;
}

/**
 * Un campo data limitato agli estremi del file.
 *
 * `min` e `max` non sono decorativi: fuori da quei due giorni non esiste
 * nessuna riga, quindi un intervallo che li sfora può solo aggiungere giorni
 * fermi al denominatore.
 */
function dateInput(
  id: string,
  bounds: { from: string; to: string },
  value: string,
): HTMLInputElement {
  return el('input', {
    type: 'date',
    class: 'control__date',
    id,
    min: bounds.from,
    max: bounds.to,
    value,
  });
}

/**
 * Le tre cifre giornaliere, ognuna con il proprio denominatore.
 *
 * Un intervallo senza vendite chiuse non le mostra a zero: dice che non c'è
 * stato niente da misurare. `0,00 €` leggerebbe come «ho chiuso in pari».
 */
function dailyFigures(
  language: Language,
  t: Translator,
  period: PerformancePeriod,
): HTMLElement[] {
  if (
    period.meanPerCalendarDay === null ||
    period.meanPerActiveDay === null ||
    period.medianPerActiveDay === null
  ) {
    return [note(t('performance.empty'))];
  }

  const calendar = t('performance.hint.calendar', {
    days: formatInteger(language, period.calendarDays),
  });
  // Al netto il denominatore cresce — entrano i giorni in cui si è pagato
  // senza vendere — e un lettore che vede il numero cambiare deve poter
  // leggere perché, invece di crederlo un errore.
  const active = t(
    period.basis === 'net' ? 'performance.hint.activeNet' : 'performance.hint.active',
    { days: formatInteger(language, period.activeDays) },
  );

  return [
    el('div', { class: 'tiles' }, [
      statTile({
        label: t('performance.meanCalendar'),
        value: formatSignedCurrency(language, period.meanPerCalendarDay),
        hint: calendar,
        signed: period.meanPerCalendarDay,
      }),
      statTile({
        label: t('performance.meanActive'),
        value: formatSignedCurrency(language, period.meanPerActiveDay),
        hint: active,
        signed: period.meanPerActiveDay,
      }),
      statTile({
        label: t('performance.medianActive'),
        value: formatSignedCurrency(language, period.medianPerActiveDay),
        hint: active,
        signed: period.medianPerActiveDay,
      }),
    ]),
  ];
}

function tableRow(language: Language, t: Translator, window: PerformanceWindow): Cell[] {
  const money = (value: PerformanceWindow['meanPerCalendarDay']): Cell =>
    value === null ? NOTHING : signedCell(language, value);

  return [
    t(WINDOW_LABELS[window.key]),
    formatInteger(language, window.sales),
    window.winPercent === null ? NOTHING : formatPercent(language, window.winPercent),
    window.sales === 0 ? NOTHING : signedCell(language, window.profit),
    money(window.meanPerCalendarDay),
    money(window.meanPerActiveDay),
    money(window.medianPerActiveDay),
  ];
}
