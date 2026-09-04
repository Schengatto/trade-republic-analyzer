/** The Dutch catalogue. */

import type { Messages } from './it';

export const nl: Messages = {
  'app.title': 'Trade Republic Analyzer',
  'app.tagline': 'Je afschrift verlaat deze browser nooit.',
  'app.skipToReport': 'Ga naar het rapport',

  'nav.language': 'Taal',
  'nav.theme': 'Thema',
  'nav.theme.toLight': 'Wissel naar licht',
  'nav.theme.toDark': 'Wissel naar donker',
  'nav.print': 'Afdrukken of opslaan als PDF',
  'nav.reset': 'Een ander bestand analyseren',
  'nav.outline': 'Secties',
  'nav.outline.label': 'Secties van het rapport',

  'upload.heading': 'Laad je Trade Republic-export',
  'upload.instruction': 'Sleep het CSV-bestand hierheen, of kies het op je computer.',
  'upload.button': 'CSV-bestand kiezen',
  'upload.dropActive': 'Laat het bestand los om het te analyseren',
  'upload.privacyHeading': 'Het bestand blijft op je computer',
  'upload.privacyBody':
    'Er is geen cloud en geen server. Het CSV-bestand wordt gelezen en geanalyseerd door de browser die je voor je hebt, en verlaat deze machine nooit.',
  'upload.privacyFact.noUpload.term': 'Er wordt niets verzonden',
  'upload.privacyFact.noUpload.detail':
    'Het bestand wordt nergens naartoe geüpload, niet naar een server van ons en niet naar die van iemand anders. Het tabblad Netwerk van de browser blijft leeg.',
  'upload.privacyFact.noStorage.term': 'Er wordt niets bewaard',
  'upload.privacyFact.noStorage.detail':
    'Van je bestand wordt niets opgeslagen. De browser onthoudt alleen drie voorkeuren: taal, thema en de stand van de sectiebalk. Herlaad de pagina en het rapport is weg.',
  'upload.privacyFact.offline.term': 'Werkt offline',
  'upload.privacyFact.offline.detail':
    'Verbreek de netwerkverbinding, herlaad de pagina en laad het bestand opnieuw: de analyse draait gewoon door, want ze heeft niemand om iets aan te vragen.',
  'upload.formatHint':
    'Je hebt het CSV-bestand met transacties nodig dat je uit Trade Republic exporteert, met de oorspronkelijke kolomkoppen.',
  'upload.reading': 'Het bestand wordt gelezen…',

  'error.heading': 'Het bestand kon niet worden gelezen',
  'error.MISSING_COLUMNS':
    'Er ontbreken {count} verplichte kolom(men): {columns}. Dit lijkt geen export van transacties uit Trade Republic te zijn.',
  'error.MALFORMED_ROW':
    'Regel {line} kon niet worden gelezen. De inhoud ervan wordt niet getoond, omdat die persoonsgegevens kan bevatten.',
  'error.NO_ROWS': 'Het bestand bevat geen transacties.',
  'error.NOT_CSV': 'Het geselecteerde bestand is geen CSV.',
  'error.UNKNOWN': 'Het bestand werd niet herkend.',
  'error.retry': 'Probeer een ander bestand',

  'banner.unclassified.heading': 'Niet-herkende transacties',
  'banner.unclassified.body':
    '{count} transactie(s) hebben een type dat de rekenkern niet kent ({types}), samen goed voor {amount}. Dat bedrag wordt bewust BUITEN de winst gehouden: je vindt het terug in het aansluitingsverschil hieronder. Meld deze types, zodat ze kunnen worden toegevoegd.',
  'banner.anomalies.heading': 'Afwijkingen in de gegevens gevonden',
  'anomaly.UNCOVERED_SALE':
    '{symbol}: {quantity} stuks verkocht zonder stukken in portefeuille om de verkoop te dekken.',
  'anomaly.UNMATCHED_FREE_LOT_CANCELLATION':
    '{symbol}: annulering van {quantity} gratis stuks zonder bijbehorend gratis lot.',

  'summary.heading': 'Samenvatting',
  'summary.netProfit': 'Nettowinst',
  'summary.netProfit.hint': 'Handel en inkomsten, na kosten en belastingen.',
  'summary.tradingProfit': 'Handelswinst',
  'summary.tradingProfit.hint': 'Alleen gesloten posities, gekoppeld volgens FIFO.',
  'summary.totalCharges': 'Totale lasten',
  'summary.totalCharges.hint': 'Kosten en ingehouden belasting.',
  'summary.netCapital': 'Netto gestort kapitaal',
  'summary.netCapital.hint': 'Stortingen minus opnames.',
  'summary.returnPercent': 'Rendement van {value} op het gestorte kapitaal',
  'summary.returnUnavailable':
    'Rendement niet beschikbaar: het netto gestorte kapitaal is nul.',
  'summary.operationsRead': '{count} transacties gelezen',
  'summary.period': 'Periode van {from} tot {to}',

  'trend.heading': 'Cumulatief verloop',
  'trend.description': 'Nettowinst en handelswinst, dag voor dag, op één as.',
  'trend.series.net': 'Nettowinst',
  'trend.series.trading': 'Handelswinst',
  'trend.column.date': 'Datum',
  'trend.column.dayProfit': 'Verandering op de dag',

  'composition.heading': 'Hoe het resultaat is opgebouwd',
  'composition.securitiesInProfit': 'Effecten met winst',
  'composition.securitiesInLoss': 'Effecten met verlies',
  'composition.securitiesBreakEven': 'Effecten op break-even',
  'composition.grossProfit': 'Brutowinst',
  'composition.income': 'Inkomsten per type',
  'composition.incomeNote':
    'Zit al in de brutowinst hierboven; dit is alleen de uitsplitsing.',
  'composition.fees': 'Kosten',
  'composition.costDrag': 'Aandeel van de brutowinst',
  'composition.taxes': 'Belasting per type',
  'composition.netProfit': 'Nettowinst',
  'composition.column.item': 'Post',
  'composition.column.amount': 'Bedrag',
  'composition.none': 'Niets geregistreerd.',

  'excluded.heading': 'Mutaties die buiten de winst blijven',
  'excluded.note':
    'Deze posten verplaatsen geld, maar zijn geen winst en geen verlies: geld storten levert geen winst op, en een positie die nog openstaat heeft pas een resultaat zodra ze verkocht is.',
  'excluded.deposits': 'Stortingen',
  'excluded.withdrawals': 'Opnames',
  'excluded.netCapital': 'Netto gestort kapitaal',
  'excluded.cardSpending': 'Uitgaven met de kaart',
  'excluded.openPositionsCost': 'Kostprijs van openstaande posities',

  'reconciliation.heading': 'Kasaansluiting',
  'reconciliation.description':
    'De winst wordt opnieuw berekend uit alleen de kasmutaties, zonder FIFO. Twee onafhankelijke wegen naar hetzelfde getal: komen ze niet overeen, dan is een transactietype verkeerd ingedeeld.',
  'reconciliation.expected': 'Winst die uit de kasstromen volgt',
  'reconciliation.actual': 'Berekende nettowinst',
  'reconciliation.difference': 'Verschil',
  'reconciliation.balanced': 'Aansluiting klopt',
  'reconciliation.unbalanced': 'Aansluiting klopt NIET',
  'reconciliation.unbalancedHint':
    'Een verschil dat niet nul is, betekent dat transacties niet of verkeerd zijn ingedeeld. Vertrouw de winst niet zolang dit niet is opgelost.',

  'securities.heading': 'Detail per effect',
  'securities.description':
    'Posities met minstens één afgeronde verkoop. Het rendement wordt gemeten tegen de kostprijs van de verkochte lots, niet tegen het gestorte kapitaal.',
  'securities.column.symbol': 'Symbool',
  'securities.column.name': 'Naam',
  'securities.column.proceeds': 'Opbrengst',
  'securities.column.cost': 'Kostprijs',
  'securities.column.profit': 'Winst',
  'securities.column.yield': 'Rendement op kostprijs',
  'securities.column.lots': 'Gesloten lots',
  'securities.column.meanDays': 'Gem. houdperiode',
  'securities.none': 'Geen gesloten posities.',

  'openPositions.heading': 'Nog openstaande posities',
  'openPositions.note':
    'Gewaardeerd tegen kostprijs. De export bevat geen actuele koersen, dus ongerealiseerde winst is niet te berekenen.',
  'openPositions.column.quantity': 'Aantal',
  'openPositions.column.cost': 'Kostprijs',
  'openPositions.none': 'Geen openstaande posities.',

  'windows.heading': 'Resultaat per tijdvenster',
  'windows.anchorNote':
    'De vensters zijn verankerd aan de laatste datum in het bestand ({anchor}), niet aan vandaag: bij een oudere export zou anders elk venster leeg blijven.',
  'windows.column.window': 'Venster',
  'windows.column.range': 'Periode',
  'windows.column.profit': 'Winst',
  'windows.column.buys': 'Aankopen',
  'windows.column.sells': 'Verkopen',
  'windows.column.netDeposits': 'Netto stortingen',
  'windows.column.operations': 'Transacties',
  'windows.noMovement': 'Geen winstmutatie',
  'windows.composition.heading': 'Waaruit de winst van elk venster bestaat',
  'windows.composition.note':
    'De vensters overlappen elkaar: elke rij bevat de kortere, dus de rijen tellen niet bij elkaar op.',
  'window.ALL': 'Hele periode',
  'window.1Y': '1 jaar',
  'window.6M': '6 maanden',
  'window.3M': '3 maanden',
  'window.1M': '1 maand',
  'window.1W': '1 week',
  'window.1D': '1 dag',

  'monthly.heading': 'Maand voor maand',
  'monthlyProfit.heading': 'Winst maand voor maand',
  'monthlyProfit.description':
    'Eén rij per jaar, één kolom per maand, met de totalen rechts en onderaan. De kleur geeft het teken, de intensiteit hoe zwaar de maand weegt ten opzichte van de grootste maand. Bedragen zijn afgekort: ga met de muis over een cel om er één volledig te lezen, of open de tabel hieronder. Klik op een cel en de grafiek opent op die maand, opgesplitst in de delen waaruit ze is opgebouwd.',
  'monthlyProfit.legend.positive': 'Voegt toe',
  'monthlyProfit.legend.negative': 'Haalt weg',
  'monthlyProfit.back': 'Terug naar alle maanden',
  'monthlyProfit.parts': 'Waaruit {month} is opgebouwd',
  'monthlyProfit.total': 'Totaal',
  'monthlyProfit.allYears': '{month}, alle jaren',
  'monthlyProfit.column.part': 'Onderdeel',
  'monthlyProfit.column.amount': 'Bedrag',
  'monthlyProfit.column.weight': 'Gewicht in de tekening',
  'monthlyProfit.empty': 'In deze maand is niets bewogen.',

  'monthlyComposition.heading': 'Waaruit de winst van elke maand is opgebouwd',
  'monthlyComposition.description':
    'Dezelfde cijfers als in de grafiek hierboven, opgesplitst naar herkomst. Boven nul staat wat winst heeft toegevoegd, eronder de lasten die er winst af hebben gehaald: de algebraïsche som van elke kolom is de winst van die maand.',
  'profitPart.trading': 'Handel',
  'profitPart.dividends': 'Dividend',
  'profitPart.interest': 'Rente',
  'profitPart.otherIncome': 'Overige inkomsten',
  'profitPart.charges': 'Lasten',

  'monthlyTransactions.heading': 'Handelsregels per maand',
  'monthlyTransactions.description':
    'Een telling van de BUY- en SELL-regels. Een order dat gedeeltelijk wordt uitgevoerd, levert meerdere regels op, dus dit getal ligt hoger dan het aantal orders dat je hebt geplaatst.',
  'monthlyTransactions.series': 'BUY- en SELL-regels',
  'monthly.column.month': 'Maand',
  'monthly.column.profit': 'Winst',
  'monthly.column.transactions': 'BUY- en SELL-regels',

  'capital.heading': 'Kapitaal en rendement',
  'capitalInvested.heading': 'Gemiddeld geïnvesteerd kapitaal',
  'capitalInvested.description':
    'De kostprijs van de open posities, gemeten aan het eind van elke dag en gemiddeld over de dagen van de maand, weekends inbegrepen. De eerste en de laatste maand zijn gedeeltelijk: de kolom met de dagen zegt over hoeveel dagen het gemiddelde is genomen.',
  'capitalInvested.series': 'Gemiddeld geïnvesteerd kapitaal',
  'capital.column.month': 'Maand',
  'capital.column.capital': 'Gemiddeld kapitaal',
  'capital.column.days': 'Dagen',
  'capitalProfit.heading': 'Wat dat kapitaal heeft opgeleverd',
  'capitalProfit.description':
    'Gerealiseerd handelsresultaat en dividenden van dezelfde maand, op dezelfde kolommen als de grafiek hierboven: een maand lees je verticaal — hoeveel kapitaal er in het spel stond en hoeveel het opleverde.',
  'capitalProfit.series': 'Winst van de maand',
  'capital.column.profit': 'Winst',
  'capital.column.return': 'Rendement',
  'capital.caution':
    'Het kapitaal staat tegen kostprijs, niet tegen marktprijzen, en de winst hier is alleen handel plus dividenden: rente op cash, overige inkomsten en rekeningkosten blijven erbuiten, want het geïnvesteerde kapitaal heeft ze niet voortgebracht. Daarom wijkt dit cijfer af van dat onder Maand voor maand. Maandrendementen tellen niet op: ze hebben verschillende noemers.',

  'assetClass.heading': 'Winst per beleggingscategorie',
  'assetClass.column.assetClass': 'Beleggingscategorie',
  'assetClass.column.profit': 'Winst',
  'assetClass.UNCLASSIFIED': 'Niet vermeld',

  'winRate.heading': 'Aandeel posities met winst',
  'winRate.caution':
    'Lees dit samen met de gemiddelde winst en het gemiddelde verlies: een hoog percentage met verliezen die groter zijn dan de winsten blijft een negatief resultaat.',
  'winRate.closed': 'Gesloten posities',
  'winRate.wins': 'Met winst',
  'winRate.losses': 'Met verlies',
  'winRate.breakEven': 'Break-even',
  'winRate.rate': 'Aandeel met winst',
  'winRate.averageWin': 'Gemiddelde winst',
  'winRate.averageLoss': 'Gemiddeld verlies',

  'topFlop.heading': 'Beste en slechtste',
  'topFlop.top': 'Beste',
  'topFlop.flop': 'Slechtste',

  'holding.heading': 'Houdperiode',
  'holding.note':
    'Gemeten over elk verkocht lot. De mediaan staat naast het gemiddelde, omdat enkele zeer lang aangehouden posities het gemiddelde meetrekken.',
  'holding.mean': 'Gemiddelde duur',
  'holding.median': 'Mediane duur',
  'holding.byClass': 'Per beleggingscategorie',
  'holding.column.assetClass': 'Beleggingscategorie',
  'holding.column.meanDays': 'Gemiddelde duur',
  'holding.column.closures': 'Verkochte lots',
  'holding.days': '{count} dagen',
  'holding.day': '{count} dag',

  'performance.heading': 'Performance',
  'performance.caution':
    'Alleen afgesloten verkopen: dividend, rente en kosten tellen hier niet mee.',
  'performance.cautionNet':
    'Alleen afgesloten verkopen, min alle kosten en belastingen met een datum binnen de periode — ook die van aankopen en dividenden, die geen van deze verkopen heeft veroorzaakt. Ontvangen dividend en rente tellen juist niet mee.',
  'performance.from': 'Van',
  'performance.to': 'Tot',
  'performance.basis': 'Na kosten en belastingen',
  'performance.range': 'Gekozen periode: {from} tot en met {to}.',
  'performance.rangeInvalid': 'De begindatum ligt na de einddatum.',
  'performance.withheld': 'Kosten afgetrokken in de periode: {amount}.',
  'performance.gauge.title': 'Verkopen met winst',
  'performance.gauge.wins': 'Met winst',
  'performance.gauge.losses': 'Met verlies',
  'performance.gauge.breakEven': 'Quitte',
  'performance.gauge.count': '{wins} van {total}',
  'performance.meanCalendar': 'Gemiddelde per kalenderdag',
  'performance.meanActive': 'Gemiddelde per handelsdag',
  'performance.medianActive': 'Mediaan per handelsdag',
  'performance.hint.calendar': 'over {days} dagen',
  'performance.hint.active': 'over {days} dagen met verkopen',
  'performance.hint.activeNet': 'over {days} dagen met verkopen of kosten',
  'performance.empty': 'Geen verkoop afgesloten in deze periode.',
  'performance.column.window': 'Periode',
  'performance.column.sales': 'Verkopen',
  'performance.column.winShare': 'Met winst',
  'performance.column.profit': 'Resultaat',
  'performance.column.meanCalendar': 'Gemiddelde per kalenderdag',
  'performance.column.meanActive': 'Gemiddelde per handelsdag',
  'performance.column.medianActive': 'Mediaan per handelsdag',

  'execution.heading': 'Kwaliteit van de handel',
  'execution.caution':
    'Een verkoop is één symbool op één dag: lots die samen worden gesloten, tellen één keer. Hier wordt alleen het handelsresultaat gemeten — dividend, rente en lasten blijven erbuiten.',
  'execution.sales': 'Verkopen',
  'execution.winShare': 'Met winst',
  'execution.profitFactor': 'Winstfactor',
  'execution.profitFactorHint':
    'Geen enkele verkoop is met verlies gesloten, dus de verhouding heeft geen waarde.',
  'execution.meanProfit': 'Gemiddeld resultaat',
  'execution.column.side': 'Uitkomst',
  'execution.column.sales': 'Verkopen',
  'execution.column.meanProfit': 'Gemiddeld resultaat',
  'execution.column.meanDays': 'Gem. houdperiode',
  'execution.winners': 'Met winst',
  'execution.losers': 'Met verlies',
  'execution.byHolding': 'Per houdperiode',
  'execution.column.bucket': 'Klasse',
  'execution.column.profit': 'Resultaat',
  'execution.column.yield': 'Rendement op kostprijs',
  'execution.bucket.UNDER_1M': 'Minder dan 1 maand',
  'execution.bucket.M1_TO_M6': '1 tot 6 maanden',
  'execution.bucket.M6_TO_M12': '6 tot 12 maanden',
  'execution.bucket.OVER_1Y': 'Meer dan 1 jaar',
  'execution.concentration':
    'De drie slechtste verkopen zijn goed voor {percent} van het totale verlies.',

  'chart.showTable': 'Toon de gegevens als tabel',
  'chart.hideTable': 'Verberg de tabel',
  'chart.tableLabel': 'Gegevens van de grafiek: {title}',
  'chart.empty': 'Niets om weer te geven.',
  'chart.legendHint': 'Klik op een item om die reeks te verbergen.',

  'print.generatedOn': 'Rapport gemaakt op {date}',
  'print.source': 'Trade Republic Analyzer — lokaal berekend, er is niets verzonden.',

  'limits.heading': 'Vermelde beperkingen',
  'limits.lossCarryforward':
    'Dit is geen fiscale berekening. Verliezen uit eerdere jaren en de verrekening daarvan worden niet verwerkt.',
  'limits.unrealized':
    'Geen ongerealiseerde winst: openstaande posities worden gewaardeerd tegen kostprijs, omdat de export geen actuele koersen bevat.',
  'limits.brokerOnly': 'Het enige ondersteunde formaat is de export van Trade Republic.',
  'limits.currency':
    'Transacties in een andere valuta dan de euro zijn niet geverifieerd: bevat je bestand die, controleer dan de totalen.',
  'limits.marketPrices':
    'Zonder marktkoersen blijven volatiliteit, Sharpe, Sortino, bèta, VaR, drawdown van het kapitaal, ongerealiseerde winst en correlaties buiten bereik: het afschrift legt transacties vast, geen koersen.',

  'footer.privacy': 'Hoe je gegevens worden behandeld',
  'footer.sourceCode': 'Broncode',
  'footer.disclaimerHeading': 'Voorbehoud',
  'footer.notAffiliated':
    'Een onafhankelijk hulpmiddel, niet verbonden aan Trade Republic en niet door Trade Republic onderschreven. Handelsmerken behoren toe aan hun respectieve eigenaars.',
  'footer.notAdvice':
    'De resultaten zijn geen financieel of fiscaal advies en vervangen de officiële documenten van je broker niet: controleer de cijfers altijd aan de hand van het oorspronkelijke afschrift.',
  'footer.noWarranty':
    'Vrije software onder de MIT-licentie, zonder enige garantie. Gebruik is op eigen risico.',
  'footer.copyright': '© 2026 Enrico Schintu',
  'footer.authorSite': 'enricoschintu.com',
  'print.legal':
    'Geen financieel of fiscaal advies. Onafhankelijk hulpmiddel, niet verbonden aan Trade Republic. © 2026 Enrico Schintu, MIT-licentie, zonder garantie.',
};
