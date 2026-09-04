/**
 * Quanto capitale era a rischio, e quanto ha prodotto.
 *
 * Due figure sulle stesse colonne mese, una sopra l'altra, invece di un solo
 * grafico a doppio asse: le due grandezze sono entrambe in euro ma di ordini di
 * grandezza diversi, e due scale in euro nella stessa cornice mentono sulla
 * proporzione. Impilate, il confronto di un mese si legge in verticale.
 */
import { monthlyCapital, type MonthlyCapital } from '../../core/capital';
import { barChart } from '../chart/bars';
import { figure } from '../chart/figure';
import { SERIES_1, poleFor } from '../chart/palette';
import { el } from '../dom';
import { formatCurrency, formatInteger, formatMonth, formatSignedCurrency } from '../format';
import { note, section, signedCell, signedPercentCell, type ReportContext } from './common';

export function capitalSection(context: ReportContext): HTMLElement | null {
  const { operations, report, t } = context;
  const months = monthlyCapital(operations, report);
  if (months.length === 0) return null;
  return section('capital', t('capital.heading'), [
    investedFigure(context, months),
    profitFigure(context, months),
    note(t('capital.caution')),
  ]);
}

function investedFigure(context: ReportContext, months: readonly MonthlyCapital[]): HTMLElement {
  const { language, t } = context;
  return figure({
    t,
    title: t('capitalInvested.heading'),
    description: t('capitalInvested.description'),
    plot: () => {
      const host = el('div', { class: 'plot-host' });
      const plot = barChart(
        {
          data: months.map((month) => ({
            label: formatMonth(language, month.month),
            value: month.averageCapital.toNumber(),
            // Un capitale non ha polarità: una serie, un colore.
            color: SERIES_1,
          })),
          formatValue: (value) => formatCurrency(language, value),
          formatTick: (value) => formatCurrency(language, value),
          valueLabel: t('capitalInvested.series'),
        },
        host,
      );
      if (!plot) return null;
      host.append(plot);
      return host;
    },
    table: {
      columns: [t('capital.column.month'), t('capital.column.capital'), t('capital.column.days')],
      rows: months.map((month) => [
        formatMonth(language, month.month),
        formatCurrency(language, month.averageCapital),
        formatInteger(language, month.days),
      ]),
    },
  });
}

function profitFigure(context: ReportContext, months: readonly MonthlyCapital[]): HTMLElement {
  const { language, t } = context;
  return figure({
    t,
    title: t('capitalProfit.heading'),
    description: t('capitalProfit.description'),
    plot: () => {
      const host = el('div', { class: 'plot-host' });
      const plot = barChart(
        {
          data: months.map((month) => {
            const value = month.profit.toNumber();
            return { label: formatMonth(language, month.month), value, color: poleFor(value) };
          }),
          formatValue: (value) => formatSignedCurrency(language, value),
          formatTick: (value) => formatCurrency(language, value),
          valueLabel: t('capitalProfit.series'),
        },
        host,
      );
      if (!plot) return null;
      host.append(plot);
      return host;
    },
    table: {
      columns: [t('capital.column.month'), t('capital.column.profit'), t('capital.column.return')],
      rows: months.map((month) => [
        formatMonth(language, month.month),
        signedCell(language, month.profit),
        signedPercentCell(language, month.returnPercent),
      ]),
    },
  });
}
