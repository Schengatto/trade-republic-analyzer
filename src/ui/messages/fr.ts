/** The French catalogue. */

import type { Messages } from './it';

export const fr: Messages = {
  'app.title': 'Trade Republic Analyzer',
  'app.tagline': 'Votre relevé ne quitte jamais ce navigateur.',
  'app.skipToReport': 'Aller au rapport',

  'nav.language': 'Langue',
  'nav.theme': 'Thème',
  'nav.theme.toLight': 'Passer en clair',
  'nav.theme.toDark': 'Passer en sombre',
  'nav.print': 'Imprimer ou enregistrer en PDF',
  'nav.reset': 'Analyser un autre fichier',
  'nav.outline': 'Sections',
  'nav.outline.label': 'Sections du rapport',

  'upload.heading': 'Chargez votre export Trade Republic',
  'upload.instruction': 'Déposez ici le fichier CSV, ou sélectionnez-le sur votre ordinateur.',
  'upload.button': 'Choisir le fichier CSV',
  'upload.dropActive': 'Relâchez le fichier pour l’analyser',
  'upload.privacyHeading': 'Le fichier reste sur votre ordinateur',
  'upload.privacyBody':
    'Il n’y a ni cloud ni serveur. Le CSV est lu et analysé par le navigateur que vous avez sous les yeux, et ne quitte jamais cette machine.',
  'upload.privacyFact.noUpload.term': 'Aucun envoi',
  'upload.privacyFact.noUpload.detail':
    'Le fichier n’est téléversé nulle part, ni sur un serveur à nous ni sur celui de quiconque. L’onglet Réseau du navigateur reste vide.',
  'upload.privacyFact.noStorage.term': 'Aucun stockage',
  'upload.privacyFact.noStorage.detail':
    'Rien de votre fichier n’est enregistré. Le navigateur ne conserve que trois préférences : la langue, le thème et l’état de la barre des sections. Rechargez la page et le rapport disparaît.',
  'upload.privacyFact.offline.term': 'Fonctionne hors ligne',
  'upload.privacyFact.offline.detail':
    'Coupez le réseau, rechargez la page et chargez de nouveau le fichier : l’analyse fonctionne quand même, parce qu’elle n’a personne à interroger.',
  'upload.formatHint':
    'Il vous faut le CSV des opérations exporté depuis Trade Republic, avec ses en-têtes de colonnes d’origine.',
  'upload.reading': 'Lecture du fichier…',

  'error.heading': 'Le fichier n’a pas pu être lu',
  'error.MISSING_COLUMNS':
    '{count} colonne(s) obligatoire(s) manquante(s) : {columns}. Cela ne ressemble pas à un export des opérations Trade Republic.',
  'error.MALFORMED_ROW':
    'La ligne {line} n’a pas pu être lue. Son contenu n’est pas affiché, car il peut contenir des données personnelles.',
  'error.NO_ROWS': 'Le fichier ne contient aucune opération.',
  'error.NOT_CSV': 'Le fichier sélectionné n’est pas un CSV.',
  'error.UNKNOWN': 'Le fichier n’a pas été reconnu.',
  'error.retry': 'Essayer un autre fichier',

  'banner.unclassified.heading': 'Opérations non reconnues',
  'banner.unclassified.body':
    '{count} opération(s) portent un type que le moteur ne connaît pas ({types}), pour un montant total de {amount}. Ce montant est délibérément tenu HORS du profit : vous le retrouverez dans l’écart de rapprochement ci-dessous. Merci de signaler ces types afin qu’ils puissent être ajoutés.',
  'banner.anomalies.heading': 'Anomalies détectées dans les données',
  'anomaly.UNCOVERED_SALE':
    '{symbol} : {quantity} unités vendues sans titres en portefeuille pour les couvrir.',
  'anomaly.UNMATCHED_FREE_LOT_CANCELLATION':
    '{symbol} : annulation de {quantity} unités gratuites sans lot gratuit correspondant.',

  'summary.heading': 'Synthèse',
  'summary.netProfit': 'Profit net',
  'summary.netProfit.hint': 'Négociation et revenus, après frais et impôts.',
  'summary.tradingProfit': 'Profit de négociation',
  'summary.tradingProfit.hint': 'Positions clôturées uniquement, appariées selon la méthode FIFO.',
  'summary.totalCharges': 'Charges totales',
  'summary.totalCharges.hint': 'Frais et impôts retenus.',
  'summary.netCapital': 'Capital net versé',
  'summary.netCapital.hint': 'Versements moins retraits.',
  'summary.return': 'Rendement du capital',
  'summary.return.hint': 'Période entière, du {from} au {to}. Non annualisé.',
  'summary.returnUnavailable': 'Rendement indisponible : le capital net versé est nul.',
  'summary.operationsRead': '{count} opérations lues',
  'summary.period': 'Période du {from} au {to}',

  'trend.heading': 'Évolution cumulée',
  'trend.description':
    'Profit net et profit de négociation, jour après jour, sur un même axe.',
  'trend.series.net': 'Profit net',
  'trend.series.trading': 'Profit de négociation',
  'trend.column.date': 'Date',
  'trend.column.dayProfit': 'Variation du jour',
  'trend.drawdown': 'Plus forte baisse',
  'trend.drawdown.hint': 'Depuis le sommet précédent, point bas le {date}.',
  'trend.worstDay': 'Pire journée',
  'trend.worstDay.hint': 'Perte enregistrée le {date}.',

  'composition.heading': 'Composition du résultat',
  'composition.grossProfit': 'Profit brut',
  'composition.income': 'Revenus par type',
  'composition.incomeNote':
    'Déjà compris dans le profit brut ci-dessus ; il ne s’agit ici que du détail.',
  'composition.fees': 'Frais',
  'composition.costDrag': 'Part du profit brut',
  'composition.taxes': 'Impôts par type',
  'composition.netProfit': 'Profit net',
  'composition.column.item': 'Poste',
  'composition.column.amount': 'Montant',
  'composition.none': 'Aucun élément enregistré.',

  'excluded.heading': 'Mouvements exclus du profit',
  'excluded.note':
    'Ces mouvements déplacent des liquidités mais ne sont ni un gain ni une perte : verser de l’argent ne produit pas de profit, et une position encore ouverte n’a pas de résultat tant qu’elle n’est pas vendue.',
  'excluded.deposits': 'Versements',
  'excluded.withdrawals': 'Retraits',
  'excluded.netCapital': 'Capital net versé',
  'excluded.cardSpending': 'Dépenses par carte',
  'excluded.openPositionsCost': 'Prix de revient des positions ouvertes',

  'reconciliation.heading': 'Rapprochement de trésorerie',
  'reconciliation.description':
    'Le profit est recalculé à partir des seuls mouvements de trésorerie, sans FIFO. Deux chemins indépendants vers le même nombre : s’ils divergent, un type d’opération est mal classé.',
  'reconciliation.expected': 'Profit implicite des flux de trésorerie',
  'reconciliation.actual': 'Profit net calculé',
  'reconciliation.difference': 'Écart',
  'reconciliation.balanced': 'Rapprochement équilibré',
  'reconciliation.unbalanced': 'Rapprochement NON équilibré',
  'reconciliation.unbalancedHint':
    'Un écart différent de zéro signifie que des opérations ne sont pas classées ou sont mal classées. Ne considérez pas le profit comme fiable tant qu’il n’est pas résolu.',

  'securities.heading': 'Détail par titre',
  'securities.description':
    'Uniquement les positions comportant au moins une vente réalisée. Le rendement est mesuré sur le coût des lots vendus, et non sur le capital versé.',
  'securities.column.symbol': 'Symbole',
  'securities.column.name': 'Nom',
  'securities.column.proceeds': 'Produit de la vente',
  'securities.column.cost': 'Coût',
  'securities.column.profit': 'Profit',
  'securities.column.yield': 'Rendement sur coût',
  'securities.column.lots': 'Lots clôturés',
  'securities.column.meanDays': 'Détention moyenne',
  'securities.none': 'Aucune position clôturée.',

  'openPositions.heading': 'Positions encore ouvertes',
  'openPositions.note':
    'Valorisées à leur prix de revient. L’export ne contient pas de cours actuels, les plus-values latentes ne peuvent donc pas être calculées.',
  'openPositions.column.quantity': 'Quantité',
  'openPositions.column.cost': 'Prix de revient',
  'openPositions.none': 'Aucune position ouverte.',

  'windows.heading': 'Performance par fenêtre temporelle',
  'windows.anchorNote':
    'Les fenêtres sont ancrées à la dernière date présente dans le fichier ({anchor}), et non à aujourd’hui : un export ancien afficherait sinon toutes les fenêtres vides.',
  'windows.column.window': 'Fenêtre',
  'windows.column.range': 'Période',
  'windows.column.profit': 'Profit',
  'windows.column.buys': 'Achats',
  'windows.column.sells': 'Ventes',
  'windows.column.netDeposits': 'Versements nets',
  'windows.column.operations': 'Opérations',
  'windows.noMovement': 'Aucun mouvement de profit',
  'windows.composition.heading': 'De quoi est fait le profit de chaque fenêtre',
  'windows.composition.note':
    'Les fenêtres se chevauchent : chaque ligne contient les plus courtes, les lignes ne s’additionnent donc pas entre elles.',
  'window.ALL': 'Depuis le début',
  'window.1Y': '1 an',
  'window.6M': '6 mois',
  'window.3M': '3 mois',
  'window.1M': '1 mois',
  'window.1W': '1 semaine',
  'window.1D': '1 jour',

  'monthly.heading': 'Mois par mois',
  'monthlyProfit.heading': 'Profit mois par mois',
  'monthlyProfit.description':
    'Une ligne par année, une colonne par mois, avec les totaux à droite et en bas. La couleur donne le signe, l’intensité le poids par rapport au mois le plus important. Les montants sont abrégés : survolez une cellule pour en lire un en entier, ou ouvrez le tableau ci-dessous. Cliquez sur une cellule et le graphique s’ouvre sur ce mois, décomposé dans les parties qui l’ont formé.',
  'monthlyProfit.legend.positive': 'Ajoute',
  'monthlyProfit.legend.negative': 'Retire',
  'monthlyProfit.back': 'Revenir à tous les mois',
  'monthlyProfit.parts': 'De quoi est fait {month}',
  'monthlyProfit.total': 'Total',
  'monthlyProfit.allYears': '{month}, toutes années confondues',
  'monthlyProfit.column.part': 'Composante',
  'monthlyProfit.column.amount': 'Montant',
  'monthlyProfit.column.weight': 'Poids dans le dessin',
  'monthlyProfit.empty': 'Rien n’a bougé ce mois-ci.',

  'monthlyComposition.heading': 'De quoi est fait le profit de chaque mois',
  'monthlyComposition.description':
    'Les mêmes chiffres que le graphique ci-dessus, répartis selon leur provenance. Au-dessus de zéro ce qui a ajouté du profit, en dessous les charges qui en ont retiré : la somme algébrique de chaque colonne est le profit du mois.',
  'profitPart.trading': 'Négociation',
  'profitPart.dividends': 'Dividendes',
  'profitPart.interest': 'Intérêts',
  'profitPart.otherIncome': 'Autres revenus',
  'profitPart.charges': 'Charges',

  'monthlyTransactions.heading': 'Lignes de négociation par mois',
  'monthlyTransactions.description':
    'Un décompte des lignes BUY et SELL. Un ordre exécuté partiellement produit plusieurs lignes, ce nombre est donc supérieur au nombre d’ordres que vous avez passés.',
  'monthlyTransactions.series': 'Lignes BUY et SELL',
  'monthly.column.month': 'Mois',
  'monthly.column.profit': 'Profit',
  'monthly.column.transactions': 'Lignes BUY et SELL',

  'capital.heading': 'Capital et rendement',
  'capitalInvested.heading': 'Capital moyen investi',
  'capitalInvested.description':
    'Le coût des positions ouvertes, mesuré à la clôture de chaque journée et moyenné sur les jours du mois, week-ends compris. Le premier et le dernier mois sont partiels : la colonne des jours indique sur combien de jours la moyenne a été prise.',
  'capitalInvested.series': 'Capital moyen investi',
  'capital.column.month': 'Mois',
  'capital.column.capital': 'Capital moyen',
  'capital.column.days': 'Jours',
  'capitalProfit.heading': 'Ce que ce capital a produit',
  'capitalProfit.description':
    'Résultat de négociation réalisé et dividendes du même mois, sur les mêmes colonnes que le graphique ci-dessus : un mois se lit à la verticale, combien de capital était exposé et combien il a rapporté.',
  'capitalProfit.series': 'Résultat du mois',
  'capital.column.profit': 'Résultat',
  'capital.column.return': 'Rendement',
  'capital.caution':
    'Le capital est au coût d’acquisition, pas aux prix de marché, et le résultat ici est uniquement négociation plus dividendes : les intérêts sur les liquidités, les autres revenus et les frais de compte restent en dehors, car le capital investi ne les a pas produits. C’est pourquoi ce chiffre diffère de celui de Mois par mois. Les rendements mensuels ne s’additionnent pas : leurs dénominateurs diffèrent.',

  'assetClass.heading': 'Profit par classe d’actifs',
  'assetClass.column.assetClass': 'Classe d’actifs',
  'assetClass.column.profit': 'Profit',
  'assetClass.UNCLASSIFIED': 'Non précisée',

  'winRate.heading': 'Part des positions en gain',
  'winRate.caution':
    'On compte ici des titres, pas des ventes : les pourcentages plus bas sont mesurés sur la vente, et un dénominateur différent donne un autre nombre. À lire avec le gain moyen et la perte moyenne : un taux élevé assorti de pertes plus grandes que les gains reste un résultat négatif.',
  'winRate.closed': 'Positions clôturées',
  'winRate.wins': 'En gain',
  'winRate.losses': 'En perte',
  'winRate.breakEven': 'À l’équilibre',
  'winRate.rate': 'Part en gain',
  'winRate.averageWin': 'Gain moyen',
  'winRate.averageLoss': 'Perte moyenne',

  'topFlop.heading': 'Meilleurs et pires',
  'topFlop.top': 'Meilleurs',
  'topFlop.flop': 'Pires',

  'holding.heading': 'Durée de détention',
  'holding.note':
    'Mesurée sur chaque lot vendu. La médiane figure à côté de la moyenne parce que quelques détentions très longues tirent la moyenne avec elles.',
  'holding.mean': 'Durée moyenne',
  'holding.median': 'Durée médiane',
  'holding.byClass': 'Par classe d’actifs',
  'holding.column.assetClass': 'Classe d’actifs',
  'holding.column.meanDays': 'Durée moyenne',
  'holding.column.closures': 'Lots vendus',
  'holding.days': '{count} jours',
  'holding.day': '{count} jour',

  'performance.heading': 'Performance',
  'performance.caution':
    'Uniquement les ventes clôturées : les dividendes, les intérêts et les frais n’entrent pas dans ces chiffres.',
  'performance.cautionNet':
    'Uniquement les ventes clôturées, moins tous les frais et impôts datés dans la période — y compris ceux des achats et des dividendes, qu’aucune de ces ventes n’a causés. Les dividendes et intérêts perçus, eux, n’entrent pas.',
  'performance.from': 'Du',
  'performance.to': 'Au',
  'performance.basis': 'Net des frais et impôts',
  'performance.range': 'Intervalle choisi : du {from} au {to}.',
  'performance.rangeInvalid': 'La date de début est postérieure à la date de fin.',
  'performance.withheld': 'Frais soustraits sur la période : {amount}.',
  'performance.gauge.title': 'Ventes en gain',
  'performance.gauge.wins': 'En gain',
  'performance.gauge.losses': 'En perte',
  'performance.gauge.breakEven': 'À l’équilibre',
  'performance.gauge.count': '{wins} sur {total}',
  'performance.meanCalendar': 'Moyenne par jour calendaire',
  'performance.meanActive': 'Moyenne par jour d’activité',
  'performance.medianActive': 'Médiane par jour d’activité',
  'performance.hint.calendar': 'sur {days} jours',
  'performance.hint.active': 'sur {days} jours avec ventes',
  'performance.hint.activeNet': 'sur {days} jours avec ventes ou frais',
  'performance.empty': 'Aucune vente clôturée sur cette période.',
  'performance.column.window': 'Période',
  'performance.column.sales': 'Ventes',
  'performance.column.winShare': 'En gain',
  'performance.column.profit': 'Résultat',
  'performance.column.meanCalendar': 'Moyenne par jour calendaire',
  'performance.column.meanActive': 'Moyenne par jour d’activité',
  'performance.column.medianActive': 'Médiane par jour d’activité',

  'execution.heading': 'Qualité de la négociation',
  'execution.caution':
    'Une vente correspond à un symbole sur une journée : les lots clôturés ensemble ne comptent qu’une fois. On ne mesure ici que le résultat de négociation — les dividendes, les intérêts et les charges n’entrent pas en compte.',
  'execution.profitFactor': 'Facteur de profit',
  'execution.profitFactorHint':
    'Aucune vente ne s’est clôturée en perte, le rapport n’a donc pas de valeur.',
  'execution.meanProfit': 'Résultat moyen',
  'execution.column.side': 'Issue',
  'execution.column.sales': 'Ventes',
  'execution.column.meanProfit': 'Résultat moyen',
  'execution.column.meanDays': 'Détention moyenne',
  'execution.winners': 'En gain',
  'execution.losers': 'En perte',
  'execution.byHolding': 'Par durée de détention',
  'execution.column.bucket': 'Tranche',
  'execution.column.profit': 'Résultat',
  'execution.column.yield': 'Rendement sur coût',
  'execution.bucket.UNDER_1M': 'Moins de 1 mois',
  'execution.bucket.M1_TO_M6': 'De 1 à 6 mois',
  'execution.bucket.M6_TO_M12': 'De 6 à 12 mois',
  'execution.bucket.OVER_1Y': 'Plus de 1 an',
  'execution.profitConcentration':
    'Les trois meilleures ventes représentent {percent} du gain total.',
  'execution.concentration':
    'Les trois pires ventes représentent {percent} de la perte totale.',

  'chart.showTable': 'Afficher les données en tableau',
  'chart.hideTable': 'Masquer le tableau',
  'chart.tableLabel': 'Données du graphique : {title}',
  'chart.empty': 'Aucune donnée à représenter.',
  'chart.legendHint': 'Cliquez sur une entrée pour masquer cette série.',

  'print.generatedOn': 'Rapport généré le {date}',
  'print.source': 'Trade Republic Analyzer — calcul local, aucune donnée envoyée.',

  'limits.heading': 'Limites déclarées',
  'limits.lossCarryforward':
    'Il ne s’agit pas d’un calcul fiscal. Les moins-values reportables et leur imputation ne sont pas gérées.',
  'limits.unrealized':
    'Aucune plus-value latente : les positions ouvertes sont valorisées à leur prix de revient, parce que l’export ne contient pas de cours actuels.',
  'limits.brokerOnly': 'Le seul format pris en charge est l’export Trade Republic.',
  'limits.currency':
    'Les opérations libellées dans une devise autre que l’euro n’ont pas été vérifiées : si votre fichier en contient, contrôlez les totaux.',
  'limits.marketPrices':
    'Sans cours de marché, la volatilité, les ratios de Sharpe et de Sortino, le bêta, la VaR, la perte maximale du capital, les plus-values latentes et les corrélations restent hors de portée : le relevé enregistre les opérations, pas les cotations.',

  'footer.privacy': 'Comment vos données sont traitées',
  'footer.sourceCode': 'Code source',
  'footer.disclaimerHeading': 'Avertissements',
  'footer.notAffiliated':
    'Un outil indépendant, ni affilié à Trade Republic ni approuvé par elle. Les marques citées appartiennent à leurs propriétaires respectifs.',
  'footer.notAdvice':
    'Les résultats ne constituent ni un conseil financier ni un conseil fiscal et ne remplacent pas les documents officiels de votre intermédiaire : vérifiez toujours les chiffres sur le relevé d’origine.',
  'footer.noWarranty':
    'Logiciel libre distribué sous licence MIT, sans aucune garantie. Vous l’utilisez à vos propres risques.',
  'footer.copyright': '© 2026 Enrico Schintu',
  'footer.authorSite': 'enricoschintu.com',
  'print.legal':
    'Ni conseil financier ni conseil fiscal. Outil indépendant, non affilié à Trade Republic. © 2026 Enrico Schintu, licence MIT, sans garantie.',
};
