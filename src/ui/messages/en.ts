/** The English catalogue. */

import type { Messages } from './it';

export const en: Messages = {
  'app.title': 'Trade Republic Analyzer',
  'app.tagline': 'Your statement never leaves this browser.',
  'app.skipToReport': 'Skip to report',

  'nav.language': 'Language',
  'nav.theme': 'Theme',
  'nav.theme.toLight': 'Switch to light',
  'nav.theme.toDark': 'Switch to dark',
  'nav.print': 'Print or save as PDF',
  'nav.reset': 'Analyse another file',
  'nav.outline': 'Sections',
  'nav.outline.label': 'Report sections',

  'upload.heading': 'Load your Trade Republic export',
  'upload.instruction': 'Drop the CSV file here, or pick it from your computer.',
  'upload.button': 'Choose CSV file',
  'upload.dropActive': 'Release the file to analyse it',
  'upload.privacyHeading': 'The file stays on your computer',
  'upload.privacyBody':
    'There is no cloud and no server. The CSV is read and analysed by the browser in front of you, and never leaves this machine.',
  'upload.privacyFact.noUpload.term': 'Nothing is sent',
  'upload.privacyFact.noUpload.detail':
    'The file is not uploaded anywhere, not to a server of ours and not to anyone else’s. The browser Network tab stays empty.',
  'upload.privacyFact.noStorage.term': 'Nothing is stored',
  'upload.privacyFact.noStorage.detail':
    'None of your file is saved. The browser keeps three preferences only: language, theme and the state of the section rail. Reload the page and the report is gone.',
  'upload.privacyFact.offline.term': 'Works offline',
  'upload.privacyFact.offline.detail':
    'Disconnect from the network, reload the page and load the file again: the analysis still runs, because it has nobody to ask.',
  'upload.formatHint':
    'You need the transactions CSV exported from Trade Republic, with its original column headers.',
  'upload.reading': 'Reading the file…',

  'error.heading': 'The file could not be read',
  'error.MISSING_COLUMNS':
    '{count} required column(s) are missing: {columns}. This does not look like a Trade Republic transactions export.',
  'error.MALFORMED_ROW':
    'Row {line} could not be read. Its content is not shown, because it may contain personal data.',
  'error.NO_ROWS': 'The file contains no operations.',
  'error.NOT_CSV': 'The selected file is not a CSV.',
  'error.UNKNOWN': 'The file was not recognised.',
  'error.retry': 'Try another file',

  'banner.unclassified.heading': 'Unrecognised operations',
  'banner.unclassified.body':
    '{count} operation(s) carry a type the engine does not know ({types}), totalling {amount}. That amount is deliberately kept OUT of the profit: you will find it in the reconciliation difference below. Please report these types so they can be added.',
  'banner.anomalies.heading': 'Anomalies found in the data',
  'anomaly.UNCOVERED_SALE': '{symbol}: sold {quantity} units with no holdings to cover.',
  'anomaly.UNMATCHED_FREE_LOT_CANCELLATION':
    '{symbol}: bonus cancellation of {quantity} units with no matching free lot.',

  'summary.heading': 'Summary',
  'summary.netProfit': 'Net profit',
  'summary.netProfit.hint': 'Trading and income, after fees and taxes.',
  'summary.tradingProfit': 'Trading profit',
  'summary.tradingProfit.hint': 'Closed positions only, matched FIFO.',
  'summary.totalCharges': 'Total charges',
  'summary.totalCharges.hint': 'Fees and taxes withheld.',
  'summary.netCapital': 'Net capital paid in',
  'summary.netCapital.hint': 'Deposits minus withdrawals.',
  'summary.return': 'Return on capital',
  'summary.return.hint': 'Whole period, {from} to {to}. Not annualised.',
  'summary.returnUnavailable': 'Return not available: net capital paid in is zero.',
  'summary.operationsRead': '{count} operations read',
  'summary.period': 'Period from {from} to {to}',

  'trend.heading': 'Cumulative trend',
  'trend.description': 'Net profit and trading profit, day by day, on a single axis.',
  'trend.series.net': 'Net profit',
  'trend.series.trading': 'Trading profit',
  'trend.column.date': 'Date',
  'trend.column.dayProfit': 'Change on the day',
  'trend.drawdown': 'Largest fall',
  'trend.drawdown.hint': 'From the previous peak, bottoming out on {date}.',
  'trend.worstDay': 'Worst day',
  'trend.worstDay.hint': 'Lost on {date}.',

  'composition.heading': 'How the result is made up',
  'composition.grossProfit': 'Gross profit',
  'composition.income': 'Income by type',
  'composition.incomeNote': 'Already included in the gross profit above; this is just the breakdown.',
  'composition.fees': 'Fees',
  'composition.costDrag': 'Share of gross profit',
  'composition.taxes': 'Taxes by type',
  'composition.netProfit': 'Net profit',
  'composition.column.item': 'Item',
  'composition.column.amount': 'Amount',
  'composition.none': 'Nothing recorded.',

  'excluded.heading': 'Movements excluded from the profit',
  'excluded.note':
    'These move cash but are neither a gain nor a loss: paying money in does not produce a profit, and a position still open has no result until it is sold.',
  'excluded.deposits': 'Deposits',
  'excluded.withdrawals': 'Withdrawals',
  'excluded.netCapital': 'Net capital paid in',
  'excluded.cardSpending': 'Card spending',
  'excluded.openPositionsCost': 'Carrying cost of open positions',

  'reconciliation.heading': 'Cash reconciliation',
  'reconciliation.description':
    'The profit is recomputed from cash movements alone, with no FIFO. Two independent routes to the same number: if they disagree, an operation type is classified wrongly.',
  'reconciliation.expected': 'Profit implied by cash flows',
  'reconciliation.actual': 'Net profit as calculated',
  'reconciliation.difference': 'Difference',
  'reconciliation.balanced': 'Reconciliation balanced',
  'reconciliation.unbalanced': 'Reconciliation NOT balanced',
  'reconciliation.unbalancedHint':
    'A non-zero difference means operations are unclassified or misclassified. Do not trust the profit until it is resolved.',

  'securities.heading': 'Detail by security',
  'securities.description':
    'Positions with at least one completed sale. The yield is measured against the cost of the lots sold, not against the capital paid in.',
  'securities.column.symbol': 'Symbol',
  'securities.column.name': 'Name',
  'securities.column.proceeds': 'Proceeds',
  'securities.column.cost': 'Cost',
  'securities.column.profit': 'Profit',
  'securities.column.yield': 'Yield on cost',
  'securities.column.lots': 'Lots closed',
  'securities.column.meanDays': 'Mean holding',
  'securities.none': 'No closed positions.',

  'openPositions.heading': 'Positions still open',
  'openPositions.note':
    'Valued at carrying cost. The export carries no current prices, so unrealized gains cannot be computed.',
  'openPositions.column.quantity': 'Quantity',
  'openPositions.column.cost': 'Carrying cost',
  'openPositions.none': 'No open positions.',

  'windows.heading': 'Performance by time window',
  'windows.anchorNote':
    'Windows are anchored to the last date present in the file ({anchor}), not to today: an older export would otherwise show every window empty.',
  'windows.column.window': 'Window',
  'windows.column.range': 'Period',
  'windows.column.profit': 'Profit',
  'windows.column.buys': 'Buys',
  'windows.column.sells': 'Sells',
  'windows.column.netDeposits': 'Net deposits',
  'windows.column.operations': 'Operations',
  'windows.noMovement': 'No profit movement',
  'windows.composition.heading': 'What each window’s profit is made of',
  'windows.composition.note':
    'The windows overlap: every row contains the shorter ones, so the rows do not add up to one another.',
  'window.ALL': 'All time',
  'window.1Y': '1 year',
  'window.6M': '6 months',
  'window.3M': '3 months',
  'window.1M': '1 month',
  'window.1W': '1 week',
  'window.1D': '1 day',

  'monthly.heading': 'Month by month',
  'monthlyProfit.heading': 'Profit month by month',
  'monthlyProfit.description':
    'One row per year, one column per month, with the totals down the right and along the bottom. Colour gives the sign, intensity how much it weighs against the largest month. Amounts are abbreviated: hover a cell to read one in full, or open the table below. Click a cell and the chart opens on that month, split into the parts that made it.',
  'monthlyProfit.legend.positive': 'Adds',
  'monthlyProfit.legend.negative': 'Takes away',
  'monthlyProfit.back': 'Back to all months',
  'monthlyProfit.parts': 'What {month} is made of',
  'monthlyProfit.total': 'Total',
  'monthlyProfit.allYears': '{month}, all years',
  'monthlyProfit.column.part': 'Component',
  'monthlyProfit.column.amount': 'Amount',
  'monthlyProfit.column.weight': 'Weight in the drawing',
  'monthlyProfit.empty': 'Nothing moved in this month.',

  'monthlyComposition.heading': 'What each month’s profit is made of',
  'monthlyComposition.description':
    'The same figures as the chart above, split by where they came from. Above zero is what added to the profit, below it the charges that took from it: each column’s algebraic sum is the month’s profit.',
  'profitPart.trading': 'Trading',
  'profitPart.dividends': 'Dividends',
  'profitPart.interest': 'Interest',
  'profitPart.otherIncome': 'Other income',
  'profitPart.charges': 'Charges',

  'monthlyTransactions.heading': 'Trade rows per month',
  'monthlyTransactions.description':
    'A count of BUY and SELL rows. A partially filled order produces several rows, so this number is higher than the number of orders you placed.',
  'monthlyTransactions.series': 'BUY and SELL rows',
  'monthly.column.month': 'Month',
  'monthly.column.profit': 'Profit',
  'monthly.column.transactions': 'BUY and SELL rows',

  'capital.heading': 'Capital and return',
  'capitalInvested.heading': 'Average capital invested',
  'capitalInvested.description':
    'The cost of the open positions, measured at the close of each day and averaged over the days of the month, weekends included. The first and last months are partial: the days column says how many days the average was taken over.',
  'capitalInvested.series': 'Average capital invested',
  'capital.column.month': 'Month',
  'capital.column.capital': 'Average capital',
  'capital.column.days': 'Days',
  'capitalProfit.heading': 'What that capital produced',
  'capitalProfit.description':
    'Realized trading and dividends for the same month, on the same columns as the chart above: read a month vertically — how much capital was at risk, and how much it returned.',
  'capitalProfit.series': 'Profit for the month',
  'capital.column.profit': 'Profit',
  'capital.column.return': 'Return',
  'capital.caution':
    'Capital is at cost, not at market prices, and the profit here is trading plus dividends only: interest on cash, other income and account charges stay out, because the invested capital did not produce them. That is why this figure differs from the one in Month by month. Monthly returns do not add up: they have different denominators.',

  'assetClass.heading': 'Profit by asset class',
  'assetClass.column.assetClass': 'Asset class',
  'assetClass.column.profit': 'Profit',
  'assetClass.UNCLASSIFIED': 'Not stated',

  'winRate.heading': 'Share of positions in profit',
  'winRate.caution':
    'This counts securities, not individual sales: the percentages further down are measured on the sale, and a different denominator gives a different number. Read it together with the average win and average loss: a high rate with losses bigger than the wins is still a negative result.',
  'winRate.closed': 'Closed positions',
  'winRate.wins': 'In profit',
  'winRate.losses': 'At a loss',
  'winRate.breakEven': 'Break-even',
  'winRate.rate': 'Share in profit',
  'winRate.averageWin': 'Average win',
  'winRate.averageLoss': 'Average loss',

  'topFlop.heading': 'Best and worst',
  'topFlop.top': 'Best',
  'topFlop.flop': 'Worst',

  'holding.heading': 'Holding duration',
  'holding.note':
    'Measured on every lot sold. The median sits next to the mean because a few very long holds pull the mean along.',
  'holding.mean': 'Mean duration',
  'holding.median': 'Median duration',
  'holding.byClass': 'By asset class',
  'holding.column.assetClass': 'Asset class',
  'holding.column.meanDays': 'Mean duration',
  'holding.column.closures': 'Lots sold',
  'holding.days': '{count} days',
  'holding.day': '{count} day',

  'performance.heading': 'Performance',
  'performance.caution':
    'Closed sales only: dividends, interest and charges are not in these figures.',
  'performance.cautionNet':
    'Closed sales only, less every fee and tax dated inside the period — including those on purchases and dividends, which none of these sales caused. Dividends and interest received stay out.',
  'performance.from': 'From',
  'performance.to': 'To',
  'performance.basis': 'Net of fees and taxes',
  'performance.range': 'Chosen interval: {from} to {to}.',
  'performance.rangeInvalid': 'The start date falls after the end date.',
  'performance.withheld': 'Charges subtracted over the period: {amount}.',
  'performance.gauge.title': 'Sales in profit',
  'performance.gauge.wins': 'In profit',
  'performance.gauge.losses': 'At a loss',
  'performance.gauge.breakEven': 'Break-even',
  'performance.gauge.count': '{wins} of {total}',
  'performance.meanCalendar': 'Mean per calendar day',
  'performance.meanActive': 'Mean per trading day',
  'performance.medianActive': 'Median per trading day',
  'performance.hint.calendar': 'over {days} days',
  'performance.hint.active': 'over {days} days with sales',
  'performance.hint.activeNet': 'over {days} days with sales or charges',
  'performance.empty': 'No sale closed in this period.',
  'performance.column.window': 'Period',
  'performance.column.sales': 'Sales',
  'performance.column.winShare': 'In profit',
  'performance.column.profit': 'Result',
  'performance.column.meanCalendar': 'Mean per calendar day',
  'performance.column.meanActive': 'Mean per trading day',
  'performance.column.medianActive': 'Median per trading day',

  'execution.heading': 'Trading quality',
  'execution.caution':
    'A sale is one symbol on one day: lots closed together are counted once. This measures the trading result alone — dividends, interest and charges are left out.',
  'execution.profitFactor': 'Profit factor',
  'execution.profitFactorHint': 'No sale closed at a loss, so the ratio has no value.',
  'execution.meanProfit': 'Mean result',
  'execution.column.side': 'Outcome',
  'execution.column.sales': 'Sales',
  'execution.column.meanProfit': 'Mean result',
  'execution.column.meanDays': 'Mean holding',
  'execution.winners': 'In profit',
  'execution.losers': 'At a loss',
  'execution.byHolding': 'By holding period',
  'execution.column.bucket': 'Band',
  'execution.column.profit': 'Result',
  'execution.column.yield': 'Yield on cost',
  'execution.bucket.UNDER_1M': 'Under 1 month',
  'execution.bucket.M1_TO_M6': '1 to 6 months',
  'execution.bucket.M6_TO_M12': '6 to 12 months',
  'execution.bucket.OVER_1Y': 'Over 1 year',
  'execution.profitConcentration': 'The three best sales carry {percent} of the total gain.',
  'execution.concentration': 'The three worst sales carry {percent} of the total loss.',

  'chart.showTable': 'Show the data as a table',
  'chart.hideTable': 'Hide the table',
  'chart.tableLabel': 'Chart data: {title}',
  'chart.empty': 'Nothing to plot.',
  'chart.legendHint': 'Click an entry to hide that series.',

  'print.generatedOn': 'Report generated on {date}',
  'print.source': 'Trade Republic Analyzer — computed locally, nothing was sent anywhere.',

  'limits.heading': 'Declared limits',
  'limits.lossCarryforward':
    'This is not a tax calculation. Carried-forward losses and their offsetting are not handled.',
  'limits.unrealized':
    'No unrealized gains: open positions are valued at carrying cost, because the export carries no current prices.',
  'limits.brokerOnly': 'The only supported format is the Trade Republic export.',
  'limits.currency':
    'Operations in currencies other than the euro have not been verified: if your file has any, check the totals.',
  'limits.marketPrices':
    'Without market prices, volatility, Sharpe, Sortino, beta, VaR, capital drawdown, unrealised gains and correlations stay out of reach: the statement records transactions, not quotes.',

  'footer.privacy': 'How your data is handled',
  'footer.sourceCode': 'Source code',
  'footer.disclaimerHeading': 'Disclaimer',
  'footer.notAffiliated':
    'An independent tool, not affiliated with or endorsed by Trade Republic. Trademarks belong to their respective owners.',
  'footer.notAdvice':
    'The results are not financial or tax advice and do not replace your broker’s official documents: always check the figures against the original statement.',
  'footer.noWarranty':
    'Free software under the MIT licence, with no warranty of any kind. Use it at your own risk.',
  'footer.copyright': '© 2026 Enrico Schintu',
  'footer.authorSite': 'enricoschintu.com',
  'print.legal':
    'Not financial or tax advice. Independent tool, not affiliated with Trade Republic. © 2026 Enrico Schintu, MIT licence, no warranty.',
};
