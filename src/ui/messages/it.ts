/**
 * The Italian catalogue, and the source of the message contract.
 *
 * `Messages` is derived from this object, so every other catalogue fails to
 * compile until it carries exactly the same keys. That check is what keeps a
 * half-translated build from reaching a reader.
 */

export const it = {
  'app.title': 'Trade Republic Analyzer',
  'app.tagline': 'Il tuo estratto conto non lascia mai questo browser.',
  'app.skipToReport': 'Vai al report',

  'nav.language': 'Lingua',
  'nav.theme': 'Tema',
  // The button names the action, not a state. Labelled "Tema" and reading
  // "Scuro", it said the opposite of the theme in force.
  'nav.theme.toLight': 'Passa a chiaro',
  'nav.theme.toDark': 'Passa a scuro',
  'nav.print': 'Stampa o salva in PDF',
  'nav.reset': 'Analizza un altro file',
  'nav.outline': 'Sezioni',
  'nav.outline.label': 'Sezioni del report',

  'upload.heading': 'Carica il tuo export Trade Republic',
  'upload.instruction': 'Trascina qui il file CSV, oppure selezionalo.',
  'upload.button': 'Scegli il file CSV',
  'upload.dropActive': 'Rilascia il file per analizzarlo',
  'upload.privacyHeading': 'Il file resta sul tuo computer',
  'upload.privacyBody':
    'Non c’è nessun cloud e nessun server. Il CSV viene letto e analizzato dal browser che hai davanti, e non lascia mai questa macchina.',
  // Tre affermazioni verificabili, non tre slogan: la prima si controlla dalla
  // scheda Rete, la seconda dall’archiviazione locale, la terza staccando la
  // rete. Se una smette di essere vera, va tolta da qui prima che dal codice.
  'upload.privacyFact.noUpload.term': 'Niente invio',
  'upload.privacyFact.noUpload.detail':
    'Il file non viene caricato da nessuna parte, né su un nostro server né su quello di terzi. La scheda Rete del browser resta vuota.',
  'upload.privacyFact.noStorage.term': 'Niente archiviazione',
  'upload.privacyFact.noStorage.detail':
    'Del tuo file non viene salvato nulla. Nel browser restano solo tre preferenze: lingua, tema e stato della barra delle sezioni. Ricaricando la pagina il report sparisce.',
  'upload.privacyFact.offline.term': 'Funziona offline',
  'upload.privacyFact.offline.detail':
    'Stacca la rete, ricarica la pagina e caricala di nuovo: l’analisi gira lo stesso, perché non ha nessuno da interrogare.',
  'upload.formatHint':
    'Serve il CSV delle operazioni esportato da Trade Republic, con le sue intestazioni originali.',
  'upload.reading': 'Lettura del file in corso…',

  'error.heading': 'Non è stato possibile leggere il file',
  'error.MISSING_COLUMNS':
    'Mancano {count} colonne obbligatorie: {columns}. Sembra che il file non sia un export delle operazioni di Trade Republic.',
  'error.MALFORMED_ROW':
    'La riga {line} non è leggibile. Il contenuto della riga non viene mostrato perché può contenere dati personali.',
  'error.NO_ROWS': 'Il file non contiene operazioni.',
  'error.NOT_CSV': 'Il file selezionato non è un CSV.',
  'error.UNKNOWN': 'Il file non è stato riconosciuto.',
  'error.retry': 'Riprova con un altro file',

  'banner.unclassified.heading': 'Operazioni non riconosciute',
  'banner.unclassified.body':
    '{count} operazioni hanno un tipo che il motore non conosce ({types}), per un importo di {amount}. Questo importo è tenuto FUORI dal profitto: lo trovi nella differenza di quadratura qui sotto. Segnala questi tipi così da farli aggiungere.',
  'banner.anomalies.heading': 'Anomalie rilevate nei dati',
  // Looked up as `anomaly.${code}` from the engine's AnomalyCode, the way
  // `error.*` is looked up from CsvError.code: a sweep for unused keys will
  // name these and be wrong. The engine states the code and the quantity —
  // these sentences are the only place the wording lives.
  'anomaly.UNCOVERED_SALE':
    '{symbol}: vendute {quantity} unità senza titoli in portafoglio a copertura.',
  'anomaly.UNMATCHED_FREE_LOT_CANCELLATION':
    '{symbol}: annullamento di {quantity} unità gratuite senza un lotto gratuito corrispondente.',

  'summary.heading': 'Sintesi',
  'summary.netProfit': 'Profitto netto',
  'summary.netProfit.hint': 'Compravendita e proventi, al netto di commissioni e imposte.',
  'summary.tradingProfit': 'Utile da compravendita',
  'summary.tradingProfit.hint': 'Solo posizioni chiuse, con metodo FIFO.',
  'summary.totalCharges': 'Oneri totali',
  'summary.totalCharges.hint': 'Commissioni e imposte trattenute.',
  'summary.netCapital': 'Capitale netto versato',
  'summary.netCapital.hint': 'Versamenti meno prelievi.',
  'summary.return': 'Rendimento sul capitale',
  'summary.return.hint': 'Intero periodo, da {from} a {to}. Non annualizzato.',
  'summary.returnUnavailable': 'Rendimento non calcolabile: capitale netto versato pari a zero.',
  'summary.operationsRead': '{count} operazioni lette',
  'summary.period': 'Periodo da {from} a {to}',

  'trend.heading': 'Andamento cumulato',
  'trend.description':
    'Profitto netto e utile da compravendita, giorno per giorno, sullo stesso asse.',
  'trend.series.net': 'Profitto netto',
  'trend.series.trading': 'Utile da compravendita',
  'trend.column.date': 'Data',
  'trend.column.dayProfit': 'Variazione del giorno',
  'trend.drawdown': 'Discesa massima',
  'trend.drawdown.hint': 'Dal picco precedente, minimo toccato il {date}.',
  'trend.worstDay': 'Giorno peggiore',
  'trend.worstDay.hint': 'Perdita registrata il {date}.',

  'composition.heading': 'Composizione del risultato',
  'composition.grossProfit': 'Utile lordo',
  'composition.income': 'Proventi per tipo',
  'composition.incomeNote': 'Già compresi nell’utile lordo qui sopra: questo è solo il dettaglio.',
  'composition.fees': 'Commissioni',
  'composition.costDrag': 'Quota dell’utile lordo',
  'composition.taxes': 'Imposte per tipo',
  'composition.netProfit': 'Profitto netto',
  'composition.column.item': 'Voce',
  'composition.column.amount': 'Importo',
  'composition.none': 'Nessuna voce.',

  'excluded.heading': 'Movimenti esclusi dal profitto',
  'excluded.note':
    'Queste voci muovono la liquidità ma non sono un guadagno né una perdita: versare denaro non produce profitto, e una posizione ancora aperta non ha un risultato finché non viene venduta.',
  'excluded.deposits': 'Versamenti',
  'excluded.withdrawals': 'Prelievi',
  'excluded.netCapital': 'Capitale netto versato',
  'excluded.cardSpending': 'Spese con carta',
  'excluded.openPositionsCost': 'Costo di carico delle posizioni aperte',

  'reconciliation.heading': 'Quadratura di cassa',
  'reconciliation.description':
    'Il profitto viene ricalcolato dai soli movimenti di cassa, senza FIFO. Due strade indipendenti allo stesso numero: se non coincidono, un tipo di operazione è classificato male.',
  'reconciliation.expected': 'Profitto implicito dai flussi di cassa',
  'reconciliation.actual': 'Profitto netto calcolato',
  'reconciliation.difference': 'Differenza',
  'reconciliation.balanced': 'Quadratura corretta',
  'reconciliation.unbalanced': 'Quadratura NON corretta',
  'reconciliation.unbalancedHint':
    'Una differenza diversa da zero indica operazioni non classificate o classificate male. Non considerare affidabile il profitto finché non è risolta.',

  'securities.heading': 'Dettaglio per titolo',
  'securities.description':
    'Solo posizioni con almeno una vendita conclusa. La resa è calcolata sul costo dei lotti venduti, non sul capitale versato.',
  'securities.column.symbol': 'Simbolo',
  'securities.column.name': 'Nome',
  'securities.column.proceeds': 'Ricavi',
  'securities.column.cost': 'Costo',
  'securities.column.profit': 'Utile',
  'securities.column.yield': 'Resa sul costo',
  'securities.column.lots': 'Lotti chiusi',
  'securities.column.meanDays': 'Detenzione media',
  'securities.none': 'Nessuna posizione chiusa.',

  'openPositions.heading': 'Posizioni ancora aperte',
  'openPositions.note':
    'Valorizzate al costo di carico. L’export non contiene le quotazioni correnti, quindi la plusvalenza latente non è calcolabile.',
  'openPositions.column.quantity': 'Quantità',
  'openPositions.column.cost': 'Costo di carico',
  'openPositions.none': 'Nessuna posizione aperta.',

  'windows.heading': 'Andamento per finestra temporale',
  'windows.anchorNote':
    'Le finestre sono ancorate all’ultima data presente nel file ({anchor}), non a oggi: un export non recente mostrerebbe altrimenti ogni finestra vuota.',
  'windows.column.window': 'Finestra',
  'windows.column.range': 'Periodo',
  'windows.column.profit': 'Profitto',
  'windows.column.buys': 'Acquisti',
  'windows.column.sells': 'Vendite',
  'windows.column.netDeposits': 'Versamenti netti',
  'windows.column.operations': 'Operazioni',
  'windows.noMovement': 'Nessun movimento di profitto',
  'windows.composition.heading': 'Di cosa è fatto il profitto della finestra',
  'windows.composition.note':
    'Le finestre si sovrappongono: ogni riga contiene quelle più corte, quindi le righe non si sommano fra loro.',
  'window.ALL': 'Totale',
  'window.1Y': '1 anno',
  'window.6M': '6 mesi',
  'window.3M': '3 mesi',
  'window.1M': '1 mese',
  'window.1W': '1 settimana',
  'window.1D': '1 giorno',

  // Names the section holding both monthly charts, so neither figure's own
  // heading is repeated immediately above it.
  'monthly.heading': 'Mese per mese',
  // One figure with two states: the grid of months, and — once a month is
  // opened — that month's parts as tiles. The description has to cover both,
  // because a figure's heading and description are written once and stay put.
  'monthlyProfit.heading': 'Profitto mese per mese',
  'monthlyProfit.description':
    'Una riga per anno, una colonna per mese, con i totali a destra e in basso. Il colore dice il segno, l’intensità quanto pesa rispetto al mese più grande. Gli importi sono abbreviati: passa sopra una cella per leggerlo per intero, o aprilo nella tabella qui sotto. Clicca una cella e il grafico si apre su quel mese, diviso nelle parti che lo hanno composto.',
  'monthlyProfit.legend.positive': 'Aggiunge',
  'monthlyProfit.legend.negative': 'Toglie',
  'monthlyProfit.back': 'Torna a tutti i mesi',
  'monthlyProfit.parts': 'Di cosa è fatto {month}',
  'monthlyProfit.total': 'Totale',
  // Names a column total in the readout and in the table: every January added
  // together is not a January, and must not read like one.
  'monthlyProfit.allYears': '{month}, tutti gli anni',
  'monthlyProfit.column.part': 'Componente',
  'monthlyProfit.column.amount': 'Importo',
  // Not "share of the profit": the areas are drawn from the magnitudes, and
  // the magnitudes do not add up to the profit because the charges subtract.
  'monthlyProfit.column.weight': 'Peso sul disegno',
  'monthlyProfit.empty': 'In questo mese non si è mosso nulla.',

  // The same profit as the chart above, split by what produced it. "Oneri" is
  // drawn below the zero line, so its label never needs to say "negative".
  'monthlyComposition.heading': 'Di cosa è fatto il profitto del mese',
  'monthlyComposition.description':
    'Le stesse cifre del grafico precedente, divise per provenienza. Sopra lo zero ciò che ha aggiunto profitto, sotto gli oneri che lo hanno ridotto: la somma algebrica di ogni colonna è il profitto del mese.',
  // The five parts of a realized profit. Shared by the monthly stack and the
  // per-window table, so a part carries one name in both.
  'profitPart.trading': 'Compravendite',
  'profitPart.dividends': 'Dividendi',
  'profitPart.interest': 'Interessi',
  'profitPart.otherIncome': 'Altri proventi',
  'profitPart.charges': 'Oneri',

  'monthlyTransactions.heading': 'Righe di compravendita per mese',
  'monthlyTransactions.description':
    'Conteggio delle righe BUY e SELL. Un ordine eseguito parzialmente produce più righe, quindi questo numero è superiore al numero di ordini impartiti.',
  'monthlyTransactions.series': 'Righe BUY e SELL',
  'monthly.column.month': 'Mese',
  'monthly.column.profit': 'Profitto',
  'monthly.column.transactions': 'Righe BUY e SELL',

  'capital.heading': 'Capitale e rendimento',
  'capital.figure': 'Capitale e risultato, mese per mese',
  'capital.description':
    'Per ogni mese due barre: il costo delle posizioni aperte, misurato a fine di ogni giornata e mediato sui giorni del mese weekend compresi, e accanto le compravendite realizzate più i dividendi dello stesso mese. Il grafico mostra un anno per volta; la tabella li elenca tutti, con i giorni su cui ogni media è stata presa — il primo e l’ultimo mese sono parziali.',
  'capital.year': 'Anno',
  'capital.showing': 'Il grafico mostra il {year}.',
  'capital.legend.gain': 'Mese in utile',
  'capital.legend.loss': 'Mese in perdita',
  'capitalInvested.series': 'Capitale medio investito',
  'capitalProfit.series': 'Risultato del mese',
  'capital.column.month': 'Mese',
  'capital.column.capital': 'Capitale medio',
  'capital.column.days': 'Giorni',
  'capital.column.profit': 'Utile',
  'capital.column.return': 'Rendimento',
  'capital.caution':
    'Il capitale è al costo di carico, non ai prezzi di mercato, e l’utile qui è solo compravendite più dividendi: gli interessi sulla liquidità, gli altri proventi e gli oneri di conto restano fuori, perché non li ha prodotti il capitale investito. Per questo la cifra differisce da quella di Mese per mese. I rendimenti mensili non si sommano: hanno denominatori diversi.',

  'assetClass.heading': 'Profitto per classe di attivo',
  'assetClass.column.assetClass': 'Classe di attivo',
  'assetClass.column.profit': 'Profitto',
  'assetClass.UNCLASSIFIED': 'Non indicata',

  'winRate.heading': 'Percentuale di titoli in utile',
  'winRate.caution':
    'Qui si contano i titoli, non le singole vendite: le percentuali più in basso, calcolate sulla vendita, hanno un altro denominatore e dicono un altro numero. Da leggere insieme all’utile e alla perdita media: una percentuale alta con perdite più grandi dei guadagni resta un risultato negativo.',
  'winRate.closed': 'Posizioni chiuse',
  'winRate.wins': 'In utile',
  'winRate.losses': 'In perdita',
  'winRate.breakEven': 'In pareggio',
  'winRate.rate': 'Percentuale in utile',
  'winRate.averageWin': 'Utile medio',
  'winRate.averageLoss': 'Perdita media',

  'topFlop.heading': 'Migliori e peggiori',
  'topFlop.top': 'Migliori',
  'topFlop.flop': 'Peggiori',

  'holding.heading': 'Durata di detenzione',
  'holding.note':
    'Calcolata su ogni lotto venduto. La mediana è riportata accanto alla media perché poche posizioni tenute molto a lungo spostano la media.',
  'holding.mean': 'Durata media',
  'holding.median': 'Durata mediana',
  'holding.byClass': 'Per classe di attivo',
  'holding.column.assetClass': 'Classe di attivo',
  'holding.column.meanDays': 'Durata media',
  'holding.column.closures': 'Lotti venduti',
  'holding.days': '{count} giorni',
  'holding.day': '{count} giorno',

  'performance.heading': 'Performance',
  'performance.caution':
    'Solo vendite chiuse: dividendi, interessi e oneri non entrano in questi numeri.',
  'performance.cautionNet':
    'Solo vendite chiuse, meno tutte le commissioni e imposte datate nel periodo — comprese quelle di acquisti e dividendi, che nessuna di queste vendite ha causato. L’incasso di dividendi e interessi invece non entra.',
  'performance.from': 'Dal',
  'performance.to': 'Al',
  'performance.basis': 'Al netto di commissioni e imposte',
  'performance.range': 'Intervallo scelto: dal {from} al {to}.',
  'performance.rangeInvalid': 'La data iniziale viene dopo quella finale.',
  'performance.withheld': 'Oneri sottratti nel periodo: {amount}.',
  'performance.gauge.title': 'Vendite in utile',
  'performance.gauge.wins': 'In utile',
  'performance.gauge.losses': 'In perdita',
  'performance.gauge.breakEven': 'In pari',
  'performance.gauge.count': '{wins} su {total}',
  'performance.meanCalendar': 'Media per giorno di calendario',
  'performance.meanActive': 'Media per giorno operativo',
  'performance.medianActive': 'Mediana per giorno operativo',
  'performance.hint.calendar': 'su {days} giorni',
  'performance.hint.active': 'su {days} giorni con operatività',
  'performance.hint.activeNet': 'su {days} giorni con vendite o oneri',
  'performance.empty': 'Nessuna vendita chiusa in questo periodo.',
  'performance.column.window': 'Periodo',
  'performance.column.sales': 'Vendite',
  'performance.column.winShare': 'In utile',
  'performance.column.profit': 'Risultato',
  'performance.column.meanCalendar': 'Media per giorno di calendario',
  'performance.column.meanActive': 'Media per giorno operativo',
  'performance.column.medianActive': 'Mediana per giorno operativo',

  'execution.heading': 'Qualità dell’operatività',
  'execution.caution':
    'Una vendita è un simbolo in un giorno: i lotti chiusi insieme contano una volta sola. Qui si misura il solo risultato di compravendita — dividendi, interessi e oneri non entrano.',
  'execution.profitFactor': 'Profit factor',
  'execution.profitFactorHint': 'Nessuna vendita in perdita: il rapporto non ha valore.',
  'execution.meanProfit': 'Risultato medio',
  'execution.column.side': 'Esito',
  'execution.column.sales': 'Vendite',
  'execution.column.meanProfit': 'Risultato medio',
  'execution.column.meanDays': 'Durata media',
  'execution.winners': 'In utile',
  'execution.losers': 'In perdita',
  'execution.byHolding': 'Per fascia di durata',
  'execution.column.bucket': 'Fascia',
  'execution.column.profit': 'Risultato',
  'execution.column.yield': 'Rendimento sul capitale',
  'execution.bucket.UNDER_1M': 'Meno di 1 mese',
  'execution.bucket.M1_TO_M6': 'Da 1 a 6 mesi',
  'execution.bucket.M6_TO_M12': 'Da 6 a 12 mesi',
  'execution.bucket.OVER_1Y': 'Oltre 1 anno',
  'execution.profitConcentration':
    'Le tre vendite migliori valgono il {percent} del guadagno complessivo.',
  'execution.concentration':
    'Le tre vendite peggiori valgono il {percent} della perdita complessiva.',

  'chart.showTable': 'Mostra i dati in tabella',
  'chart.hideTable': 'Nascondi la tabella',
  'chart.tableLabel': 'Dati del grafico: {title}',
  'chart.empty': 'Nessun dato da rappresentare.',
  'chart.legendHint': 'Clicca una voce per nascondere quella serie.',

  'print.generatedOn': 'Report generato il {date}',
  'print.source': 'Trade Republic Analyzer — elaborazione locale, nessun dato inviato.',

  'limits.heading': 'Limiti dichiarati',
  'limits.lossCarryforward':
    'Non è un calcolo fiscale. Le minusvalenze pregresse e la loro compensazione non sono gestite.',
  'limits.unrealized':
    'Nessuna plusvalenza latente: le posizioni aperte sono valorizzate al costo di carico, perché l’export non contiene le quotazioni correnti.',
  'limits.brokerOnly': 'Il formato supportato è solo quello dell’export di Trade Republic.',
  'limits.currency':
    'Le operazioni in valuta diversa dall’euro non sono state verificate: se il file ne contiene, controlla i totali.',
  'limits.marketPrices':
    'Senza prezzi di mercato restano fuori portata volatilità, Sharpe, Sortino, beta, VaR, drawdown del capitale, plusvalenze latenti e correlazioni: l’estratto conto riporta le operazioni, non le quotazioni.',

  'footer.privacy': 'Come vengono trattati i dati',
  'footer.sourceCode': 'Codice sorgente',
  'footer.disclaimerHeading': 'Avvertenze',
  'footer.notAffiliated':
    'Strumento indipendente, non affiliato a Trade Republic né sostenuto da essa. I marchi citati appartengono ai rispettivi titolari.',
  'footer.notAdvice':
    'I risultati non costituiscono consulenza finanziaria né fiscale e non sostituiscono i documenti ufficiali del tuo intermediario: verifica sempre le cifre sull’estratto conto originale.',
  'footer.noWarranty':
    'Software libero distribuito con licenza MIT, senza alcuna garanzia. L’uso è a tuo rischio.',
  'footer.copyright': '© 2026 Enrico Schintu',
  'footer.authorSite': 'enricoschintu.com',
  // Una riga sola, perché su carta le avvertenze non devono mangiare una pagina.
  'print.legal':
    'Non è consulenza finanziaria né fiscale. Strumento indipendente, non affiliato a Trade Republic. © 2026 Enrico Schintu, licenza MIT, senza garanzie.',
} as const;

export type MessageKey = keyof typeof it;
export type Messages = Record<MessageKey, string>;
