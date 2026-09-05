/** The Portuguese catalogue. */

import type { Messages } from './it';

export const pt: Messages = {
  'app.title': 'Trade Republic Analyzer',
  'app.tagline': 'O seu extrato nunca sai deste navegador.',
  'app.skipToReport': 'Ir para o relatório',

  'nav.language': 'Idioma',
  'nav.theme': 'Tema',
  'nav.theme.toLight': 'Mudar para claro',
  'nav.theme.toDark': 'Mudar para escuro',
  'nav.print': 'Imprimir ou guardar em PDF',
  'nav.reset': 'Analisar outro ficheiro',
  'nav.outline': 'Secções',
  'nav.outline.label': 'Secções do relatório',

  'upload.heading': 'Carregue a sua exportação Trade Republic',
  'upload.instruction': 'Arraste o ficheiro CSV para aqui, ou selecione-o no seu computador.',
  'upload.button': 'Escolher ficheiro CSV',
  'upload.dropActive': 'Largue o ficheiro para o analisar',
  'upload.privacyHeading': 'O ficheiro fica no seu computador',
  'upload.privacyBody':
    'Não há nuvem nem servidor. O CSV é lido e analisado pelo navegador que tem à frente, e nunca sai desta máquina.',
  'upload.privacyFact.noUpload.term': 'Nada é enviado',
  'upload.privacyFact.noUpload.detail':
    'O ficheiro não é carregado para lado nenhum, nem para um servidor nosso nem para o de terceiros. O separador Rede do navegador fica vazio.',
  'upload.privacyFact.noStorage.term': 'Nada é guardado',
  'upload.privacyFact.noStorage.detail':
    'Nada do seu ficheiro é guardado. O navegador retém apenas três preferências: idioma, tema e o estado da barra de secções. Recarregue a página e o relatório desaparece.',
  'upload.privacyFact.offline.term': 'Funciona offline',
  'upload.privacyFact.offline.detail':
    'Desligue a rede, recarregue a página e carregue o ficheiro outra vez: a análise continua a correr, porque não tem a quem perguntar.',
  'upload.formatHint':
    'É preciso o CSV das transações exportado da Trade Republic, com os seus cabeçalhos de coluna originais.',
  'upload.reading': 'A ler o ficheiro…',

  'error.heading': 'Não foi possível ler o ficheiro',
  'error.MISSING_COLUMNS':
    'Faltam {count} coluna(s) obrigatória(s): {columns}. Isto não parece uma exportação de transações da Trade Republic.',
  'error.MALFORMED_ROW':
    'Não foi possível ler a linha {line}. O seu conteúdo não é mostrado, porque pode conter dados pessoais.',
  'error.NO_ROWS': 'O ficheiro não contém operações.',
  'error.NOT_CSV': 'O ficheiro selecionado não é um CSV.',
  'error.UNKNOWN': 'O ficheiro não foi reconhecido.',
  'error.retry': 'Tentar outro ficheiro',

  'banner.unclassified.heading': 'Operações não reconhecidas',
  'banner.unclassified.body':
    '{count} operação(ões) têm um tipo que o motor não conhece ({types}), num total de {amount}. Esse montante é deliberadamente mantido FORA do lucro: encontra-o na diferença de reconciliação mais abaixo. Comunique estes tipos para que possam ser acrescentados.',
  'banner.anomalies.heading': 'Anomalias detetadas nos dados',
  'anomaly.UNCOVERED_SALE':
    '{symbol}: vendidas {quantity} unidades sem títulos em carteira para as cobrir.',
  'anomaly.UNMATCHED_FREE_LOT_CANCELLATION':
    '{symbol}: anulação de {quantity} unidades gratuitas sem um lote gratuito correspondente.',

  'summary.heading': 'Resumo',
  'summary.netProfit': 'Lucro líquido',
  'summary.netProfit.hint': 'Negociação e rendimentos, depois de comissões e impostos.',
  'summary.tradingProfit': 'Lucro de negociação',
  'summary.tradingProfit.hint': 'Apenas posições fechadas, associadas pelo método FIFO.',
  'summary.totalCharges': 'Total de encargos',
  'summary.totalCharges.hint': 'Comissões e impostos retidos.',
  'summary.netCapital': 'Capital líquido depositado',
  'summary.netCapital.hint': 'Depósitos menos levantamentos.',
  'summary.return': 'Rendibilidade do capital',
  'summary.return.hint': 'Todo o período, de {from} a {to}. Sem anualizar.',
  'summary.returnUnavailable':
    'Rendibilidade indisponível: o capital líquido depositado é igual a zero.',
  'summary.operationsRead': '{count} operações lidas',
  'summary.period': 'Período de {from} a {to}',

  'trend.heading': 'Evolução acumulada',
  'trend.description': 'Lucro líquido e lucro de negociação, dia a dia, num único eixo.',
  'trend.series.net': 'Lucro líquido',
  'trend.series.trading': 'Lucro de negociação',
  'trend.column.date': 'Data',
  'trend.column.dayProfit': 'Variação do dia',
  'trend.drawdown': 'Maior queda',
  'trend.drawdown.hint': 'Desde o máximo anterior, com mínimo a {date}.',
  'trend.worstDay': 'Pior dia',
  'trend.worstDay.hint': 'Perda registada a {date}.',

  'composition.heading': 'Como se compõe o resultado',
  'composition.grossProfit': 'Lucro bruto',
  'composition.income': 'Rendimentos por tipo',
  'composition.incomeNote': 'Já incluídos no lucro bruto acima; isto é apenas o detalhe.',
  'composition.fees': 'Comissões',
  'composition.costDrag': 'Quota do lucro bruto',
  'composition.taxes': 'Impostos por tipo',
  'composition.netProfit': 'Lucro líquido',
  'composition.column.item': 'Rubrica',
  'composition.column.amount': 'Montante',
  'composition.none': 'Nada registado.',

  'excluded.heading': 'Movimentos excluídos do lucro',
  'excluded.note':
    'Estes movimentam liquidez mas não são um ganho nem uma perda: depositar dinheiro não produz lucro, e uma posição ainda aberta não tem resultado enquanto não for vendida.',
  'excluded.deposits': 'Depósitos',
  'excluded.withdrawals': 'Levantamentos',
  'excluded.netCapital': 'Capital líquido depositado',
  'excluded.cardSpending': 'Despesas com cartão',
  'excluded.openPositionsCost': 'Preço de custo das posições abertas',

  'reconciliation.heading': 'Reconciliação de caixa',
  'reconciliation.description':
    'O lucro é recalculado apenas a partir dos movimentos de caixa, sem FIFO. Dois caminhos independentes para o mesmo número: se divergirem, há um tipo de operação classificado incorretamente.',
  'reconciliation.expected': 'Lucro implícito nos fluxos de caixa',
  'reconciliation.actual': 'Lucro líquido calculado',
  'reconciliation.difference': 'Diferença',
  'reconciliation.balanced': 'Reconciliação equilibrada',
  'reconciliation.unbalanced': 'Reconciliação NÃO equilibrada',
  'reconciliation.unbalancedHint':
    'Uma diferença diferente de zero significa que há operações não classificadas ou mal classificadas. Não confie no lucro enquanto isso não for resolvido.',

  'securities.heading': 'Detalhe por título',
  'securities.description':
    'Posições com pelo menos uma venda concluída. A rendibilidade é medida sobre o custo dos lotes vendidos, e não sobre o capital depositado.',
  'securities.column.symbol': 'Símbolo',
  'securities.column.name': 'Nome',
  'securities.column.proceeds': 'Valor da venda',
  'securities.column.cost': 'Custo',
  'securities.column.profit': 'Lucro',
  'securities.column.yield': 'Rendibilidade sobre o custo',
  'securities.column.lots': 'Lotes fechados',
  'securities.column.meanDays': 'Detenção média',
  'securities.none': 'Nenhuma posição fechada.',

  'openPositions.heading': 'Posições ainda abertas',
  'openPositions.note':
    'Valorizadas ao preço de custo. A exportação não contém as cotações atuais, pelo que as mais-valias potenciais não podem ser calculadas.',
  'openPositions.column.quantity': 'Quantidade',
  'openPositions.column.cost': 'Preço de custo',
  'openPositions.none': 'Nenhuma posição aberta.',

  'windows.heading': 'Desempenho por janela temporal',
  'windows.anchorNote':
    'As janelas são ancoradas à última data presente no ficheiro ({anchor}), e não a hoje: caso contrário, uma exportação antiga mostraria todas as janelas vazias.',
  'windows.column.window': 'Janela',
  'windows.column.range': 'Período',
  'windows.column.profit': 'Lucro',
  'windows.column.buys': 'Compras',
  'windows.column.sells': 'Vendas',
  'windows.column.netDeposits': 'Depósitos líquidos',
  'windows.column.operations': 'Operações',
  'windows.noMovement': 'Sem movimento de lucro',
  'windows.composition.heading': 'De que é feito o lucro de cada janela',
  'windows.composition.note':
    'As janelas sobrepõem-se: cada linha contém as mais curtas, pelo que as linhas não se somam entre si.',
  'window.ALL': 'Todo o período',
  'window.1Y': '1 ano',
  'window.6M': '6 meses',
  'window.3M': '3 meses',
  'window.1M': '1 mês',
  'window.1W': '1 semana',
  'window.1D': '1 dia',

  'monthly.heading': 'Mês a mês',
  'monthlyProfit.heading': 'Lucro mês a mês',
  'monthlyProfit.description':
    'Uma linha por ano, uma coluna por mês, com os totais à direita e em baixo. A cor dá o sinal, a intensidade o peso face ao maior mês. Os montantes estão abreviados: passe o rato sobre uma célula para ler um valor por extenso, ou abra a tabela abaixo. Clique numa célula e o gráfico abre nesse mês, repartido pelas partes que o compuseram.',
  'monthlyProfit.legend.positive': 'Acrescenta',
  'monthlyProfit.legend.negative': 'Retira',
  'monthlyProfit.back': 'Voltar a todos os meses',
  'monthlyProfit.parts': 'De que é feito {month}',
  'monthlyProfit.total': 'Total',
  'monthlyProfit.allYears': '{month}, todos os anos',
  'monthlyProfit.column.part': 'Componente',
  'monthlyProfit.column.amount': 'Montante',
  'monthlyProfit.column.weight': 'Peso no desenho',
  'monthlyProfit.empty': 'Nada se moveu neste mês.',

  'monthlyComposition.heading': 'De que é feito o lucro de cada mês',
  'monthlyComposition.description':
    'Os mesmos valores do gráfico acima, repartidos pela origem que tiveram. Acima de zero está o que acrescentou ao lucro, abaixo os encargos que o reduziram: a soma algébrica de cada coluna é o lucro do mês.',
  'profitPart.trading': 'Negociação',
  'profitPart.dividends': 'Dividendos',
  'profitPart.interest': 'Juros',
  'profitPart.otherIncome': 'Outros rendimentos',
  'profitPart.charges': 'Encargos',

  'monthlyTransactions.heading': 'Linhas de negociação por mês',
  'monthlyTransactions.description':
    'Uma contagem das linhas BUY e SELL. Uma ordem parcialmente executada produz várias linhas, pelo que este número é superior ao número de ordens que colocou.',
  'monthlyTransactions.series': 'Linhas BUY e SELL',
  'monthly.column.month': 'Mês',
  'monthly.column.profit': 'Lucro',
  'monthly.column.transactions': 'Linhas BUY e SELL',

  'capital.heading': 'Capital e rendibilidade',
  'capital.figure': 'Capital e resultado, mês a mês',
  'capital.description':
    'Duas barras para cada mês: o custo das posições abertas, medido no fecho de cada dia e calculado em média sobre os dias do mês, fins de semana incluídos, e ao lado a negociação realizada mais os dividendos do mesmo mês. O gráfico mostra um ano de cada vez; a tabela guarda-os todos, com os dias sobre os quais cada média foi tirada — o primeiro e o último mês são parciais.',
  'capital.year': 'Ano',
  'capital.showing': 'O gráfico mostra {year}.',
  'capital.legend.gain': 'Mês com lucro',
  'capital.legend.loss': 'Mês com prejuízo',
  'capitalInvested.series': 'Capital médio investido',
  'capitalProfit.series': 'Resultado do mês',
  'capital.column.month': 'Mês',
  'capital.column.capital': 'Capital médio',
  'capital.column.days': 'Dias',
  'capital.column.profit': 'Lucro',
  'capital.column.return': 'Rendibilidade',
  'capital.caution':
    'O capital está ao custo de aquisição, não a preços de mercado, e o lucro aqui é apenas negociação mais dividendos: os juros sobre a liquidez, outros rendimentos e os encargos de conta ficam de fora, porque não foram produzidos pelo capital investido. Por isso este valor difere do de Mês a mês. As rendibilidades mensais não se somam: têm denominadores diferentes.',

  'assetClass.heading': 'Lucro por classe de ativos',
  'assetClass.column.assetClass': 'Classe de ativos',
  'assetClass.column.profit': 'Lucro',
  'assetClass.UNCLASSIFIED': 'Não indicada',

  'winRate.heading': 'Proporção de posições com ganho',
  'winRate.caution':
    'Aqui contam-se títulos, não vendas individuais: as percentagens mais abaixo são medidas sobre a venda, e um denominador diferente dá outro número. Leia esta proporção em conjunto com o ganho médio e a perda média: uma proporção elevada com perdas maiores do que os ganhos continua a ser um resultado negativo.',
  'winRate.closed': 'Posições fechadas',
  'winRate.wins': 'Com ganho',
  'winRate.losses': 'Com perda',
  'winRate.breakEven': 'Sem ganho nem perda',
  'winRate.rate': 'Proporção com ganho',
  'winRate.averageWin': 'Ganho médio',
  'winRate.averageLoss': 'Perda média',

  'topFlop.heading': 'Melhores e piores',
  'topFlop.top': 'Melhores',
  'topFlop.flop': 'Piores',

  'holding.heading': 'Período de detenção',
  'holding.note':
    'Medido sobre cada lote vendido. A mediana aparece ao lado da média porque algumas detenções muito longas puxam a média consigo.',
  'holding.mean': 'Duração média',
  'holding.median': 'Duração mediana',
  'holding.byClass': 'Por classe de ativos',
  'holding.column.assetClass': 'Classe de ativos',
  'holding.column.meanDays': 'Duração média',
  'holding.column.closures': 'Lotes vendidos',
  'holding.days': '{count} dias',
  'holding.day': '{count} dia',

  'performance.heading': 'Desempenho',
  'performance.caution':
    'Apenas vendas fechadas: dividendos, juros e encargos não entram nestes números.',
  'performance.cautionNet':
    'Apenas vendas fechadas, menos todas as comissões e impostos datados no período — incluindo os de compras e dividendos, que nenhuma destas vendas causou. Já os dividendos e juros recebidos não entram.',
  'performance.from': 'De',
  'performance.to': 'Até',
  'performance.basis': 'Líquido de comissões e impostos',
  'performance.range': 'Intervalo escolhido: de {from} a {to}.',
  'performance.rangeInvalid': 'A data inicial é posterior à data final.',
  'performance.withheld': 'Encargos subtraídos no período: {amount}.',
  'performance.gauge.title': 'Vendas com lucro',
  'performance.gauge.wins': 'Com lucro',
  'performance.gauge.losses': 'Com prejuízo',
  'performance.gauge.breakEven': 'Sem resultado',
  'performance.gauge.count': '{wins} de {total}',
  'performance.meanCalendar': 'Média por dia de calendário',
  'performance.meanActive': 'Média por dia com operações',
  'performance.medianActive': 'Mediana por dia com operações',
  'performance.hint.calendar': 'em {days} dias',
  'performance.hint.active': 'em {days} dias com vendas',
  'performance.hint.activeNet': 'em {days} dias com vendas ou encargos',
  'performance.empty': 'Nenhuma venda fechada neste período.',
  'performance.column.window': 'Período',
  'performance.column.sales': 'Vendas',
  'performance.column.winShare': 'Com lucro',
  'performance.column.profit': 'Resultado',
  'performance.column.meanCalendar': 'Média por dia de calendário',
  'performance.column.meanActive': 'Média por dia com operações',
  'performance.column.medianActive': 'Mediana por dia com operações',

  'execution.heading': 'Qualidade da negociação',
  'execution.caution':
    'Uma venda é um símbolo num único dia: os lotes fechados em conjunto são contados uma só vez. Isto mede apenas o resultado da negociação — dividendos, juros e encargos ficam de fora.',
  'execution.profitFactor': 'Fator de lucro',
  'execution.profitFactorHint': 'Nenhuma venda fechou com perda, pelo que o rácio não tem valor.',
  'execution.meanProfit': 'Resultado médio',
  'execution.column.side': 'Desfecho',
  'execution.column.sales': 'Vendas',
  'execution.column.meanProfit': 'Resultado médio',
  'execution.column.meanDays': 'Detenção média',
  'execution.winners': 'Com ganho',
  'execution.losers': 'Com perda',
  'execution.byHolding': 'Por período de detenção',
  'execution.column.bucket': 'Faixa',
  'execution.column.profit': 'Resultado',
  'execution.column.yield': 'Rendibilidade sobre o custo',
  'execution.bucket.UNDER_1M': 'Menos de 1 mês',
  'execution.bucket.M1_TO_M6': 'De 1 a 6 meses',
  'execution.bucket.M6_TO_M12': 'De 6 a 12 meses',
  'execution.bucket.OVER_1Y': 'Mais de 1 ano',
  'execution.profitConcentration': 'As três melhores vendas representam {percent} do ganho total.',
  'execution.concentration': 'As três piores vendas representam {percent} da perda total.',

  'chart.showTable': 'Mostrar os dados em tabela',
  'chart.hideTable': 'Ocultar a tabela',
  'chart.tableLabel': 'Dados do gráfico: {title}',
  'chart.empty': 'Nada para representar.',
  'chart.legendHint': 'Clique numa entrada para ocultar essa série.',

  'print.generatedOn': 'Relatório gerado em {date}',
  'print.source': 'Trade Republic Analyzer — calculado localmente, nada foi enviado para lado nenhum.',

  'limits.heading': 'Limites declarados',
  'limits.lossCarryforward':
    'Isto não é um cálculo fiscal. As menos-valias reportadas de anos anteriores e a sua compensação não são tratadas.',
  'limits.unrealized':
    'Sem mais-valias potenciais: as posições abertas são valorizadas ao preço de custo, porque a exportação não contém as cotações atuais.',
  'limits.brokerOnly': 'O único formato suportado é o da exportação da Trade Republic.',
  'limits.currency':
    'As operações em moedas diferentes do euro não foram verificadas: se o seu ficheiro contiver alguma, confirme os totais.',
  'limits.marketPrices':
    'Sem preços de mercado, ficam fora de alcance a volatilidade, o Sharpe, o Sortino, o beta, o VaR, o drawdown do capital, as mais-valias potenciais e as correlações: o extrato regista as transações, não as cotações.',

  'footer.privacy': 'Como são tratados os seus dados',
  'footer.sourceCode': 'Código-fonte',
  'footer.disclaimerHeading': 'Avisos',
  'footer.notAffiliated':
    'Uma ferramenta independente, sem afiliação com a Trade Republic nem por ela apoiada. As marcas pertencem aos respetivos titulares.',
  'footer.notAdvice':
    'Os resultados não constituem aconselhamento financeiro nem fiscal e não substituem os documentos oficiais do seu intermediário: confirme sempre os valores no extrato original.',
  'footer.noWarranty':
    'Software livre sob a licença MIT, sem qualquer garantia. A utilização é por sua conta e risco.',
  'footer.copyright': '© 2026 Enrico Schintu',
  'footer.authorSite': 'enricoschintu.com',
  'print.legal':
    'Não é aconselhamento financeiro nem fiscal. Ferramenta independente, sem afiliação com a Trade Republic. © 2026 Enrico Schintu, licença MIT, sem garantias.',
};
