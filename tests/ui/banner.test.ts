// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { calculate } from '../../src/core/fifo';
import { reconcile } from '../../src/core/reconcile';
import type { Operation } from '../../src/core/operation';
import { type Language, translatorFor } from '../../src/ui/i18n';
import { banners } from '../../src/ui/views/banner';
import type { ReportContext } from '../../src/ui/views/common';
import { op } from '../helpers/operations';

/**
 * The engine reports an anomaly as a code and its numbers; the sentence the
 * reader sees is built here. Before this split, an Italian reader was handed
 * `AAA: sold 10 units with no holdings to cover` — English, written in
 * `src/core`, printed verbatim.
 */
describe('anomaly banner', () => {
  /** A sale of 10.5 units against an account that never bought any. */
  const UNCOVERED: Operation[] = [
    op('2024-01-02', 'CASH', 'CUSTOMER_INBOUND', { amount: '1000.00' }),
    op('2024-02-01', 'TRADING', 'SELL', { shares: '-10.5', amount: '150.00' }),
  ];

  function render(language: Language, operations: Operation[] = UNCOVERED): HTMLElement {
    const report = calculate(operations);
    const context: ReportContext = {
      operations,
      report,
      reconciliation: reconcile(operations, report),
      language,
      t: translatorFor(language),
    };
    const root = banners(context);
    if (!root) throw new Error('expected a banner for an account with an anomaly');
    return root;
  }

  function items(root: HTMLElement): string[] {
    return [...root.querySelectorAll('.banner__list li')].map((li) => li.textContent ?? '');
  }

  it('states an uncovered sale in Italian', () => {
    const [line, ...rest] = items(render('it'));
    expect(rest).toEqual([]);
    expect(line).toContain('AAA');
    // The quantity is a number for a reader, not `Decimal.toString()` output:
    // an Italian decimal separator, not the engine's dot.
    expect(line).toContain('10,5');
    expect(line).not.toContain('10.5');
  });

  it('states the same anomaly in English', () => {
    const [line] = items(render('en'));
    expect(line).toContain('AAA');
    expect(line).toContain('10.5');
  });

  it('leaves no English in the Italian banner', () => {
    // The exact words the engine used to hardcode.
    expect(items(render('it')).join(' ')).not.toMatch(/sold|units|no holdings/);
  });

  it('states an unmatched free-lot cancellation in both languages', () => {
    const operations: Operation[] = [
      op('2024-01-01', 'TRADING', 'BUY', { shares: '10', amount: '-100.00' }),
      op('2024-01-03', 'CORPORATE_ACTION', 'BONUS_ISSUE_CANCELLED', { shares: '-5', amount: '' }),
    ];
    expect(items(render('it', operations))[0]).toContain('AAA');
    expect(items(render('it', operations)).join(' ')).not.toMatch(/bonus cancellation|free lot/);
    expect(items(render('en', operations))[0]).toContain('AAA');
  });
});
