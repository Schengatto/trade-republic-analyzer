// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { performanceSection } from '../../src/ui/views/performance';
import { op } from '../helpers/operations';
import { contextFor } from './helpers';

const ACCOUNT = [
  op('2024-01-02', 'CASH', 'CUSTOMER_INBOUND', { amount: '1000.00' }),
  op('2024-01-03', 'TRADING', 'BUY', { shares: '10', amount: '-100.00' }),
  op('2024-02-05', 'TRADING', 'BUY', { shares: '5', amount: '-60.00', symbol: 'BBB' }),
  // Una in utile (+50,00) e una in perdita (−20,00).
  op('2024-03-07', 'TRADING', 'SELL', { shares: '-10', amount: '150.00' }),
  op('2024-03-08', 'TRADING', 'SELL', { shares: '-5', amount: '40.00', symbol: 'BBB' }),
  op('2024-03-20', 'CASH', 'CUSTOMER_INBOUND', { amount: '1.00' }),
];

/*
 * Tre giorni operativi con risultati diversi (+30, −10, +100 su tre giorni di
 * calendario contigui, dentro un file lungo dieci giorni). Serve perché con
 * due soli giorni la mediana È la media, e due tile identiche non possono
 * accorgersi di essere scambiate.
 */
const SPREAD = [
  op('2024-05-01', 'CASH', 'CUSTOMER_INBOUND', { amount: '1000.00' }),
  op('2024-05-02', 'TRADING', 'BUY', { shares: '10', amount: '-100.00' }),
  op('2024-05-02', 'TRADING', 'BUY', { shares: '10', amount: '-100.00', symbol: 'BBB' }),
  op('2024-05-02', 'TRADING', 'BUY', { shares: '10', amount: '-100.00', symbol: 'CCC' }),
  op('2024-05-06', 'TRADING', 'SELL', { shares: '-10', amount: '130.00' }),
  op('2024-05-07', 'TRADING', 'SELL', { shares: '-10', amount: '90.00', symbol: 'BBB' }),
  op('2024-05-08', 'TRADING', 'SELL', { shares: '-10', amount: '200.00', symbol: 'CCC' }),
  op('2024-05-10', 'CASH', 'CUSTOMER_INBOUND', { amount: '1.00' }),
];

/*
 * Gli stessi tre giorni operativi di SPREAD, più gli oneri nelle tre posizioni
 * che contano: la commissione d'acquisto del 2 maggio, che è un giorno senza
 * vendite; una commissione su un giorno che ne ha una; l'imposta su un altro.
 * Lordo: +120,00 su 3 giorni. Netto: +109,00 su 4.
 */
const CHARGED = [
  op('2024-05-01', 'CASH', 'CUSTOMER_INBOUND', { amount: '1000.00' }),
  op('2024-05-02', 'TRADING', 'BUY', { shares: '10', amount: '-100.00', fee: '-1.00' }),
  op('2024-05-02', 'TRADING', 'BUY', { shares: '10', amount: '-100.00', symbol: 'BBB' }),
  op('2024-05-02', 'TRADING', 'BUY', { shares: '10', amount: '-100.00', symbol: 'CCC' }),
  op('2024-05-06', 'TRADING', 'SELL', { shares: '-10', amount: '130.00' }),
  op('2024-05-07', 'TRADING', 'SELL', { shares: '-10', amount: '90.00', symbol: 'BBB', fee: '-2.00' }),
  op('2024-05-08', 'TRADING', 'SELL', { shares: '-10', amount: '200.00', symbol: 'CCC', tax: '-8.00' }),
  op('2024-05-10', 'CASH', 'CUSTOMER_INBOUND', { amount: '1.00' }),
];

function render(operations = ACCOUNT): HTMLElement {
  return performanceSection(contextFor('it', operations))!;
}

