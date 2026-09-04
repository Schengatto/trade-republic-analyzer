// @vitest-environment jsdom

/**
 * The stacked bar chart, checked as geometry rather than as pixels.
 *
 * The thing worth guarding is that a segment lands where its value says: a
 * stack that silently drops a segment, or draws a negative one above the
 * baseline, still looks like a chart.
 */

import { describe, expect, it } from 'vitest';
import {
  barChart,
  horizontalBarChart,
  stackedBarChart,
  type StackedColumn,
} from '../../src/ui/chart/bars';

function host(): HTMLElement {
  const node = document.createElement('div');
  document.body.append(node);
  return node;
}

function render(data: StackedColumn[]): SVGSVGElement | null {
  return stackedBarChart(
    {
      data,
      formatValue: (value) => value.toFixed(2),
      formatTick: (value) => value.toFixed(0),
      title: 'Composition',
    },
    host(),
  );
}

/** The drawn segments of the nth column, in document order. */
function segments(root: SVGSVGElement): { label: string; y: number; height: number }[] {
  return [...root.querySelectorAll('rect.chart__segment')].map((node) => ({
    label: node.getAttribute('aria-label') ?? '',
    y: Number(node.getAttribute('y')),
    height: Number(node.getAttribute('height')),
  }));
}

/** The drawn segment carrying a given series name. */
function named(
  root: SVGSVGElement,
  name: string,
): { label: string; y: number; height: number } | undefined {
  return segments(root).find((segment) => segment.label.includes(`— ${name}:`));
}

function baselineOf(root: SVGSVGElement): number {
  const axis = [...root.querySelectorAll('line')].find(
    (line) => line.getAttribute('stroke') === 'var(--axis)',
  );
  return Number(axis?.getAttribute('y1'));
}

const COLUMN: StackedColumn = {
  label: '2024-01',
  segments: [
    { key: 'trading', label: 'Trading', value: 100, color: 'var(--series-1)' },
    { key: 'dividends', label: 'Dividends', value: 40, color: 'var(--series-2)' },
    { key: 'charges', label: 'Charges', value: -30, color: 'var(--series-5)' },
  ],
};

describe('stackedBarChart', () => {
  it('draws nothing at all when there is no data', () => {
    expect(render([])).toBeNull();
  });

  it('stacks positives above the baseline and negatives below it', () => {
    const root = render([COLUMN])!;
    const baseline = baselineOf(root);
    const trading = named(root, 'Trading')!;
    const dividends = named(root, 'Dividends')!;
    const charges = named(root, 'Charges')!;

    // y grows downward: a positive segment ends above the baseline.
    expect(trading.y + trading.height).toBeLessThanOrEqual(baseline);
    expect(dividends.y + dividends.height).toBeLessThanOrEqual(trading.y + 3);
    expect(charges.y).toBeGreaterThanOrEqual(baseline);
  });

  it('sizes each segment by its own value, not by the column total', () => {
    const root = render([COLUMN])!;
    const trading = named(root, 'Trading')!;
    const dividends = named(root, 'Dividends')!;
    // 100 against 40, allowing for the 2px surface gap taken off each.
    expect(trading.height - dividends.height).toBeGreaterThan(30);
  });

  it('keeps both arms of a column that nets to zero inside the plot', () => {
    // The month made 100 and paid 100. Scaling to the net would collapse it to
    // a flat line and hide the only thing this chart exists to show.
    const root = render([
      {
        label: '2024-02',
        segments: [
          { key: 'trading', label: 'Trading', value: 100, color: 'var(--series-1)' },
          { key: 'charges', label: 'Charges', value: -100, color: 'var(--series-5)' },
        ],
      },
    ])!;
    const drawn = segments(root);
    expect(drawn).toHaveLength(2);
    for (const segment of drawn) expect(segment.height).toBeGreaterThan(20);
  });

  it('skips a segment worth nothing instead of drawing a coloured sliver', () => {
    const root = render([
      {
        label: '2024-03',
        segments: [
          { key: 'trading', label: 'Trading', value: 50, color: 'var(--series-1)' },
          { key: 'dividends', label: 'Dividends', value: 0, color: 'var(--series-2)' },
        ],
      },
    ])!;
    expect(segments(root).map((s) => s.label)).toEqual(['2024-03 — Trading: 50.00']);
  });

  it('leaves a month with no activity blank rather than inventing a bar', () => {
    const root = render([
      { label: '2024-04', segments: [{ key: 'trading', label: 'Trading', value: 0, color: 'x' }] },
    ])!;
    expect(segments(root)).toHaveLength(0);
    // The month still exists on the axis: the gap is the information.
    expect(root.textContent).toContain('2024-04');
  });

  it('names the segment and its own value in the accessible label', () => {
    expect(named(render([COLUMN])!, 'Charges')?.label).toBe('2024-01 — Charges: -30.00');
  });

  it('gives every segment its own keyboard stop', () => {
    const root = render([COLUMN])!;
    const focusable = root.querySelectorAll('rect.chart__segment[tabindex="0"]');
    expect(focusable).toHaveLength(3);
  });
});

