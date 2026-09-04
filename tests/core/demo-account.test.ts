/**
 * `demo-account.csv` is the file behind the screenshots and the animation in
 * the README. Those images claim a profitable account, so the claim is asserted
 * here: if a future change to the engine turns the demo negative, or leaves an
 * anomaly banner on the page, the screenshots stop matching the code and this
 * test says so before anyone reads the README.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseOperations } from '../../src/core/csv';
import { calculate } from '../../src/core/fifo';
import { reconcile } from '../../src/core/reconcile';

const operations = parseOperations(
  readFileSync(new URL('../fixtures/demo-account.csv', import.meta.url), 'utf8'),
);
const report = calculate(operations);

describe('the demo account behind the README images', () => {
  it('reconciles against the cash movements', () => {
    expect(reconcile(operations, report).balanced).toBe(true);
  });

  it('classifies every row', () => {
    expect(report.unclassified.count).toBe(0);
    expect(report.anomalies).toEqual([]);
  });

  it('closes in profit, on trading and net alike', () => {
    expect(report.tradingProfit.gt(0)).toBe(true);
    expect(report.netProfit.gt(0)).toBe(true);
  });

  it('has losing trades too, so the report is not a straight line', () => {
    const losers = Object.values(report.bySecurity).filter((s) => s.profit.lt(0));
    expect(losers.length).toBeGreaterThanOrEqual(3);
  });

  it('spans more than twelve months, so every calendar slot is filled', () => {
    const months = new Set(operations.map((o) => o.date.slice(0, 7)));
    expect(months.size).toBeGreaterThan(12);
  });

  it('leaves positions open, so the open-positions section is populated', () => {
    const open = Object.values(report.bySecurity).filter((s) => s.remainingQuantity.gt(0));
    expect(open.length).toBeGreaterThanOrEqual(2);
  });
});