/*
 * Lo spazio unificatore che `Intl` mette davanti all'euro diventa uno spazio
 * normale: qui si guarda quale cifra finisce in quale casella, e un carattere
 * invisibile nel file di test è solo un modo di sbagliare senza vederlo. Il
 * formato in sé è fissato dai test di `format.ts`.
 */
function plain(node: Element | null): string {
  return node!.textContent!.replace(/\u00a0/g, ' ');
}

function tiles(root: HTMLElement): string[][] {
  return [...root.querySelectorAll('.tile')].map((tile) => [
    plain(tile.querySelector('.tile__label')),
    plain(tile.querySelector('.tile__value')),
  ]);
}

function dates(root: HTMLElement): [HTMLInputElement, HTMLInputElement] {
  const inputs = [...root.querySelectorAll<HTMLInputElement>('.control__date')];
  return [inputs[0]!, inputs[1]!];
}

function toggleNet(root: HTMLElement): void {
  const box = root.querySelector<HTMLInputElement>('.control__check')!;
  box.checked = true;
  box.dispatchEvent(new Event('change'));
}

function hints(root: HTMLElement): string[] {
  return [...root.querySelectorAll('.tile__hint')].map(plain);
}

/** La riga degli oneri, o `null` quando la card ha scelto di non stamparla. */
function withheld(root: HTMLElement): string | null {
  const line = root.querySelector('.performance__withheld')!;
  return line.textContent === '' ? null : plain(line);
}

/** Il risultato del periodo, letto dalla prima riga della tabella. */
function totalResult(root: HTMLElement): string {
  return plain([...root.querySelectorAll('.data-table tbody tr:first-child td')][3]!);
}

function pick(root: HTMLElement, from: string, to: string): void {
  const [start, end] = dates(root);
  start.value = from;
  end.value = to;
  end.dispatchEvent(new Event('change'));
}

describe('the section', () => {
  it('declines to render when the file holds nothing', () => {
    expect(performanceSection(contextFor('it', []))).toBeNull();
  });

  it('carries the id the rail navigates to', () => {
    expect(render().id).toBe('performance');
  });

  it('says what the figures leave out', () => {
    expect(render().textContent).toContain('dividendi, interessi e oneri');
  });
});

