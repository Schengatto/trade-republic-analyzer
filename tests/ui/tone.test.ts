// @vitest-environment jsdom

/**
 * A figure is coloured by what it says, not by what it holds.
 *
 * Every tone helper used to ask `isZero()` of the raw Decimal while the text
 * beside it was rounded to two decimals. A residue far below a cent therefore
 * printed "0,00 €" in the loss colour — most visibly in the cash
 * reconciliation, where a red zero sat directly under a green "balanced".
 *
 * The reconciliation is the case that matters, because it is the one figure
 * whose whole job is to say whether the report can be trusted, and it tolerates
 * exactly this residue: `reconcile` calls the account balanced when the
 * difference is under a cent.
 */

import { describe, expect, it } from 'vitest';
import { Decimal } from 'decimal.js';
import { calculate } from '../../src/core/fifo';
import { reconcile } from '../../src/core/reconcile';
import type { Operation } from '../../src/core/operation';
import { translatorFor } from '../../src/ui/i18n';
import { deductionCell, signClass, signedCell, signedPercentCell } from '../../src/ui/views/common';
import type { ReportContext } from '../../src/ui/views/common';
import { reconciliationSection } from '../../src/ui/views/reconciliation';
import { op } from '../helpers/operations';

/** Smaller than half a cent: prints as zero at the two decimals shown. */
const RESIDUE = new Decimal('-0.000000004');

/** Intl separates the amount from the currency with U+00A0, not a space. */
const ZERO_EUR = '0,00 €';

describe('a value that prints as zero is never coloured', () => {
  it('gives a sub-cent residue the neutral class, not the loss colour', () => {
    expect(signClass(RESIDUE)).toBe('is-neutral');
  });

  it('gives a sub-cent residue a neutral table cell', () => {
    expect(signedCell('it', RESIDUE)).toEqual({ text: ZERO_EUR, tone: 'neutral' });
  });

  it('gives a sub-cent percentage a neutral table cell', () => {
    expect(signedPercentCell('it', RESIDUE)).toEqual({ text: '0,00%', tone: 'neutral' });
  });

  it('gives a sub-cent deduction a neutral table cell', () => {
    expect(deductionCell('it', RESIDUE.abs())).toEqual({ text: ZERO_EUR, tone: 'neutral' });
  });

  it('still colours a figure that prints as one cent', () => {
    expect(signClass(new Decimal('-0.01'))).toBe('is-negative');
    expect(signClass(new Decimal('0.01'))).toBe('is-positive');
  });
});

describe('the reconciliation difference agrees with its own verdict', () => {
  /**
   * A sale whose lots divide unevenly: the per-unit cost cannot be written
   * exactly at any finite precision, so the difference lands just off zero
   * while staying far inside the tolerance `reconcile` allows.
   */
  const ACCOUNT: Operation[] = [
    op('2024-01-02', 'CASH', 'CUSTOMER_INBOUND', { amount: '1000.00' }),
    op('2024-01-03', 'TRADING', 'BUY', { shares: '3', amount: '-100.00', assetClass: 'STOCK' }),
    op('2024-02-05', 'TRADING', 'SELL', { shares: '-1', amount: '40.00', assetClass: 'STOCK' }),
  ];

  function render(difference: Decimal): HTMLElement {
    const report = calculate(ACCOUNT);
    const reconciliation = reconcile(ACCOUNT, report);
    const context: ReportContext = {
      operations: ACCOUNT,
      report,
      reconciliation: { ...reconciliation, difference, balanced: difference.abs().lt('0.01') },
      language: 'it',
      t: translatorFor('it'),
    };
    return reconciliationSection(context);
  }

  function differenceCell(root: HTMLElement): HTMLElement {
    const cells = [...root.querySelectorAll('dd')];
    return cells[cells.length - 1]!;
  }

  it('does not paint the difference as a loss while the verdict says balanced', () => {
    const root = render(RESIDUE);

    expect(root.querySelector('.verdict--ok')).not.toBeNull();
    const cell = differenceCell(root);
    expect(cell.textContent).toBe(ZERO_EUR);
    expect(cell.className).not.toContain('is-negative');
  });

  it('still paints a real shortfall as a loss', () => {
    const root = render(new Decimal('-12.34'));

    expect(root.querySelector('.verdict--bad')).not.toBeNull();
    expect(differenceCell(root).className).toContain('is-negative');
  });
});
