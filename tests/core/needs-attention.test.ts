/**
 * `needs-attention.csv` is the export that puts both alert banners on the page.
 *
 * Every other fixture classifies cleanly, so until this one existed the loudest
 * component in the report — the thing the whole engine is built to make
 * impossible to miss — had never been rendered by anything but a jsdom unit
 * test: no screenshot, no contrast measurement, no width. A fixture that stops
 * raising the banners would take that coverage away again without failing
 * anything, so what it is for is asserted here rather than described in a
 * comment.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseOperations } from '../../src/core/csv';
import { calculate } from '../../src/core/fifo';
import { reconcile } from '../../src/core/reconcile';

const operations = parseOperations(
  readFileSync(new URL('../fixtures/needs-attention.csv', import.meta.url), 'utf8'),
);
const report = calculate(operations);

describe('the export that raises both banners', () => {
  it('carries operation types the engine does not know', () => {
    expect(report.unclassified.types).toEqual(['CRYPTO_STAKING_REWARD', 'REFERRAL_REWARD']);
    expect(report.unclassified.count).toBe(2);
    expect(report.unclassified.amount.toFixed(2)).toBe('27.50');
  });

  it('raises both anomalies the engine can report', () => {
    expect(report.anomalies.map((a) => a.code).sort()).toEqual([
      'UNCOVERED_SALE',
      'UNMATCHED_FREE_LOT_CANCELLATION',
    ]);
  });

  /**
   * The unclassified banner tells the reader the amount is kept out of the
   * profit and that they will find it in the reconciliation difference below.
   * That is a claim about two numbers agreeing, so it is checked as one.
   */
  it('leaves the unrecognised amount in the reconciliation gap, not in the profit', () => {
    const reconciliation = reconcile(operations, report);
    expect(reconciliation.balanced).toBe(false);
    expect(reconciliation.difference.toFixed(2)).toBe(report.unclassified.amount.toFixed(2));
  });

  /**
   * The contrast sweep loads this file and requires a fully populated report,
   * so the account has to trade like an account and not merely misbehave.
   */
  it('still renders a whole report around the alerts', () => {
    const months = new Set(operations.map((o) => o.date.slice(0, 7)));
    expect(months.size).toBeGreaterThanOrEqual(6);

    const open = Object.values(report.bySecurity).filter((s) => s.remainingQuantity.gt(0));
    expect(open.length).toBeGreaterThanOrEqual(2);

    const winners = Object.values(report.bySecurity).filter((s) => s.profit.gt(0));
    const losers = Object.values(report.bySecurity).filter((s) => s.profit.lt(0));
    expect(winners.length).toBeGreaterThanOrEqual(1);
    expect(losers.length).toBeGreaterThanOrEqual(1);
  });
});
