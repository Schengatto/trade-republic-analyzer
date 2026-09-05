/** The German catalogue. */

import type { Messages } from './it';

export const de: Messages = {
  'app.title': 'Trade Republic Analyzer',
  'app.tagline': 'Ihr Kontoauszug verlässt diesen Browser nie.',
  'app.skipToReport': 'Zum Bericht springen',

  'nav.language': 'Sprache',
  'nav.theme': 'Erscheinungsbild',
  'nav.theme.toLight': 'Auf Hell umschalten',
  'nav.theme.toDark': 'Auf Dunkel umschalten',
  'nav.print': 'Drucken oder als PDF speichern',
  'nav.reset': 'Andere Datei analysieren',
  'nav.outline': 'Abschnitte',
  'nav.outline.label': 'Abschnitte des Berichts',

  'upload.heading': 'Ihren Trade Republic Export laden',
  'upload.instruction': 'Die CSV-Datei hier ablegen oder vom Computer auswählen.',
  'upload.button': 'CSV-Datei auswählen',
  'upload.dropActive': 'Datei loslassen, um sie zu analysieren',
  'upload.privacyHeading': 'Die Datei bleibt auf Ihrem Computer',
  'upload.privacyBody':
    'Es gibt keine Cloud und keinen Server. Die CSV-Datei wird von dem Browser vor Ihnen gelesen und ausgewertet und verlässt diesen Rechner nie.',
  'upload.privacyFact.noUpload.term': 'Kein Versand',
  'upload.privacyFact.noUpload.detail':
    'Die Datei wird nirgendwohin hochgeladen, weder auf einen Server von uns noch auf den eines Dritten. Der Netzwerk-Tab des Browsers bleibt leer.',
  'upload.privacyFact.noStorage.term': 'Keine Speicherung',
  'upload.privacyFact.noStorage.detail':
    'Von Ihrer Datei wird nichts gespeichert. Im Browser bleiben nur drei Einstellungen: Sprache, Erscheinungsbild und Zustand der Abschnittsleiste. Nach dem Neuladen der Seite ist der Bericht verschwunden.',
  'upload.privacyFact.offline.term': 'Funktioniert offline',
  'upload.privacyFact.offline.detail':
    'Trennen Sie die Netzwerkverbindung, laden Sie die Seite neu und laden Sie die Datei erneut: die Auswertung läuft trotzdem, weil sie niemanden zu fragen hat.',
  'upload.formatHint':
    'Benötigt wird die aus Trade Republic exportierte CSV-Datei der Transaktionen, mit ihren ursprünglichen Spaltenüberschriften.',
  'upload.reading': 'Die Datei wird gelesen…',

  'error.heading': 'Die Datei konnte nicht gelesen werden',
  'error.MISSING_COLUMNS':
    '{count} erforderliche Spalte(n) fehlen: {columns}. Das sieht nicht nach einem Transaktionsexport von Trade Republic aus.',
  'error.MALFORMED_ROW':
    'Zeile {line} konnte nicht gelesen werden. Ihr Inhalt wird nicht angezeigt, weil er personenbezogene Daten enthalten kann.',
  'error.NO_ROWS': 'Die Datei enthält keine Buchungen.',
  'error.NOT_CSV': 'Die ausgewählte Datei ist keine CSV-Datei.',
  'error.UNKNOWN': 'Die Datei wurde nicht erkannt.',
  'error.retry': 'Andere Datei versuchen',

  'banner.unclassified.heading': 'Nicht erkannte Buchungen',
  'banner.unclassified.body':
    '{count} Buchung(en) tragen einen Typ, den die Auswertung nicht kennt ({types}), zusammen {amount}. Dieser Betrag wird bewusst AUSSERHALB des Gewinns gehalten: Sie finden ihn unten in der Differenz der Abstimmung. Bitte melden Sie diese Typen, damit sie ergänzt werden können.',
  'banner.anomalies.heading': 'In den Daten gefundene Auffälligkeiten',
  'anomaly.UNCOVERED_SALE':
    '{symbol}: {quantity} Stück verkauft, ohne Bestand zur Deckung.',
  'anomaly.UNMATCHED_FREE_LOT_CANCELLATION':
    '{symbol}: Stornierung von {quantity} Gratisstücken ohne passenden Gratisposten.',

  'summary.heading': 'Übersicht',
  'summary.netProfit': 'Nettogewinn',
  'summary.netProfit.hint': 'Handel und Erträge, nach Gebühren und Steuern.',
  'summary.tradingProfit': 'Handelsgewinn',
  'summary.tradingProfit.hint': 'Nur geschlossene Positionen, nach FIFO zugeordnet.',
  'summary.totalCharges': 'Belastungen gesamt',
  'summary.totalCharges.hint': 'Gebühren und einbehaltene Steuern.',
  'summary.netCapital': 'Netto eingezahltes Kapital',
  'summary.netCapital.hint': 'Einzahlungen abzüglich Auszahlungen.',
  'summary.return': 'Rendite auf das Kapital',
  'summary.return.hint': 'Gesamter Zeitraum, {from} bis {to}. Nicht annualisiert.',
  'summary.returnUnavailable':
    'Rendite nicht verfügbar: das netto eingezahlte Kapital ist null.',
  'summary.operationsRead': '{count} Buchungen gelesen',
  'summary.period': 'Zeitraum von {from} bis {to}',

  'trend.heading': 'Kumulierter Verlauf',
  'trend.description': 'Nettogewinn und Handelsgewinn, Tag für Tag, auf einer Achse.',
  'trend.series.net': 'Nettogewinn',
  'trend.series.trading': 'Handelsgewinn',
  'trend.column.date': 'Datum',
  'trend.column.dayProfit': 'Veränderung am Tag',
  'trend.drawdown': 'Größter Rückgang',
  'trend.drawdown.hint': 'Vom vorherigen Höchststand, Tiefpunkt am {date}.',
  'trend.worstDay': 'Schlechtester Tag',
  'trend.worstDay.hint': 'Verlust am {date}.',

  'composition.heading': 'Wie sich das Ergebnis zusammensetzt',
  'composition.grossProfit': 'Bruttogewinn',
  'composition.income': 'Erträge nach Art',
  'composition.incomeNote':
    'Bereits im Bruttogewinn oben enthalten; dies ist nur die Aufschlüsselung.',
  'composition.fees': 'Gebühren',
  'composition.costDrag': 'Anteil am Bruttogewinn',
  'composition.taxes': 'Steuern nach Art',
  'composition.netProfit': 'Nettogewinn',
  'composition.column.item': 'Position',
  'composition.column.amount': 'Betrag',
  'composition.none': 'Nichts erfasst.',

  'excluded.heading': 'Vom Gewinn ausgenommene Bewegungen',
  'excluded.note':
    'Diese bewegen Geld, sind aber weder Gewinn noch Verlust: eine Einzahlung erzeugt keinen Gewinn, und eine noch offene Position hat kein Ergebnis, solange sie nicht verkauft ist.',
  'excluded.deposits': 'Einzahlungen',
  'excluded.withdrawals': 'Auszahlungen',
  'excluded.netCapital': 'Netto eingezahltes Kapital',
  'excluded.cardSpending': 'Kartenzahlungen',
  'excluded.openPositionsCost': 'Einstandswert der offenen Positionen',

  'reconciliation.heading': 'Abstimmung der Geldbewegungen',
  'reconciliation.description':
    'Der Gewinn wird allein aus den Geldbewegungen neu berechnet, ohne FIFO. Zwei unabhängige Wege zur selben Zahl: weichen sie voneinander ab, ist ein Buchungstyp falsch eingeordnet.',
  'reconciliation.expected': 'Aus den Geldbewegungen abgeleiteter Gewinn',
  'reconciliation.actual': 'Berechneter Nettogewinn',
  'reconciliation.difference': 'Differenz',
  'reconciliation.balanced': 'Abstimmung korrekt',
  'reconciliation.unbalanced': 'Abstimmung NICHT korrekt',
  'reconciliation.unbalancedHint':
    'Eine Differenz ungleich null bedeutet, dass Buchungen nicht oder falsch eingeordnet sind. Vertrauen Sie dem Gewinn nicht, solange das nicht geklärt ist.',

  'securities.heading': 'Detail je Wertpapier',
  'securities.description':
    'Nur Positionen mit mindestens einem abgeschlossenen Verkauf. Die Rendite wird am Einstandswert der verkauften Posten gemessen, nicht am eingezahlten Kapital.',
  'securities.column.symbol': 'Symbol',
  'securities.column.name': 'Name',
  'securities.column.proceeds': 'Verkaufserlös',
  'securities.column.cost': 'Einstandswert',
  'securities.column.profit': 'Gewinn',
  'securities.column.yield': 'Rendite auf Einstand',
  'securities.column.lots': 'Geschlossene Posten',
  'securities.column.meanDays': 'Ø Haltedauer',
  'securities.none': 'Keine geschlossenen Positionen.',

  'openPositions.heading': 'Noch offene Positionen',
  'openPositions.note':
    'Bewertet zum Einstandswert. Der Export enthält keine aktuellen Kurse, daher lassen sich nicht realisierte Gewinne nicht berechnen.',
  'openPositions.column.quantity': 'Stückzahl',
  'openPositions.column.cost': 'Einstandswert',
  'openPositions.none': 'Keine offenen Positionen.',

  'windows.heading': 'Entwicklung nach Zeitfenster',
  'windows.anchorNote':
    'Die Zeitfenster sind am letzten in der Datei vorhandenen Datum ({anchor}) verankert, nicht am heutigen Tag: ein älterer Export würde sonst jedes Fenster leer zeigen.',
  'windows.column.window': 'Fenster',
  'windows.column.range': 'Zeitraum',
  'windows.column.profit': 'Gewinn',
  'windows.column.buys': 'Käufe',
  'windows.column.sells': 'Verkäufe',
  'windows.column.netDeposits': 'Nettoeinzahlungen',
  'windows.column.operations': 'Buchungen',
  'windows.noMovement': 'Keine Gewinnbewegung',
  'windows.composition.heading': 'Woraus sich der Gewinn je Fenster zusammensetzt',
  'windows.composition.note':
    'Die Fenster überlappen sich: jede Zeile enthält die kürzeren, daher lassen sich die Zeilen nicht zusammenzählen.',
  'window.ALL': 'Gesamt',
  'window.1Y': '1 Jahr',
  'window.6M': '6 Monate',
  'window.3M': '3 Monate',
  'window.1M': '1 Monat',
  'window.1W': '1 Woche',
  'window.1D': '1 Tag',

  'monthly.heading': 'Monat für Monat',
  'monthlyProfit.heading': 'Gewinn Monat für Monat',
  'monthlyProfit.description':
    'Eine Zeile je Jahr, eine Spalte je Monat, mit den Summen rechts und unten. Die Farbe zeigt das Vorzeichen, die Intensität das Gewicht gegenüber dem größten Monat. Die Beträge sind abgekürzt: mit dem Zeiger über eine Zelle fahren, um einen Betrag vollständig zu lesen, oder die Tabelle unten öffnen. Ein Klick auf eine Zelle öffnet das Diagramm auf diesem Monat, aufgeteilt in die Teile, die ihn ergeben haben.',
  'monthlyProfit.legend.positive': 'Fügt hinzu',
  'monthlyProfit.legend.negative': 'Zieht ab',
  'monthlyProfit.back': 'Zurück zu allen Monaten',
  'monthlyProfit.parts': 'Woraus {month} besteht',
  'monthlyProfit.total': 'Gesamt',
  'monthlyProfit.allYears': '{month}, alle Jahre',
  'monthlyProfit.column.part': 'Bestandteil',
  'monthlyProfit.column.amount': 'Betrag',
  'monthlyProfit.column.weight': 'Gewicht in der Darstellung',
  'monthlyProfit.empty': 'In diesem Monat hat sich nichts bewegt.',

  'monthlyComposition.heading': 'Woraus sich der Gewinn je Monat zusammensetzt',
  'monthlyComposition.description':
    'Dieselben Zahlen wie im Diagramm darüber, aufgeteilt nach ihrer Herkunft. Über null steht, was den Gewinn erhöht hat, darunter die Belastungen, die ihn verringert haben: die algebraische Summe jeder Spalte ist der Gewinn des Monats.',
  'profitPart.trading': 'Handel',
  'profitPart.dividends': 'Dividenden',
  'profitPart.interest': 'Zinsen',
  'profitPart.otherIncome': 'Sonstige Erträge',
  'profitPart.charges': 'Belastungen',

  'monthlyTransactions.heading': 'Handelszeilen je Monat',
  'monthlyTransactions.description':
    'Eine Zählung der BUY- und SELL-Zeilen. Eine teilweise ausgeführte Order erzeugt mehrere Zeilen, daher ist diese Zahl höher als die Zahl der erteilten Orders.',
  'monthlyTransactions.series': 'BUY- und SELL-Zeilen',
  'monthly.column.month': 'Monat',
  'monthly.column.profit': 'Gewinn',
  'monthly.column.transactions': 'BUY- und SELL-Zeilen',

  'capital.heading': 'Kapital und Rendite',
  'capital.figure': 'Kapital und Ergebnis, Monat für Monat',
  'capital.description':
    'Zwei Balken je Monat: die Kosten der offenen Positionen, am Ende jedes Tages gemessen und über die Tage des Monats gemittelt, Wochenenden eingeschlossen, und daneben die realisierten Handelsergebnisse samt Dividenden desselben Monats. Das Diagramm zeigt ein Jahr auf einmal; die Tabelle führt alle auf, mit den Tagen, über die jeweils gemittelt wurde — der erste und der letzte Monat sind unvollständig.',
  'capital.year': 'Jahr',
  'capital.showing': 'Das Diagramm zeigt {year}.',
  'capital.legend.gain': 'Monat im Gewinn',
  'capital.legend.loss': 'Monat im Verlust',
  'capitalInvested.series': 'Durchschnittlich investiertes Kapital',
  'capitalProfit.series': 'Ergebnis des Monats',
  'capital.column.month': 'Monat',
  'capital.column.capital': 'Durchschn. Kapital',
  'capital.column.days': 'Tage',
  'capital.column.profit': 'Gewinn',
  'capital.column.return': 'Rendite',
  'capital.caution':
    'Das Kapital steht zu Anschaffungskosten, nicht zu Marktpreisen, und der Gewinn hier ist nur Handel plus Dividenden: Zinsen auf Guthaben, sonstige Erträge und Kontogebühren bleiben außen vor, weil das investierte Kapital sie nicht erwirtschaftet hat. Deshalb weicht diese Zahl von der unter Monat für Monat ab. Monatsrenditen addieren sich nicht: Sie haben unterschiedliche Nenner.',

  'assetClass.heading': 'Gewinn nach Anlageklasse',
  'assetClass.column.assetClass': 'Anlageklasse',
  'assetClass.column.profit': 'Gewinn',
  'assetClass.UNCLASSIFIED': 'Nicht angegeben',

  'winRate.heading': 'Anteil der Positionen im Gewinn',
  'winRate.caution':
    'Gezählt werden Wertpapiere, nicht einzelne Verkäufe: die Prozentsätze weiter unten messen den Verkauf, und ein anderer Nenner ergibt eine andere Zahl. Zusammen mit dem Durchschnittsgewinn und dem Durchschnittsverlust zu lesen: eine hohe Quote mit Verlusten, die größer sind als die Gewinne, bleibt ein negatives Ergebnis.',
  'winRate.closed': 'Geschlossene Positionen',
  'winRate.wins': 'Im Gewinn',
  'winRate.losses': 'Im Verlust',
  'winRate.breakEven': 'Ausgeglichen',
  'winRate.rate': 'Anteil im Gewinn',
  'winRate.averageWin': 'Durchschnittsgewinn',
  'winRate.averageLoss': 'Durchschnittsverlust',

  'topFlop.heading': 'Beste und schlechteste',
  'topFlop.top': 'Beste',
  'topFlop.flop': 'Schlechteste',

  'holding.heading': 'Haltedauer',
  'holding.note':
    'Gemessen an jedem verkauften Posten. Der Median steht neben dem Mittelwert, weil einige sehr lange gehaltene Positionen den Mittelwert mitziehen.',
  'holding.mean': 'Mittlere Dauer',
  'holding.median': 'Mediane Dauer',
  'holding.byClass': 'Nach Anlageklasse',
  'holding.column.assetClass': 'Anlageklasse',
  'holding.column.meanDays': 'Mittlere Dauer',
  'holding.column.closures': 'Verkaufte Posten',
  'holding.days': '{count} Tage',
  'holding.day': '{count} Tag',

  'performance.heading': 'Performance',
  'performance.caution':
    'Nur geschlossene Verkäufe: Dividenden, Zinsen und Kosten fließen hier nicht ein.',
  'performance.cautionNet':
    'Nur geschlossene Verkäufe, abzüglich aller im Zeitraum datierten Gebühren und Steuern — auch derer auf Käufe und Dividenden, die keiner dieser Verkäufe verursacht hat. Erhaltene Dividenden und Zinsen bleiben dagegen außen vor.',
  'performance.from': 'Von',
  'performance.to': 'Bis',
  'performance.basis': 'Abzüglich Gebühren und Steuern',
  'performance.range': 'Gewählter Zeitraum: {from} bis {to}.',
  'performance.rangeInvalid': 'Das Anfangsdatum liegt nach dem Enddatum.',
  'performance.withheld': 'Im Zeitraum abgezogene Kosten: {amount}.',
  'performance.gauge.title': 'Verkäufe im Gewinn',
  'performance.gauge.wins': 'Im Gewinn',
  'performance.gauge.losses': 'Im Verlust',
  'performance.gauge.breakEven': 'Ausgeglichen',
  'performance.gauge.count': '{wins} von {total}',
  'performance.meanCalendar': 'Mittelwert pro Kalendertag',
  'performance.meanActive': 'Mittelwert pro Handelstag',
  'performance.medianActive': 'Median pro Handelstag',
  'performance.hint.calendar': 'auf {days} Tage',
  'performance.hint.active': 'auf {days} Tage mit Verkäufen',
  'performance.hint.activeNet': 'auf {days} Tage mit Verkäufen oder Kosten',
  'performance.empty': 'In diesem Zeitraum wurde kein Verkauf geschlossen.',
  'performance.column.window': 'Zeitraum',
  'performance.column.sales': 'Verkäufe',
  'performance.column.winShare': 'Im Gewinn',
  'performance.column.profit': 'Ergebnis',
  'performance.column.meanCalendar': 'Mittelwert pro Kalendertag',
  'performance.column.meanActive': 'Mittelwert pro Handelstag',
  'performance.column.medianActive': 'Median pro Handelstag',

  'execution.heading': 'Handelsqualität',
  'execution.caution':
    'Ein Verkauf ist ein Symbol an einem Tag: gemeinsam geschlossene Posten zählen einmal. Gemessen wird allein das Handelsergebnis — Dividenden, Zinsen und Belastungen bleiben außen vor.',
  'execution.profitFactor': 'Profitfaktor',
  'execution.profitFactorHint':
    'Kein Verkauf wurde mit Verlust geschlossen, daher hat das Verhältnis keinen Wert.',
  'execution.meanProfit': 'Mittleres Ergebnis',
  'execution.column.side': 'Ausgang',
  'execution.column.sales': 'Verkäufe',
  'execution.column.meanProfit': 'Mittleres Ergebnis',
  'execution.column.meanDays': 'Ø Haltedauer',
  'execution.winners': 'Im Gewinn',
  'execution.losers': 'Im Verlust',
  'execution.byHolding': 'Nach Haltedauer',
  'execution.column.bucket': 'Spanne',
  'execution.column.profit': 'Ergebnis',
  'execution.column.yield': 'Rendite auf Einstand',
  'execution.bucket.UNDER_1M': 'Unter 1 Monat',
  'execution.bucket.M1_TO_M6': '1 bis 6 Monate',
  'execution.bucket.M6_TO_M12': '6 bis 12 Monate',
  'execution.bucket.OVER_1Y': 'Über 1 Jahr',
  'execution.profitConcentration':
    'Die drei besten Verkäufe tragen {percent} des Gesamtgewinns.',
  'execution.concentration': 'Die drei schlechtesten Verkäufe tragen {percent} des Gesamtverlusts.',

  'chart.showTable': 'Daten als Tabelle anzeigen',
  'chart.hideTable': 'Tabelle ausblenden',
  'chart.tableLabel': 'Diagrammdaten: {title}',
  'chart.empty': 'Nichts darzustellen.',
  'chart.legendHint': 'Auf einen Eintrag klicken, um diese Reihe auszublenden.',

  'print.generatedOn': 'Bericht erstellt am {date}',
  'print.source': 'Trade Republic Analyzer — lokal berechnet, nichts wurde irgendwohin gesendet.',

  'limits.heading': 'Erklärte Einschränkungen',
  'limits.lossCarryforward':
    'Dies ist keine Steuerberechnung. Verlustvorträge und deren Verrechnung werden nicht behandelt.',
  'limits.unrealized':
    'Keine nicht realisierten Gewinne: offene Positionen werden zum Einstandswert bewertet, weil der Export keine aktuellen Kurse enthält.',
  'limits.brokerOnly': 'Das einzige unterstützte Format ist der Export von Trade Republic.',
  'limits.currency':
    'Buchungen in anderen Währungen als dem Euro wurden nicht geprüft: enthält Ihre Datei solche, prüfen Sie die Summen.',
  'limits.marketPrices':
    'Ohne Marktkurse bleiben Volatilität, Sharpe, Sortino, Beta, VaR, Kapital-Drawdown, nicht realisierte Gewinne und Korrelationen unerreichbar: der Kontoauszug erfasst die Transaktionen, nicht die Kurse.',

  'footer.privacy': 'Wie mit Ihren Daten umgegangen wird',
  'footer.sourceCode': 'Quellcode',
  'footer.disclaimerHeading': 'Haftungsausschluss',
  'footer.notAffiliated':
    'Ein unabhängiges Werkzeug, weder mit Trade Republic verbunden noch von Trade Republic unterstützt. Marken gehören ihren jeweiligen Inhabern.',
  'footer.notAdvice':
    'Die Ergebnisse sind keine Finanz- oder Steuerberatung und ersetzen nicht die offiziellen Dokumente Ihres Brokers: prüfen Sie die Zahlen immer anhand des ursprünglichen Kontoauszugs.',
  'footer.noWarranty':
    'Freie Software unter der MIT-Lizenz, ohne jegliche Gewährleistung. Die Nutzung erfolgt auf eigenes Risiko.',
  'footer.copyright': '© 2026 Enrico Schintu',
  'footer.authorSite': 'enricoschintu.com',
  'print.legal':
    'Keine Finanz- oder Steuerberatung. Unabhängiges Werkzeug, nicht mit Trade Republic verbunden. © 2026 Enrico Schintu, MIT-Lizenz, ohne Gewährleistung.',
};