describe('horizontalBarChart', () => {
  function ranking(): SVGSVGElement {
    return horizontalBarChart(
      {
        data: [{ label: 'Acme', value: 50, color: '#eb6834' }],
        formatValue: (value) => value.toFixed(2),
        formatTick: (value) => value.toFixed(0),
        valueLabel: 'Profit',
      },
      host(),
    )!;
  }

  /**
   * The endpoint label is text, and a colour picked to be seen as an area is not
   * a colour that can be read at 11px: the four palettes measured 3.20:1 to
   * 4.42:1 when this label wore `datum.color`. It takes --ink-secondary from the
   * stylesheet now, which only holds while no attribute overrides it — an
   * inline `fill` beats the class in every browser.
   */
  it('leaves the endpoint label its stylesheet ink instead of the bar colour', () => {
    const root = ranking();
    const label = root.querySelector('text.chart__endpoint')!;
    expect(label.textContent).toBe('50.00');
    expect(label.getAttribute('fill')).toBeNull();
    // The bar itself still carries the colour, so nothing was lost by moving it.
    expect(root.querySelector('rect.chart__bar')!.getAttribute('fill')).toBe('#eb6834');
  });
});

/**
 * The count axis on "Trade rows per month".
 *
 * A count is a whole number, so every gridline on its axis has to carry a
 * different whole number. With a small domain the 1-2-5 step lands on 0.5 and
 * the integer formatter collapses the halves onto their neighbours, so the
 * printed axis read "2, 2, 1, 1, 0" — five lines, three values, and no way for
 * a reader to tell which of the two lines labelled 2 means two.
 */
describe('barChart tick labels', () => {
  function counts(values: number[]): SVGSVGElement {
    return barChart(
      {
        data: values.map((value, index) => ({
          label: `M${index}`,
          value,
          color: 'var(--series-1)',
        })),
        formatValue: (value) => String(Math.round(value)),
        // The real chart formats ticks with formatInteger, which rounds.
        formatTick: (value) => String(Math.round(value)),
        wholeTicks: true,
        valueLabel: 'Rows',
      },
      host(),
    )!;
  }

  function tickLabels(root: SVGSVGElement): string[] {
    return [...root.querySelectorAll('text.chart__tick')]
      .filter((node) => node.getAttribute('text-anchor') === 'end')
      .map((node) => node.textContent ?? '');
  }

  it('never labels two gridlines with the same count', () => {
    const labels = tickLabels(counts([2, 0, 2, 0, 0]));
    expect(labels.length).toBeGreaterThan(1);
    expect(new Set(labels).size, `duplicated tick labels: ${labels.join(', ')}`).toBe(labels.length);
  });

  it('holds for every small count a month can produce', () => {
    for (const peak of [1, 2, 3, 4, 6, 7, 9]) {
      const labels = tickLabels(counts([peak, 0]));
      expect(new Set(labels).size, `peak ${peak} gave: ${labels.join(', ')}`).toBe(labels.length);
    }
  });

  /**
   * The floor is opt-in, and a chart that measures money needs the fractions:
   * asserting they survive is what keeps the fix from being applied to every
   * axis on the next pass.
   */
  it('leaves a money axis its fractional steps', () => {
    const root = barChart(
      {
        data: [{ label: 'M', value: 2, color: 'var(--series-1)' }],
        formatValue: (value) => value.toFixed(2),
        formatTick: (value) => value.toFixed(2),
        valueLabel: 'Profit',
      },
      host(),
    )!;
    expect(tickLabels(root)).toContain('0.50');
  });
});
