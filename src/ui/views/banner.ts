/**
 * The loud, unmissable notices.
 *
 * An operation type the engine does not know is never dropped in silence: its
 * amount is kept out of the profit, so the reconciliation below reports the gap
 * instead of absorbing it. Silence is the failure mode this whole report exists
 * to prevent.
 */

import type { Anomaly } from '../../core/fifo';
import { el } from '../dom';
import { formatCurrency, formatInteger, formatQuantity } from '../format';
import type { MessageKey } from '../i18n';
import { humanizeType, type ReportContext } from './common';

export function banners(context: ReportContext): HTMLElement | null {
  const { report, t } = context;
  const parts: HTMLElement[] = [];

  if (report.unclassified.count > 0) {
    parts.push(
      el('div', { class: 'banner banner--warning', role: 'alert' }, [
        el('h2', { class: 'banner__title' }, [t('banner.unclassified.heading')]),
        el('p', {}, [
          t('banner.unclassified.body', {
            count: formatInteger(context.language, report.unclassified.count),
            types: report.unclassified.types.map(humanizeType).join(', '),
            amount: formatCurrency(context.language, report.unclassified.amount),
          }),
        ]),
      ]),
    );
  }

  if (report.anomalies.length > 0) {
    parts.push(
      el('div', { class: 'banner banner--notice', role: 'alert' }, [
        el('h2', { class: 'banner__title' }, [t('banner.anomalies.heading')]),
        el(
          'ul',
          { class: 'banner__list' },
          report.anomalies.map((anomaly) => el('li', {}, [anomalyMessage(context, anomaly)])),
        ),
      ]),
    );
  }

  if (parts.length === 0) return null;
  return el('div', { class: 'banners' }, parts);
}

/**
 * Turn an anomaly into a sentence in the reader's language.
 *
 * The engine carries the code and the numbers; the words are here. It never
 * interpolates anything but the symbol and the quantity — a name, a
 * counterparty or an IBAN must never reach a banner.
 */
export function anomalyMessage(context: ReportContext, anomaly: Anomaly): string {
  const key = `anomaly.${anomaly.code}` as MessageKey;
  return context.t(key, {
    symbol: anomaly.symbol,
    quantity: formatQuantity(context.language, anomaly.quantity),
  });
}
