// @vitest-environment jsdom

/**
 * The best/worst section, and what it does when there is no worst.
 *
 * The core no longer calls a profit a loss, which leaves the view a case it
 * never had: an account where everything gained returns an empty worst list.
 * A heading over an empty table reads as a rendering failure, so the side is
 * dropped instead.
 */

import { describe, expect, it } from 'vitest';
import { calculate } from '../../src/core/fifo';
import { reconcile } from '../../src/core/reconcile';
import type { Operation } from '../../src/core/operation';
import { translatorFor } from '../../src/ui/i18n';
import type { ReportContext } from '../../src/ui/views/common';
import { topFlopSection } from '../../src/ui/views/breakdown';
import { op } from '../helpers/operations';

/** One position per symbol, closed at the profit given. */
function account(closures: Array<[symbol: string, proceeds: string]>): Operation[] {
  return [
    op('2024-01-02', 'CASH', 'CUSTOMER_INBOUND', { amount: '10000.00' }),
    ...closures.flatMap(([symbol, proceeds]) => [
      op('2024-01-03', 'TRADING', 'BUY', {
        symbol,
        name: `Security ${symbol}`,
        shares: '10',
        amount: '-100.00',
        assetClass: 'STOCK',
      }),
      op('2024-03-07', 'TRADING', 'SELL', {
        symbol,
        name: `Security ${symbol}`,
        shares: '-10',
        amount: proceeds,
        assetClass: 'STOCK',
      }),
    ]),
  ];
}

function render(operations: Operation[]): HTMLElement | null {
  const report = calculate(operations);
  const context: ReportContext = {
    operations,
    report,
    reconciliation: reconcile(operations, report),
    language: 'it',
    t: translatorFor('it'),
  };
  return topFlopSection(context);
}

function headings(root: HTMLElement): string[] {
  return [...root.querySelectorAll('.ranking h3')].map((h) => h.textContent ?? '');
}

describe('the best and worst rankings', () => {
  const t = translatorFor('it');

  it('shows both sides when something gained and something lost', () => {
    const root = render(
      account([
        ['AAA', '150.00'],
        ['BBB', '80.00'],
        ['CCC', '130.00'],
        ['DDD', '60.00'],
      ]),
    );

    expect(root).not.toBeNull();
    expect(headings(root!)).toEqual([t('topFlop.top'), t('topFlop.flop')]);
  });

  it('drops the worst side rather than heading an empty table', () => {
    const root = render(
      account([
        ['AAA', '150.00'],
        ['BBB', '120.00'],
        ['CCC', '130.00'],
        ['DDD', '110.00'],
      ]),
    );

    expect(root).not.toBeNull();
    expect(headings(root!)).toEqual([t('topFlop.top')]);
    expect(root!.textContent).not.toContain(t('topFlop.flop'));
  });

  it('never lists a security under both headings', () => {
    const root = render(
      account([
        ['AAA', '150.00'],
        ['BBB', '80.00'],
        ['CCC', '130.00'],
        ['DDD', '60.00'],
      ]),
    );
    const rankings = [...root!.querySelectorAll('.ranking')];
    const symbolsOf = (side: Element): string[] =>
      [...side.querySelectorAll('tbody tr')].map((row) => row.children[0]?.textContent ?? '');

    const best = symbolsOf(rankings[0]!);
    const worst = symbolsOf(rankings[1]!);
    expect(best.filter((symbol) => worst.includes(symbol))).toEqual([]);
  });
});
