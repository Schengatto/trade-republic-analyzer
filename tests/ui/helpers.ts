/**
 * Shared fixtures for the report view tests.
 *
 * `contextFor` used to live only in `report.test.ts`; other view tests need
 * the same wiring (a report, a reconciliation, a translator) without pulling
 * in that file's own fixtures.
 */

import { calculate } from '../../src/core/fifo';
import { reconcile } from '../../src/core/reconcile';
import type { Operation } from '../../src/core/operation';
import { translatorFor, type Language } from '../../src/ui/i18n';
import type { ReportContext } from '../../src/ui/views/common';
import { op } from '../helpers/operations';

const ACCOUNT: Operation[] = [
  op('2024-01-02', 'CASH', 'CUSTOMER_INBOUND', { amount: '1000.00' }),
  op('2024-01-03', 'TRADING', 'BUY', {
    shares: '10',
    amount: '-100.00',
    fee: '-1.00',
    assetClass: 'STOCK',
  }),
  op('2024-02-05', 'TRADING', 'BUY', {
    shares: '5',
    amount: '-60.00',
    symbol: 'BBB',
    name: 'Security B',
    assetClass: 'ETF',
  }),
  op('2024-03-07', 'TRADING', 'SELL', {
    shares: '-10',
    amount: '150.00',
    tax: '-13.00',
    assetClass: 'STOCK',
  }),
  op('2024-03-08', 'TRADING', 'SELL', {
    shares: '-5',
    amount: '40.00',
    symbol: 'BBB',
    name: 'Security B',
    assetClass: 'ETF',
  }),
  op('2024-04-01', 'CASH', 'DIVIDEND', { amount: '8.00', tax: '-2.08' }),
];

export function contextFor(language: Language, operations: Operation[] = ACCOUNT): ReportContext {
  const report = calculate(operations);
  return {
    operations,
    report,
    reconciliation: reconcile(operations, report),
    language,
    t: translatorFor(language),
  };
}