describe('the two dates', () => {
  it('opens on the whole file, bounded by the days the file actually covers', () => {
    const [from, to] = dates(render());

    // La prima e l'ultima riga del file, non la prima e l'ultima vendita:
    // fuori da lì non esiste nessuna operazione da contare.
    expect(from.value).toBe('2024-01-02');
    expect(to.value).toBe('2024-03-20');
    expect(from.min).toBe('2024-01-02');
    expect(from.max).toBe('2024-03-20');
    expect(to.min).toBe('2024-01-02');
    expect(to.max).toBe('2024-03-20');
  });

  it('states the chosen interval in words, so the printed page names it', () => {
    const root = render();
    // I due campi non si stampano: questa riga è l'unico posto in cui il
    // periodo del gauge e delle tile compare su carta.
    expect(root.querySelector('.performance__range')!.textContent).toBe(
      'Intervallo scelto: dal 02 gen 2024 al 20 mar 2024.',
    );

    pick(root, '2024-03-08', '2024-03-20');
    expect(root.querySelector('.performance__range')!.textContent).toBe(
      'Intervallo scelto: dal 08 mar 2024 al 20 mar 2024.',
    );
  });

  it('names the period before the figures that depend on it', () => {
    const root = render();
    const range = root.querySelector('.performance__range')!;
    const chart = root.querySelector('.chart--gauge')!;

    // Su carta i due campi non si stampano: chi legge incontra il gauge e le
    // tile senza nient'altro che questa riga a dire di che periodo parlino, e
    // dopo la figura arriverebbe a lettura già fatta.
    expect(range.compareDocumentPosition(chart) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(
      range.compareDocumentPosition(root.querySelector('.tiles')!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('redraws the gauge, the sentence and the tiles together', () => {
    const root = render();

    const before = root.querySelector('.chart--gauge text')!.textContent;
    const tilesBefore = root.querySelector('.tiles')!.textContent;

    // Una settimana dopo l'ultima vendita: non si è chiuso niente.
    pick(root, '2024-03-14', '2024-03-20');
    expect(root.querySelector('.chart--gauge')).toBeNull();
    expect(root.querySelector('.tiles')).toBeNull();
    expect(root.textContent).toContain('Nessuna vendita chiusa in questo periodo.');
    expect(root.querySelector('.performance__range')!.textContent).toContain('dal 14 mar 2024');

    // E tornando indietro, tutte e tre le parti risalgono insieme.
    pick(root, '2024-01-02', '2024-03-20');
    expect(root.querySelector('.chart--gauge text')!.textContent).toBe(before);
    expect(root.querySelector('.tiles')!.textContent).toBe(tilesBefore);
    expect(root.querySelector('.performance__range')!.textContent).toContain('dal 02 gen 2024');
  });

  it('narrows the gauge to the interval, not just the tiles', () => {
    const root = render();
    // Con tutto il file: una vendita in utile su due.
    expect(root.querySelector('.chart--gauge text')!.textContent).toBe('50,00%');

    // Solo l'8 marzo: resta la sola vendita in perdita.
    pick(root, '2024-03-08', '2024-03-08');
    expect(root.querySelector('.chart--gauge text')!.textContent).toBe('0,00%');
  });

  it('says the dates are the wrong way round instead of showing an empty period', () => {
    const root = render();
    pick(root, '2024-03-20', '2024-01-02');

    const range = root.querySelector('.performance__range')!;
    expect(range.textContent).toBe('La data iniziale viene dopo quella finale.');
    // Segnalata anche fuori dal colore: la classe è ciò che il CSS colora, e
    // il colore da solo non è un messaggio.
    expect(range.classList.contains('performance__range--invalid')).toBe(true);

    // E si torna indietro: lo stato non è un vicolo cieco.
    pick(root, '2024-01-02', '2024-03-20');
    expect(range.classList.contains('performance__range--invalid')).toBe(false);
    expect(range.textContent).toContain('Intervallo scelto');
  });

  it('makes no claim about the account under the inverted dates', () => {
    const root = render();
    pick(root, '2024-03-20', '2024-01-02');

    // «Nessuna vendita chiusa in questo periodo» è esattamente la frase che
    // la riga qui sopra esiste per evitare: stamparla subito sotto la
    // rimangia, e il lettore torna a credere di non aver venduto niente.
    expect(root.textContent).not.toContain('Nessuna vendita chiusa');
    expect(root.querySelector('.tiles')).toBeNull();
  });

  it('treats a cleared field as the day the card opened on', () => {
    const root = render();
    const [from] = dates(root);

    // Un campo data si svuota — Firefox ha il suo pulsante, Chrome lo fa con
    // un Backspace — e la stringa vuota non è una data: filtrava tutto
    // (`soldAt >= ''` è sempre vero), rendeva `NaN` il conto dei giorni e
    // stampava «NaN €» in verde sotto un intervallo senza inizio.
    from.value = '';
    from.dispatchEvent(new Event('change'));

    expect(root.querySelector('.performance__range')!.textContent).toBe(
      'Intervallo scelto: dal 02 gen 2024 al 20 mar 2024.',
    );
    expect(tiles(root).map(([, value]) => value)).toEqual([
      '+0,38 €',
      '+15,00 €',
      '+15,00 €',
    ]);
  });

  it('redraws when only the first date moves', () => {
    const root = render(SPREAD);
    const [from] = dates(root);

    /*
     * Svuotare `from` non basta a provare che il campo è ascoltato: la stringa
     * vuota ricade sull'estremo del file, cioè sullo stato con cui la card si
     * era aperta, e l'asserzione resterebbe verde anche senza il listener. Qui
     * la data iniziale si sposta davvero, e nessuno tocca l'altro campo.
     */
    from.value = '2024-05-07';
    from.dispatchEvent(new Event('change'));

    expect(root.querySelector('.performance__range')!.textContent).toBe(
      'Intervallo scelto: dal 07 mag 2024 al 10 mag 2024.',
    );
    // Restano la vendita in perdita del 7 (−10,00) e quella del 8 (+100,00):
    // 90,00 su quattro giorni di calendario e due operativi.
    expect(tiles(root).map(([, value]) => value)).toEqual([
      '+22,50 €',
      '+45,00 €',
      '+45,00 €',
    ]);
  });
});

describe('the gauge', () => {
  it('paints the winning share first, in the winning colour', () => {
    const chart = render().querySelector('.chart--gauge')!;

    // Con una vendita per parte le due metà del semicerchio sono identiche:
    // l'ordine in cui i colori arrivano è la sola cosa che dice quale sia
    // quale, e nessuna asserzione sulla geometria può accorgersi di uno
    // scambio fra i due poli.
    expect([...chart.querySelectorAll('path')].map((path) => path.getAttribute('stroke'))).toEqual([
      'var(--grid)',
      'var(--pole-positive)',
      'var(--pole-negative)',
    ]);
  });

  it('paints a period that lost money red', () => {
    const root = render();
    pick(root, '2024-03-08', '2024-03-08');
    const chart = root.querySelector('.chart--gauge')!;

    // Un solo arco, e la cifra sotto dice zero: coi poli scambiati il lettore
    // vedrebbe un semicerchio tutto verde sopra un «0,00% in utile».
    expect(chart.querySelector('text')!.textContent).toBe('0,00%');
    expect([...chart.querySelectorAll('path')].map((path) => path.getAttribute('stroke'))).toEqual([
      'var(--grid)',
      'var(--pole-negative)',
    ]);
  });
});

describe('the tiles', () => {
  it('states the denominator on every daily figure', () => {
    const hints = [...render().querySelectorAll('.tile__hint')].map((node) => node.textContent);
    expect(hints).toHaveLength(3);
    // Due basi, ognuna che dichiara la propria: una cifra che non dice su
    // cosa è divisa viene attribuita al denominatore sbagliato.
    expect(hints.filter((hint) => hint!.includes('con operatività'))).toHaveLength(2);
    expect(hints.filter((hint) => hint === 'su 79 giorni')).toHaveLength(1);
  });

  it('puts each figure in its own slot', () => {
    // Con due soli giorni operativi mediana e media coincidono, e due tile
    // identiche non possono accorgersi di essere state scambiate: qui i tre
    // giorni valgono +30, −10 e +100, quindi 120/10, 120/3 e la mediana 30
    // sono tre numeri diversi.
    expect(tiles(render(SPREAD))).toEqual([
      ['Media per giorno di calendario', '+12,00 €'],
      ['Media per giorno operativo', '+40,00 €'],
      ['Mediana per giorno operativo', '+30,00 €'],
    ]);
  });

  it('drops the calendar median rather than printing the same zero for everyone', () => {
    const labels = [...render().querySelectorAll('.tile__label')].map((node) => node.textContent);
    expect(labels).toEqual([
      'Media per giorno di calendario',
      'Media per giorno operativo',
      'Mediana per giorno operativo',
    ]);
  });
});

describe('the net-of-charges box', () => {
  it('starts off, on the result of the sales and nothing else', () => {
    const root = render(CHARGED);
    expect(root.querySelector<HTMLInputElement>('.control__check')!.checked).toBe(false);
    expect(plain(root.querySelector('.note'))).toBe(
      'Solo vendite chiuse: dividendi, interessi e oneri non entrano in questi numeri.',
    );
  });

  it('rewrites the caveat that the box has just made false', () => {
    // La nota di partenza dice che gli oneri non entrano. Lasciarla lì mentre
    // le cifre li sottraggono è l'unico modo di sbagliare che questa card
    // può ancora offrire al lettore.
    const root = render(CHARGED);
    toggleNet(root);

    expect(plain(root.querySelector('.note'))).toBe(
      'Solo vendite chiuse, meno tutte le commissioni e imposte datate nel periodo — comprese quelle di acquisti e dividendi, che nessuna di queste vendite ha causato. L’incasso di dividendi e interessi invece non entra.',
    );
  });

  it('names the purchases and dividends whose charges it took, not just «the period»', () => {
    /*
     * La commissione da 1,00 € è di un acquisto e l'imposta da 8,00 € sta su
     * una vendita, ma nella stessa frase ci finisce anche l'imposta di un
     * dividendo: sono oneri che nessuna delle vendite contate ha causato, e
     * «commissioni e imposte pagate nel periodo» si legge come se fossero
     * loro. La nota deve dire di chi sono, non solo quando sono state pagate.
     */
    const root = render(CHARGED);
    toggleNet(root);

    const caveat = plain(root.querySelector('.note'));
    expect(caveat).toContain('acquisti e dividendi');
    expect(caveat).toContain('nessuna di queste vendite ha causato');
  });

  it('takes the charges off all three daily figures', () => {
    const root = render(CHARGED);
    toggleNet(root);

    // 120,00 meno 11,00 di oneri fa 109,00: su 10 giorni di calendario e su 4
    // operativi. La mediana legge i quattro giorni −12,00 / −1,00 / +30,00 /
    // +92,00, quindi non è la media.
    expect(tiles(root)).toEqual([
      ['Media per giorno di calendario', '+10,90 €'],
      ['Media per giorno operativo', '+27,25 €'],
      ['Mediana per giorno operativo', '+14,50 €'],
    ]);
  });

  it('counts the day that only cost money, and says which days it counted', () => {
    const root = render(CHARGED);
    expect(hints(root)).toEqual(['su 10 giorni', 'su 3 giorni con operatività', 'su 3 giorni con operatività']);

    toggleNet(root);
    // Il 2 maggio non ha vendite, solo la commissione d'acquisto: entra nel
    // denominatore, e il denominatore che cambia va spiegato dove si legge.
    expect(hints(root)).toEqual([
      'su 10 giorni',
      'su 4 giorni con vendite o oneri',
      'su 4 giorni con vendite o oneri',
    ]);
  });

  it('carries the table with it, so no column prints two different units', () => {
    const root = render(CHARGED);
    toggleNet(root);

    const row = [...root.querySelectorAll('.data-table tbody tr:first-child td')].map(plain);
    expect(row).toEqual([
      'Totale',
      '3',
      '66,67%',
      '+109,00 €',
      '+10,90 €',
      '+27,25 €',
      '+14,50 €',
    ]);
  });

  it('leaves the gauge alone: a commission is not a sale', () => {
    const root = render(CHARGED);
    const before = plain(root.querySelector('.chart__gauge-value'));
    toggleNet(root);

    expect(plain(root.querySelector('.chart__gauge-value'))).toBe(before);
    expect(before).toBe('66,67%');
  });

  it('says nothing about charges while none are being taken', () => {
    expect(withheld(render(CHARGED))).toBeNull();
  });

  it('states how much it took, so the difference is read and not remembered', () => {
    /*
     * Misurata contro le due letture stesse, prese dalla tabella: la riga deve
     * valere la distanza fra il lordo e il netto, altrimenti dichiara una
     * grandezza diversa da quella che ha spostato le cifre. Un `toBe('−11,00
     * €')` da solo passerebbe anche se la card sottraesse altro.
     */
    const root = render(CHARGED);
    expect(totalResult(root)).toBe('+120,00 €');

    toggleNet(root);
    expect(totalResult(root)).toBe('+109,00 €');
    expect(withheld(root)).toBe('Oneri sottratti nel periodo: -11,00 €.');
  });

  it('follows the two dates, like the figure it explains', () => {
    const root = render(CHARGED);
    toggleNet(root);
    // Fuori il 2 maggio, fuori la sua commissione d'acquisto: restano la
    // commissione da 2,00 € e l'imposta da 8,00 €.
    pick(root, '2024-05-06', '2024-05-08');

    expect(withheld(root)).toBe('Oneri sottratti nel periodo: -10,00 €.');
  });

  it('stays quiet where the charges were real but nothing was taken from anything', () => {
    /*
     * Dall'1 al 5 maggio c'è la commissione d'acquisto e non c'è una vendita.
     * La card dice che non ha niente da misurare: dichiarare lì «−1,00 € di
     * oneri» sarebbe l'unica cifra di una card che ha appena detto di non
     * averne, e la leggerebbe come il risultato del periodo.
     */
    const root = render(CHARGED);
    toggleNet(root);
    pick(root, '2024-05-01', '2024-05-05');

    expect(plain(root.querySelector('.performance__figures'))).toBe(
      'Nessuna vendita chiusa in questo periodo.',
    );
    expect(withheld(root)).toBeNull();
  });

  it('stays quiet under inverted dates, where the correction is the only message', () => {
    const root = render(CHARGED);
    toggleNet(root);
    pick(root, '2024-05-08', '2024-05-06');

    expect(plain(root.querySelector('.performance__range'))).toBe(
      'La data iniziale viene dopo quella finale.',
    );
    expect(withheld(root)).toBeNull();
  });

  it('keeps the box and the two dates working together', () => {
    // Le due scelte governano lo stesso `redraw`: accendere la casella non
    // deve rimettere l'intervallo su tutto il file.
    const root = render(CHARGED);
    toggleNet(root);
    pick(root, '2024-05-07', '2024-05-08');

    expect(plain(root.querySelector('.performance__range'))).toBe(
      'Intervallo scelto: dal 07 mag 2024 al 08 mag 2024.',
    );
    // −12,00 e +92,00 su due giorni: la commissione del 2 maggio è fuori.
    expect(tiles(root)[1]).toEqual(['Media per giorno operativo', '+40,00 €']);
  });
});

describe('the table', () => {
  it('lists all six windows whatever the two dates say', () => {
    const root = render();
    pick(root, '2024-03-08', '2024-03-08');

    const rows = [...root.querySelectorAll('.data-table tbody tr')];
    expect(rows).toHaveLength(6);
    expect(rows.map((row) => row.querySelector('td')!.textContent)).toEqual([
      'Totale',
      '1 anno',
      '6 mesi',
      '3 mesi',
      '1 mese',
      '1 settimana',
    ]);
  });

  it('has one column per surviving figure, the calendar median gone', () => {
    const headers = [...render().querySelectorAll('.data-table thead th')].map(
      (node) => node.textContent,
    );
    expect(headers).toEqual([
      'Periodo',
      'Vendite',
      'In utile',
      'Risultato',
      // Non «Media giornaliera»: su una card il cui senso è che i due
      // denominatori sono diversi, l'unica colonna che non dichiarava il
      // proprio stava accanto a una che lo dichiara.
      'Media per giorno di calendario',
      'Media per giorno operativo',
      'Mediana per giorno operativo',
    ]);
  });

  it('fills each cell from its own column', () => {
    // Le intestazioni erano fissate, le celle no: scambiare due colonne di
    // cifre lasciava tutto verde.
    const row = [
      ...render(SPREAD).querySelectorAll('.data-table tbody tr:first-child td'),
    ].map(plain);

    expect(row).toEqual([
      'Totale',
      '3',
      '66,67%',
      '+120,00 €',
      '+12,00 €',
      '+40,00 €',
      '+30,00 €',
    ]);
  });
});
