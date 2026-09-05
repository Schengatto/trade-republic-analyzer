/** The Spanish catalogue. */

import type { Messages } from './it';

export const es: Messages = {
  'app.title': 'Trade Republic Analyzer',
  'app.tagline': 'Su extracto nunca sale de este navegador.',
  'app.skipToReport': 'Ir al informe',

  'nav.language': 'Idioma',
  'nav.theme': 'Tema',
  'nav.theme.toLight': 'Cambiar a claro',
  'nav.theme.toDark': 'Cambiar a oscuro',
  'nav.print': 'Imprimir o guardar en PDF',
  'nav.reset': 'Analizar otro archivo',
  'nav.outline': 'Secciones',
  'nav.outline.label': 'Secciones del informe',

  'upload.heading': 'Cargue su exportación de Trade Republic',
  'upload.instruction': 'Arrastre aquí el archivo CSV o selecciónelo desde su ordenador.',
  'upload.button': 'Elegir archivo CSV',
  'upload.dropActive': 'Suelte el archivo para analizarlo',
  'upload.privacyHeading': 'El archivo permanece en su ordenador',
  'upload.privacyBody':
    'No hay ninguna nube ni ningún servidor. El CSV lo lee y lo analiza el navegador que tiene delante, y nunca sale de esta máquina.',
  'upload.privacyFact.noUpload.term': 'No se envía nada',
  'upload.privacyFact.noUpload.detail':
    'El archivo no se sube a ninguna parte, ni a un servidor nuestro ni al de terceros. La pestaña Red del navegador permanece vacía.',
  'upload.privacyFact.noStorage.term': 'No se guarda nada',
  'upload.privacyFact.noStorage.detail':
    'No se guarda nada de su archivo. El navegador conserva únicamente tres preferencias: el idioma, el tema y el estado de la barra de secciones. Al recargar la página, el informe desaparece.',
  'upload.privacyFact.offline.term': 'Funciona sin conexión',
  'upload.privacyFact.offline.detail':
    'Desconéctese de la red, recargue la página y vuelva a cargar el archivo: el análisis se ejecuta igualmente, porque no tiene a quién preguntar.',
  'upload.formatHint':
    'Necesita el CSV de operaciones exportado desde Trade Republic, con sus encabezados de columna originales.',
  'upload.reading': 'Leyendo el archivo…',

  'error.heading': 'No se ha podido leer el archivo',
  'error.MISSING_COLUMNS':
    'Faltan {count} columna(s) obligatoria(s): {columns}. Esto no parece una exportación de operaciones de Trade Republic.',
  'error.MALFORMED_ROW':
    'No se ha podido leer la fila {line}. Su contenido no se muestra, porque puede contener datos personales.',
  'error.NO_ROWS': 'El archivo no contiene operaciones.',
  'error.NOT_CSV': 'El archivo seleccionado no es un CSV.',
  'error.UNKNOWN': 'No se ha reconocido el archivo.',
  'error.retry': 'Probar con otro archivo',

  'banner.unclassified.heading': 'Operaciones no reconocidas',
  'banner.unclassified.body':
    '{count} operación(es) tienen un tipo que el motor no conoce ({types}), por un importe de {amount}. Ese importe se mantiene deliberadamente FUERA del beneficio: lo encontrará en la diferencia de conciliación que aparece más abajo. Comunique estos tipos para que puedan añadirse.',
  'banner.anomalies.heading': 'Anomalías detectadas en los datos',
  'anomaly.UNCOVERED_SALE':
    '{symbol}: se han vendido {quantity} títulos sin posición en cartera que los cubra.',
  'anomaly.UNMATCHED_FREE_LOT_CANCELLATION':
    '{symbol}: anulación de {quantity} títulos gratuitos sin un lote gratuito correspondiente.',

  'summary.heading': 'Resumen',
  'summary.netProfit': 'Beneficio neto',
  'summary.netProfit.hint': 'Negociación y rentas, después de comisiones e impuestos.',
  'summary.tradingProfit': 'Beneficio de negociación',
  'summary.tradingProfit.hint': 'Solo posiciones cerradas, casadas con el método FIFO.',
  'summary.totalCharges': 'Gastos totales',
  'summary.totalCharges.hint': 'Comisiones e impuestos retenidos.',
  'summary.netCapital': 'Capital neto aportado',
  'summary.netCapital.hint': 'Ingresos menos retiradas.',
  'summary.return': 'Rentabilidad sobre el capital',
  'summary.return.hint': 'Todo el periodo, de {from} a {to}. Sin anualizar.',
  'summary.returnUnavailable': 'Rentabilidad no disponible: el capital neto aportado es cero.',
  'summary.operationsRead': '{count} operaciones leídas',
  'summary.period': 'Periodo del {from} al {to}',

  'trend.heading': 'Evolución acumulada',
  'trend.description':
    'Beneficio neto y beneficio de negociación, día a día, sobre un mismo eje.',
  'trend.series.net': 'Beneficio neto',
  'trend.series.trading': 'Beneficio de negociación',
  'trend.column.date': 'Fecha',
  'trend.column.dayProfit': 'Variación del día',
  'trend.drawdown': 'Mayor caída',
  'trend.drawdown.hint': 'Desde el máximo anterior, con mínimo el {date}.',
  'trend.worstDay': 'Peor día',
  'trend.worstDay.hint': 'Pérdida registrada el {date}.',

  'composition.heading': 'Cómo se compone el resultado',
  'composition.grossProfit': 'Beneficio bruto',
  'composition.income': 'Rentas por tipo',
  'composition.incomeNote':
    'Ya incluidas en el beneficio bruto anterior; esto es solo el desglose.',
  'composition.fees': 'Comisiones',
  'composition.costDrag': 'Proporción del beneficio bruto',
  'composition.taxes': 'Impuestos por tipo',
  'composition.netProfit': 'Beneficio neto',
  'composition.column.item': 'Concepto',
  'composition.column.amount': 'Importe',
  'composition.none': 'No hay nada registrado.',

  'excluded.heading': 'Movimientos excluidos del beneficio',
  'excluded.note':
    'Estos apuntes mueven efectivo, pero no son ni una ganancia ni una pérdida: aportar dinero no produce un beneficio, y una posición todavía abierta no tiene resultado hasta que se vende.',
  'excluded.deposits': 'Ingresos',
  'excluded.withdrawals': 'Retiradas',
  'excluded.netCapital': 'Capital neto aportado',
  'excluded.cardSpending': 'Gastos con tarjeta',
  'excluded.openPositionsCost': 'Precio de coste de las posiciones abiertas',

  'reconciliation.heading': 'Conciliación de efectivo',
  'reconciliation.description':
    'El beneficio se vuelve a calcular únicamente a partir de los movimientos de efectivo, sin FIFO. Dos caminos independientes hacia la misma cifra: si no coinciden, hay un tipo de operación mal clasificado.',
  'reconciliation.expected': 'Beneficio implícito en los flujos de efectivo',
  'reconciliation.actual': 'Beneficio neto calculado',
  'reconciliation.difference': 'Diferencia',
  'reconciliation.balanced': 'Conciliación cuadrada',
  'reconciliation.unbalanced': 'Conciliación NO cuadrada',
  'reconciliation.unbalancedHint':
    'Una diferencia distinta de cero significa que hay operaciones sin clasificar o mal clasificadas. No considere fiable el beneficio hasta que se resuelva.',

  'securities.heading': 'Detalle por valor',
  'securities.description':
    'Posiciones con al menos una venta completada. La rentabilidad se mide sobre el coste de los lotes vendidos, no sobre el capital aportado.',
  'securities.column.symbol': 'Símbolo',
  'securities.column.name': 'Nombre',
  'securities.column.proceeds': 'Importe de la venta',
  'securities.column.cost': 'Coste',
  'securities.column.profit': 'Beneficio',
  'securities.column.yield': 'Rentabilidad sobre coste',
  'securities.column.lots': 'Lotes cerrados',
  'securities.column.meanDays': 'Tenencia media',
  'securities.none': 'No hay posiciones cerradas.',

  'openPositions.heading': 'Posiciones todavía abiertas',
  'openPositions.note':
    'Valoradas a precio de coste. La exportación no incluye precios actuales, por lo que no se pueden calcular las plusvalías latentes.',
  'openPositions.column.quantity': 'Cantidad',
  'openPositions.column.cost': 'Precio de coste',
  'openPositions.none': 'No hay posiciones abiertas.',

  'windows.heading': 'Resultado por ventana temporal',
  'windows.anchorNote':
    'Las ventanas se anclan a la última fecha presente en el archivo ({anchor}), no al día de hoy: de lo contrario, una exportación antigua mostraría todas las ventanas vacías.',
  'windows.column.window': 'Ventana',
  'windows.column.range': 'Periodo',
  'windows.column.profit': 'Beneficio',
  'windows.column.buys': 'Compras',
  'windows.column.sells': 'Ventas',
  'windows.column.netDeposits': 'Ingresos netos',
  'windows.column.operations': 'Operaciones',
  'windows.noMovement': 'Sin movimiento de beneficio',
  'windows.composition.heading': 'De qué se compone el beneficio de cada ventana',
  'windows.composition.note':
    'Las ventanas se solapan: cada fila contiene las más cortas, por lo que las filas no se suman entre sí.',
  'window.ALL': 'Todo el periodo',
  'window.1Y': '1 año',
  'window.6M': '6 meses',
  'window.3M': '3 meses',
  'window.1M': '1 mes',
  'window.1W': '1 semana',
  'window.1D': '1 día',

  'monthly.heading': 'Mes a mes',
  'monthlyProfit.heading': 'Beneficio mes a mes',
  'monthlyProfit.description':
    'Una fila por año, una columna por mes, con los totales a la derecha y en la parte inferior. El color indica el signo; la intensidad, cuánto pesa frente al mes más grande. Los importes están abreviados: pase el cursor por una celda para leer uno completo, o abra la tabla que aparece debajo. Haga clic en una celda y el gráfico se abrirá en ese mes, dividido en las partes que lo compusieron.',
  'monthlyProfit.legend.positive': 'Suma',
  'monthlyProfit.legend.negative': 'Resta',
  'monthlyProfit.back': 'Volver a todos los meses',
  'monthlyProfit.parts': 'De qué se compone {month}',
  'monthlyProfit.total': 'Total',
  'monthlyProfit.allYears': '{month}, todos los años',
  'monthlyProfit.column.part': 'Componente',
  'monthlyProfit.column.amount': 'Importe',
  'monthlyProfit.column.weight': 'Peso en el dibujo',
  'monthlyProfit.empty': 'En este mes no se movió nada.',

  'monthlyComposition.heading': 'De qué se compone el beneficio de cada mes',
  'monthlyComposition.description':
    'Las mismas cifras del gráfico anterior, divididas según su procedencia. Por encima de cero, lo que sumó al beneficio; por debajo, los gastos que se lo restaron: la suma algebraica de cada columna es el beneficio del mes.',
  'profitPart.trading': 'Negociación',
  'profitPart.dividends': 'Dividendos',
  'profitPart.interest': 'Intereses',
  'profitPart.otherIncome': 'Otras rentas',
  'profitPart.charges': 'Gastos',

  'monthlyTransactions.heading': 'Filas de negociación por mes',
  'monthlyTransactions.description':
    'Recuento de las filas BUY y SELL. Una orden ejecutada parcialmente produce varias filas, por lo que este número es mayor que el número de órdenes cursadas.',
  'monthlyTransactions.series': 'Filas BUY y SELL',
  'monthly.column.month': 'Mes',
  'monthly.column.profit': 'Beneficio',
  'monthly.column.transactions': 'Filas BUY y SELL',

  'capital.heading': 'Capital y rentabilidad',
  'capitalInvested.heading': 'Capital medio invertido',
  'capitalInvested.description':
    'El coste de las posiciones abiertas, medido al cierre de cada día y promediado sobre los días del mes, fines de semana incluidos. El primer y el último mes son parciales: la columna de los días indica sobre cuántos días se ha tomado la media.',
  'capitalInvested.series': 'Capital medio invertido',
  'capital.column.month': 'Mes',
  'capital.column.capital': 'Capital medio',
  'capital.column.days': 'Días',
  'capitalProfit.heading': 'Lo que ha producido ese capital',
  'capitalProfit.description':
    'Operativa realizada y dividendos del mismo mes, sobre las mismas columnas que el gráfico de arriba: un mes se lee en vertical, cuánto capital estaba en riesgo y cuánto ha rendido.',
  'capitalProfit.series': 'Beneficio del mes',
  'capital.column.profit': 'Beneficio',
  'capital.column.return': 'Rentabilidad',
  'capital.caution':
    'El capital está a coste de adquisición, no a precios de mercado, y el beneficio aquí es solo operativa más dividendos: los intereses de la liquidez, otras rentas y los gastos de cuenta quedan fuera, porque no los ha producido el capital invertido. Por eso la cifra difiere de la de Mes a mes. Las rentabilidades mensuales no se suman: tienen denominadores distintos.',

  'assetClass.heading': 'Beneficio por clase de activo',
  'assetClass.column.assetClass': 'Clase de activo',
  'assetClass.column.profit': 'Beneficio',
  'assetClass.UNCLASSIFIED': 'Sin indicar',

  'winRate.heading': 'Proporción de posiciones en ganancia',
  'winRate.caution':
    'Aquí se cuentan valores, no ventas individuales: los porcentajes de más abajo se miden sobre la venta, y un denominador distinto da un número distinto. Léala junto con la ganancia media y la pérdida media: una proporción alta con pérdidas mayores que las ganancias sigue siendo un resultado negativo.',
  'winRate.closed': 'Posiciones cerradas',
  'winRate.wins': 'En ganancia',
  'winRate.losses': 'En pérdida',
  'winRate.breakEven': 'En equilibrio',
  'winRate.rate': 'Proporción en ganancia',
  'winRate.averageWin': 'Ganancia media',
  'winRate.averageLoss': 'Pérdida media',

  'topFlop.heading': 'Mejores y peores',
  'topFlop.top': 'Mejores',
  'topFlop.flop': 'Peores',

  'holding.heading': 'Periodo de tenencia',
  'holding.note':
    'Medido sobre cada lote vendido. La mediana se muestra junto a la media porque unas pocas posiciones mantenidas mucho tiempo desplazan la media.',
  'holding.mean': 'Duración media',
  'holding.median': 'Duración mediana',
  'holding.byClass': 'Por clase de activo',
  'holding.column.assetClass': 'Clase de activo',
  'holding.column.meanDays': 'Duración media',
  'holding.column.closures': 'Lotes vendidos',
  'holding.days': '{count} días',
  'holding.day': '{count} día',

  'performance.heading': 'Rendimiento',
  'performance.caution':
    'Solo ventas cerradas: los dividendos, los intereses y los costes no entran en estas cifras.',
  'performance.cautionNet':
    'Solo ventas cerradas, menos todas las comisiones e impuestos con fecha dentro del periodo — incluidos los de compras y dividendos, que ninguna de estas ventas ha causado. En cambio, los dividendos e intereses cobrados no entran.',
  'performance.from': 'Desde',
  'performance.to': 'Hasta',
  'performance.basis': 'Neto de comisiones e impuestos',
  'performance.range': 'Intervalo elegido: del {from} al {to}.',
  'performance.rangeInvalid': 'La fecha inicial es posterior a la final.',
  'performance.withheld': 'Costes restados en el periodo: {amount}.',
  'performance.gauge.title': 'Ventas en ganancia',
  'performance.gauge.wins': 'En ganancia',
  'performance.gauge.losses': 'En pérdida',
  'performance.gauge.breakEven': 'En equilibrio',
  'performance.gauge.count': '{wins} de {total}',
  'performance.meanCalendar': 'Media por día natural',
  'performance.meanActive': 'Media por día operativo',
  'performance.medianActive': 'Mediana por día operativo',
  'performance.hint.calendar': 'sobre {days} días',
  'performance.hint.active': 'sobre {days} días con ventas',
  'performance.hint.activeNet': 'sobre {days} días con ventas o costes',
  'performance.empty': 'Ninguna venta cerrada en este periodo.',
  'performance.column.window': 'Periodo',
  'performance.column.sales': 'Ventas',
  'performance.column.winShare': 'En ganancia',
  'performance.column.profit': 'Resultado',
  'performance.column.meanCalendar': 'Media por día natural',
  'performance.column.meanActive': 'Media por día operativo',
  'performance.column.medianActive': 'Mediana por día operativo',

  'execution.heading': 'Calidad de la operativa',
  'execution.caution':
    'Una venta es un símbolo en un día: los lotes cerrados a la vez cuentan una sola vez. Aquí se mide únicamente el resultado de negociación: los dividendos, los intereses y los gastos quedan fuera.',
  'execution.profitFactor': 'Profit factor',
  'execution.profitFactorHint':
    'Ninguna venta se cerró con pérdida, por lo que el ratio no tiene valor.',
  'execution.meanProfit': 'Resultado medio',
  'execution.column.side': 'Desenlace',
  'execution.column.sales': 'Ventas',
  'execution.column.meanProfit': 'Resultado medio',
  'execution.column.meanDays': 'Tenencia media',
  'execution.winners': 'En ganancia',
  'execution.losers': 'En pérdida',
  'execution.byHolding': 'Por periodo de tenencia',
  'execution.column.bucket': 'Franja',
  'execution.column.profit': 'Resultado',
  'execution.column.yield': 'Rentabilidad sobre coste',
  'execution.bucket.UNDER_1M': 'Menos de 1 mes',
  'execution.bucket.M1_TO_M6': 'De 1 a 6 meses',
  'execution.bucket.M6_TO_M12': 'De 6 a 12 meses',
  'execution.bucket.OVER_1Y': 'Más de 1 año',
  'execution.profitConcentration':
    'Las tres mejores ventas concentran el {percent} de la ganancia total.',
  'execution.concentration': 'Las tres peores ventas concentran el {percent} de la pérdida total.',

  'chart.showTable': 'Mostrar los datos en una tabla',
  'chart.hideTable': 'Ocultar la tabla',
  'chart.tableLabel': 'Datos del gráfico: {title}',
  'chart.empty': 'No hay nada que representar.',
  'chart.legendHint': 'Haga clic en una entrada para ocultar esa serie.',

  'print.generatedOn': 'Informe generado el {date}',
  'print.source':
    'Trade Republic Analyzer — calculado localmente, no se ha enviado nada a ninguna parte.',

  'limits.heading': 'Límites declarados',
  'limits.lossCarryforward':
    'Esto no es un cálculo fiscal. Las minusvalías pendientes de ejercicios anteriores y su compensación no se tratan.',
  'limits.unrealized':
    'No hay plusvalías latentes: las posiciones abiertas se valoran a precio de coste, porque la exportación no incluye precios actuales.',
  'limits.brokerOnly': 'El único formato admitido es la exportación de Trade Republic.',
  'limits.currency':
    'Las operaciones en divisas distintas del euro no se han verificado: si su archivo contiene alguna, compruebe los totales.',
  'limits.marketPrices':
    'Sin precios de mercado, la volatilidad, el Sharpe, el Sortino, la beta, el VaR, la caída máxima del capital, las plusvalías latentes y las correlaciones quedan fuera de alcance: el extracto registra operaciones, no cotizaciones.',

  'footer.privacy': 'Cómo se tratan sus datos',
  'footer.sourceCode': 'Código fuente',
  'footer.disclaimerHeading': 'Advertencias',
  'footer.notAffiliated':
    'Herramienta independiente, no afiliada a Trade Republic ni respaldada por ella. Las marcas citadas pertenecen a sus respectivos titulares.',
  'footer.notAdvice':
    'Los resultados no constituyen asesoramiento financiero ni fiscal y no sustituyen a los documentos oficiales de su intermediario: contraste siempre las cifras con el extracto original.',
  'footer.noWarranty':
    'Software libre bajo licencia MIT, sin garantía de ningún tipo. Su uso es por cuenta y riesgo del usuario.',
  'footer.copyright': '© 2026 Enrico Schintu',
  'footer.authorSite': 'enricoschintu.com',
  'print.legal':
    'No es asesoramiento financiero ni fiscal. Herramienta independiente, no afiliada a Trade Republic. © 2026 Enrico Schintu, licencia MIT, sin garantías.',
};
