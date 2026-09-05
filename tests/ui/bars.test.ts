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
  groupedRowChart,
  horizontalBarChart,
  stackedBarChart,
  type GroupedRow,
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

/**
 * The grouped rows on «Capital and return».
 *
 * Two quantities per month, side by side, on a metre the caller fixes over the
 * whole history. What is worth guarding is what a reader cannot check by
 * looking: that the metre really is the caller's, that the pair reads as a
 * pair, and that each series speaks with its own sign convention.
 */
describe('groupedRowChart', () => {
  const CAPITAL = {
    label: 'Capital',
    color: () => 'var(--series-1)',
    format: (value: number) => `${value.toFixed(2)} EUR`,
  };
  const RESULT = {
    label: 'Result',
    color: (value: number) => (value < 0 ? 'var(--pole-negative)' : 'var(--pole-positive)'),
    format: (value: number) => `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(2)} EUR`,
  };

  function render(rows: GroupedRow[], domain: [number, number]): SVGSVGElement {
    const root = groupedRowChart(
      {
        rows,
        series: [CAPITAL, RESULT],
        domain,
        formatTick: (value) => value.toFixed(0),
        title: 'Capital and result',
      },
      host(),
    );
    if (!root) throw new Error('no chart');
    return root;
  }

  /** The drawn bars, in document order: one group after another. */
  function bars(
    root: SVGSVGElement,
  ): { label: string; x: number; y: number; width: number; height: number }[] {
    return [...root.querySelectorAll('rect.chart__bar')].map((node) => ({
      label: node.getAttribute('aria-label') ?? '',
      x: Number(node.getAttribute('x')),
      y: Number(node.getAttribute('y')),
      width: Number(node.getAttribute('width')),
      height: Number(node.getAttribute('height')),
    }));
  }

  it('draws nothing without rows, and nothing without series', () => {
    const base = { domain: [0, 10] as [number, number], formatTick: String, title: 'T' };
    expect(groupedRowChart({ ...base, rows: [], series: [CAPITAL] }, host())).toBeNull();
    expect(
      groupedRowChart({ ...base, rows: [{ label: 'Jan', values: [1] }], series: [] }, host()),
    ).toBeNull();
  });

  /**
   * The reason `domain` is an argument at all.
   *
   * The chart shows one year of a longer history, and the caller measures the
   * metre over every year. Measured from the visible rows instead, the same
   * value would be drawn at two different lengths depending on which year is
   * open, and the two years could no longer be compared by eye — which is the
   * only comparison a bar chart makes for free.
   */
  it('scales to the domain it is given, not to the rows it is drawing', () => {
    const row = [{ label: 'Jan', values: [50, 0] }];
    const near = bars(render(row, [0, 100]))[0]!.width;
    const far = bars(render(row, [0, 200]))[0]!.width;
    expect(far).toBeGreaterThan(0);
    expect(near / far).toBeCloseTo(2, 2);
  });

  /**
   * Blue and green sit two pixels apart here for the first time in the report.
   * The order being fixed is what lets a reader who cannot separate the two
   * fills still say which bar is which, so it is a contract and not a detail.
   */
  it('keeps the declared series order inside every group', () => {
    const drawn = bars(render(
      [
        { label: 'Jan', values: [100, 10] },
        { label: 'Feb', values: [80, -5] },
      ],
      [-20, 100],
    ));
    expect(drawn.map((bar) => bar.label)).toEqual([
      'Jan, Capital: 100.00 EUR',
      'Jan, Result: +10.00 EUR',
      'Feb, Capital: 80.00 EUR',
      'Feb, Result: −5.00 EUR',
    ]);
    expect(drawn[0]!.y).toBeLessThan(drawn[1]!.y);
    expect(drawn[2]!.y).toBeLessThan(drawn[3]!.y);
  });

  /** A pair that is no tighter than the gap around it is not read as a pair. */
  it('leaves less room inside a pair than between two months', () => {
    const drawn = bars(render(
      [
        { label: 'Jan', values: [100, 10] },
        { label: 'Feb', values: [80, 5] },
      ],
      [0, 100],
    ));
    const gap = (above: number, below: number): number =>
      drawn[below]!.y - (drawn[above]!.y + drawn[above]!.height);
    expect(gap(0, 1)).toBeGreaterThan(0);
    expect(gap(1, 2)).toBeGreaterThan(gap(0, 1));
  });

  it('draws a loss on the other side of zero', () => {
    const drawn = bars(render([{ label: 'Jan', values: [100, -20] }], [-20, 100]));
    const capital = drawn[0]!;
    const loss = drawn[1]!;
    // The capital starts at the baseline and runs right; the loss ends there and
    // runs left. Drawn rightwards from zero it would lie on top of the capital.
    expect(loss.x).toBeLessThan(capital.x);
    expect(loss.x + loss.width).toBeCloseTo(capital.x, 5);
  });

  /**
   * One hover reads out the whole month, including a figure that is not drawn:
   * the return ties the two bars together, and it has no euro axis to live on.
   */
  it('reads out both bars and the undrawn figures on one hover', () => {
    const container = host();
    const root = groupedRowChart(
      {
        rows: [
          {
            label: 'Jan',
            values: [100, -20],
            readout: [{ label: 'Return', value: '−20.00%' }],
          },
        ],
        series: [CAPITAL, RESULT],
        domain: [-20, 100],
        formatTick: (value) => value.toFixed(0),
        title: 'Capital and result',
      },
      container,
    )!;
    container.append(root);

    root.querySelector('rect.chart__bar')!.dispatchEvent(new Event('pointerenter'));
    const tooltip = container.querySelector('.tooltip')!;
    expect(tooltip.querySelector('.tooltip__title')!.textContent).toBe('Jan');
    expect([...tooltip.querySelectorAll('li')].map((row) => row.textContent)).toEqual([
      'Capital100.00 EUR',
      'Result−20.00 EUR',
      'Return−20.00%',
    ]);
    // The derived figure has no mark on the plot, so it gets no swatch either.
    expect(tooltip.querySelectorAll('.tooltip__swatch')).toHaveLength(2);
  });
});
