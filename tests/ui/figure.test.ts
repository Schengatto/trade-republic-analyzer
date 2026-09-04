// @vitest-environment jsdom

/**
 * The figure frame. What is worth guarding here is not the drawing but the
 * contract around it: the plot is rebuilt from a builder, and the table that
 * stands in for the plot is always there and always complete.
 */

import { describe, expect, it } from 'vitest';
import { figure } from '../../src/ui/chart/figure';
import { translatorFor } from '../../src/ui/i18n';

const t = translatorFor('en');

function plotNode(text: string): HTMLElement {
  const node = document.createElement('div');
  node.className = 'plot-host';
  node.textContent = text;
  return node;
}

describe('figure', () => {
  it('mounts what the plot builder returns', () => {
    const node = figure({
      t,
      title: 'Profit',
      plot: () => plotNode('drawn'),
      table: { columns: ['Month'], rows: [['Jan']] },
    });

    expect(node.querySelector('.figure__plot')?.textContent).toBe('drawn');
  });

  it('falls back to the empty message when the builder draws nothing', () => {
    const node = figure({
      t,
      title: 'Profit',
      plot: () => null,
      table: { columns: ['Month'], rows: [] },
    });

    expect(node.querySelector('.figure__empty')?.textContent).toBe(t('chart.empty'));
  });

  it('keeps the table alongside the plot', () => {
    const node = figure({
      t,
      title: 'Profit',
      plot: () => plotNode('drawn'),
      table: { columns: ['Month', 'Profit'], rows: [['Jan', '1,00 €']] },
    });

    const cells = [...node.querySelectorAll('table.data-table tbody td')].map((c) => c.textContent);
    expect(cells).toEqual(['Jan', '1,00 €']);
  });
});

function keyedFigure(): HTMLElement {
  return figure({
    t,
    title: 'Composition',
    legend: [
      { key: 'trading', label: 'Trading', color: 'var(--series-1)' },
      { key: 'charges', label: 'Charges', color: 'var(--series-5)' },
    ],
    // The builder reports what it was asked to draw, so a test can read the
    // filtering without parsing an SVG.
    plot: (hidden) => plotNode(['trading', 'charges'].filter((k) => !hidden.has(k)).join(',')),
    table: { columns: ['Month', 'Trading', 'Charges'], rows: [['Jan', '1,00 €', '2,00 €']] },
  });
}

function toggles(node: HTMLElement): HTMLButtonElement[] {
  return [...node.querySelectorAll<HTMLButtonElement>('button.legend__toggle')];
}

describe('legend toggles', () => {
  it('starts with every series shown', () => {
    const node = keyedFigure();
    expect(node.querySelector('.figure__plot')?.textContent).toBe('trading,charges');
    expect(toggles(node).map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'true']);
  });

  it('hides the clicked series and rebuilds the plot', () => {
    const node = keyedFigure();
    toggles(node)[0]!.click();

    expect(node.querySelector('.figure__plot')?.textContent).toBe('charges');
    expect(toggles(node)[0]!.getAttribute('aria-pressed')).toBe('false');
    expect(toggles(node)[0]!.closest('.legend__item')?.classList.contains('legend__item--off')).toBe(true);
  });

  it('brings the series back on a second click', () => {
    const node = keyedFigure();
    toggles(node)[0]!.click();
    toggles(node)[0]!.click();

    expect(node.querySelector('.figure__plot')?.textContent).toBe('trading,charges');
    expect(toggles(node)[0]!.getAttribute('aria-pressed')).toBe('true');
  });

  it('refuses to hide the last visible series', () => {
    const node = keyedFigure();
    toggles(node)[0]!.click();

    // Only "charges" is left: its button is disabled rather than leaving the
    // reader with an empty frame and no obvious way back.
    expect(toggles(node)[1]!.disabled).toBe(true);
    expect(toggles(node)[0]!.disabled).toBe(false);
  });

  it('never filters the table', () => {
    const node = keyedFigure();
    const before = node.querySelector('table.data-table')!.textContent;
    toggles(node)[0]!.click();

    expect(node.querySelector('table.data-table')!.textContent).toBe(before);
  });

  it('leaves a keyless legend static', () => {
    const node = figure({
      t,
      title: 'Trend',
      legend: [
        { label: 'Net', color: 'var(--series-1)' },
        { label: 'Trading', color: 'var(--series-2)' },
      ],
      plot: () => plotNode('drawn'),
      table: { columns: ['Date'], rows: [['2024-01-02']] },
    });

    expect(toggles(node)).toHaveLength(0);
    expect(node.querySelectorAll('.legend__item')).toHaveLength(2);
  });
});

describe('controls', () => {
  it('rebuilds both the plot and the table when a control fires', () => {
    let month = 'Jan';
    const node = figure({
      t,
      title: 'One month',
      controls: (rebuild) => {
        const select = document.createElement('select');
        for (const name of ['Jan', 'Feb']) {
          const option = document.createElement('option');
          option.value = name;
          option.textContent = name;
          select.append(option);
        }
        select.addEventListener('change', () => {
          month = select.value;
          rebuild();
        });
        return select;
      },
      plot: () => plotNode(month),
      table: () => ({ columns: ['Month'], rows: [[month]] }),
    });

    expect(node.querySelector('.figure__plot')?.textContent).toBe('Jan');

    const select = node.querySelector('select')!;
    select.value = 'Feb';
    select.dispatchEvent(new Event('change'));

    expect(node.querySelector('.figure__plot')?.textContent).toBe('Feb');
    expect(node.querySelector('table.data-table tbody td')?.textContent).toBe('Feb');
  });

  it('leaves the table open across a rebuild', () => {
    let month = 'Jan';
    const node = figure({
      t,
      title: 'One month',
      controls: (rebuild) => {
        const button = document.createElement('button');
        button.addEventListener('click', () => {
          month = 'Feb';
          rebuild();
        });
        return button;
      },
      plot: () => plotNode(month),
      table: () => ({ columns: ['Month'], rows: [[month]] }),
    });

    const details = node.querySelector('details.figure__table')!;
    details.setAttribute('open', '');
    node.querySelector('button')!.click();

    expect(details.hasAttribute('open')).toBe(true);
  });
});
