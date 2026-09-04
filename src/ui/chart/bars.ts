/**
 * Bar charts, vertical and horizontal.
 *
 * Both always include the zero baseline in the domain: a bar is read by
 * comparing lengths, so an axis starting at the smallest value would exaggerate
 * every difference.
 */

import { svg } from '../dom';
import { type Band, bands, extent, includeZero, linearScale, niceTicks } from './geometry';
import { AXIS, GRID, INK_MUTED, POLE_NEUTRAL } from './palette';
import { createTooltip } from './tooltip';

export interface BarDatum {
  /** Axis label. */
  label: string;
  value: number;
  /** Follows the entity or the sign — never the rank. */
  color: string;
}

export interface BarChartSpec {
  data: BarDatum[];
  formatValue: (value: number) => string;
  formatTick: (value: number) => string;
  /** Names the measure in the hover readout. */
  valueLabel: string;
  /**
   * The measure is counted, so its axis may not step in fractions: half a
   * gridline apart, two ticks would print the same whole number.
   */
  wholeTicks?: boolean;
}

const WIDTH = 880;
const HEIGHT = 340;
const MARGIN = { top: 20, right: 24, bottom: 52, left: 76 };
const PLOT_WIDTH = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom;

/** Width a level x-axis label needs before it starts touching its neighbour. */
const LEVEL_LABEL_WIDTH = 72;

/** Vertical bars over a categorical x axis — months, in this report. */
export function barChart(spec: BarChartSpec, container: HTMLElement): SVGSVGElement | null {
  const { data } = spec;
  if (data.length === 0) return null;

  const domain = includeZero(extent(data.map((d) => d.value)));
  const y = linearScale(domain, [MARGIN.top + PLOT_HEIGHT, MARGIN.top]);
  const ticks = niceTicks(domain[0], domain[1], 5, spec.wholeTicks ? 1 : 0);
  // 2px of surface between neighbouring bars, rather than a stroke around them.
  const columns = bands(data.length, [MARGIN.left, MARGIN.left + PLOT_WIDTH], 2);
  const baseline = y(0);

  const root = svg('svg', {
    viewBox: `0 0 ${WIDTH} ${HEIGHT}`,
    class: 'chart chart--bars',
    preserveAspectRatio: 'xMidYMid meet',
    role: 'img',
    'aria-label': spec.valueLabel,
  });

  horizontalGrid(root, y, ticks, spec.formatTick);

  const tooltip = createTooltip(container);

  data.forEach((datum, index) => {
    const column = columns[index]!;
    const top = Math.min(baseline, y(datum.value));
    const height = Math.max(1, Math.abs(y(datum.value) - baseline));

    const bar = svg('rect', {
      x: column.start,
      y: top,
      width: column.width,
      height,
      // A zero is still drawn, as a hairline marking that the category exists —
      // but in the neutral. A coloured sliver would read as a small value.
      fill: datum.value === 0 ? POLE_NEUTRAL : datum.color,
      // Rounded data-end; the radius is capped so short bars stay rectangular
      // at the baseline rather than turning into lozenges.
      rx: Math.min(4, column.width / 2, height / 2),
      class: 'chart__bar',
      tabindex: 0,
      role: 'listitem',
      'aria-label': `${datum.label}: ${spec.formatValue(datum.value)}`,
    });

    const reveal = (): void =>
      tooltip.show(column.center / WIDTH, top / HEIGHT, datum.label, [
        { label: spec.valueLabel, value: spec.formatValue(datum.value), color: datum.color },
      ]);

    bar.addEventListener('pointerenter', reveal);
    bar.addEventListener('focus', reveal);
    bar.addEventListener('pointerleave', () => tooltip.hide());
    bar.addEventListener('blur', () => tooltip.hide());
    root.append(bar);
  });

  categoryLabels(root, columns, data.map((datum) => datum.label));

  return root;
}

/** Surface left between two stacked fills, so their boundary is never colour alone. */
const SEGMENT_GAP = 2;

export interface StackSegment {
  key: string;
  label: string;
  /** Signed: a negative segment hangs below the baseline instead of adding to the pile. */
  value: number;
  color: string;
}

export interface StackedColumn {
  label: string;
  segments: StackSegment[];
}

export interface StackedBarChartSpec {
  data: StackedColumn[];
  formatValue: (value: number) => string;
  formatTick: (value: number) => string;
  /** Names the whole chart, for a reader who reaches it without the heading. */
  title: string;
}

/**
 * Vertical bars split into signed segments — what a total is made of, month by
 * month.
 *
 * The scale spans each column's two arms separately rather than its net: a
 * month that earned 100 and paid 100 out has a story, and scaling it to its
 * net of zero would draw a flat line over it.
 */
export function stackedBarChart(
  spec: StackedBarChartSpec,
  container: HTMLElement,
): SVGSVGElement | null {
  const { data } = spec;
  if (data.length === 0) return null;

  const arms = data.flatMap((column) => [
    armTotal(column, (value) => value > 0),
    armTotal(column, (value) => value < 0),
  ]);
  const domain = includeZero(extent(arms));
  const y = linearScale(domain, [MARGIN.top + PLOT_HEIGHT, MARGIN.top]);
  const ticks = niceTicks(domain[0], domain[1], 5);
  const columns = bands(data.length, [MARGIN.left, MARGIN.left + PLOT_WIDTH], 2);
  const baseline = y(0);

  const root = svg('svg', {
    viewBox: `0 0 ${WIDTH} ${HEIGHT}`,
    class: 'chart chart--bars',
    preserveAspectRatio: 'xMidYMid meet',
    role: 'img',
    'aria-label': spec.title,
  });

  horizontalGrid(root, y, ticks, spec.formatTick);

  const tooltip = createTooltip(container);

  data.forEach((column, index) => {
    const band = columns[index]!;
    // Each arm grows from the baseline outward, in the order the segments were
    // given: the colour of a segment must follow what it is, never its size.
    let up = 0;
    let down = 0;

    for (const segment of column.segments) {
      // A month that earned nothing from a source gets no mark for it. A
      // one-pixel sliver of colour would read as a small amount.
      if (segment.value === 0) continue;

      const from = segment.value > 0 ? up : down;
      const to = from + segment.value;
      if (segment.value > 0) up = to;
      else down = to;

      const edge = Math.min(y(from), y(to));
      const span = Math.abs(y(to) - y(from));
      // The gap is taken out of the fill, not out of the value: the segment
      // still ends where its number says, it is just drawn a little short.
      const height = Math.max(1, span - SEGMENT_GAP);

      const rect = svg('rect', {
        x: band.start,
        y: segment.value > 0 ? edge : edge + (span - height),
        width: band.width,
        height,
        fill: segment.color,
        rx: Math.min(4, band.width / 2, height / 2),
        class: 'chart__segment',
        tabindex: 0,
        role: 'listitem',
        'aria-label': `${column.label} — ${segment.label}: ${spec.formatValue(segment.value)}`,
      });

      // Hovering one segment reads out the whole column: the question a stack
      // raises is always "and what were the others?".
      const reveal = (): void =>
        tooltip.show(
          band.center / WIDTH,
          edge / HEIGHT,
          column.label,
          column.segments
            .filter((row) => row.value !== 0)
            .map((row) => ({
              label: row.label,
              value: spec.formatValue(row.value),
              color: row.color,
            })),
        );

      rect.addEventListener('pointerenter', reveal);
      rect.addEventListener('focus', reveal);
      rect.addEventListener('pointerleave', () => tooltip.hide());
      rect.addEventListener('blur', () => tooltip.hide());
      root.append(rect);
    }
  });

  categoryLabels(root, columns, data.map((column) => column.label));

  // Redrawn over the fills: the zero line is what tells a cost from a gain, so
  // it must not end up underneath the segments that hang from it.
  root.append(
    svg('line', {
      x1: MARGIN.left,
      x2: MARGIN.left + PLOT_WIDTH,
      y1: baseline,
      y2: baseline,
      stroke: AXIS,
      'stroke-width': 1,
    }),
  );

  return root;
}

function armTotal(column: StackedColumn, keep: (value: number) => boolean): number {
  return column.segments.reduce(
    (total, segment) => (keep(segment.value) ? total + segment.value : total),
    0,
  );
}

/** The value axis: one line per tick, the zero line picked out from the grid. */
function horizontalGrid(
  root: SVGSVGElement,
  y: (value: number) => number,
  ticks: number[],
  formatTick: (value: number) => string,
): void {
  for (const tick of ticks) {
    const at = y(tick);
    root.append(
      svg('line', {
        x1: MARGIN.left,
        x2: MARGIN.left + PLOT_WIDTH,
        y1: at,
        y2: at,
        stroke: tick === 0 ? AXIS : GRID,
        'stroke-width': 1,
      }),
      svg(
        'text',
        {
          x: MARGIN.left - 10,
          y: at + 4,
          'text-anchor': 'end',
          class: 'chart__tick',
          fill: INK_MUTED,
        },
        [formatTick(tick)],
      ),
    );
  }
}

/** The category axis, labelled sparsely enough that the labels stay readable. */
function categoryLabels(root: SVGSVGElement, columns: Band[], labels: string[]): void {
  // Label every nth category: past a dozen ticks the axis turns into a smear.
  const labelEvery = Math.ceil(labels.length / 12);
  const at = MARGIN.top + PLOT_HEIGHT + 22;

  labels.forEach((label, index) => {
    if (index % labelEvery !== 0) return;
    const column = columns[index]!;
    // Tilt only when the labels would otherwise touch. A slanted label is
    // slower to read than a level one, so it is a last resort and not a look.
    const tilted = column.width * labelEvery < LEVEL_LABEL_WIDTH;
    root.append(
      svg(
        'text',
        {
          x: column.center,
          y: at,
          'text-anchor': tilted ? 'end' : 'middle',
          class: 'chart__tick',
          fill: INK_MUTED,
          ...(tilted ? { transform: `rotate(-45 ${column.center} ${at})` } : {}),
        },
        [label],
      ),
    );
  });
}

const H_ROW = 30;
const H_MARGIN = { top: 12, right: 96, bottom: 34, left: 176 };
/** Room kept at each end of the scale for the direct label on the longest bar. */
const VALUE_LABEL_WIDTH = 84;

/**
 * Horizontal bars, for rankings and for categories whose names need room.
 *
 * The height grows with the number of rows instead of being fixed, so labels
 * never collide and the x-axis band is always inside the box.
 */
export function horizontalBarChart(
  spec: BarChartSpec,
  container: HTMLElement,
): SVGSVGElement | null {
  const { data } = spec;
  if (data.length === 0) return null;

  const height = H_MARGIN.top + H_MARGIN.bottom + H_ROW * data.length;
  const plotWidth = WIDTH - H_MARGIN.left - H_MARGIN.right;
  const domain = includeZero(extent(data.map((d) => d.value)));
  // Every bar carries its value just past its end, so the longest bar must stop
  // short of the plot edge — otherwise its label is pushed over the category
  // names on the left, or off the card on the right.
  const x = linearScale(domain, [
    H_MARGIN.left + (domain[0] < 0 ? VALUE_LABEL_WIDTH : 0),
    H_MARGIN.left + plotWidth - (domain[1] > 0 ? VALUE_LABEL_WIDTH : 0),
  ]);
  const ticks = niceTicks(domain[0], domain[1], 4);
  const rows = bands(data.length, [H_MARGIN.top, H_MARGIN.top + H_ROW * data.length], 8);
  const baseline = x(0);

  const root = svg('svg', {
    viewBox: `0 0 ${WIDTH} ${height}`,
    class: 'chart chart--hbars',
    preserveAspectRatio: 'xMidYMid meet',
    role: 'img',
    'aria-label': spec.valueLabel,
  });

  for (const tick of ticks) {
    const at = x(tick);
    root.append(
      svg('line', {
        x1: at,
        x2: at,
        y1: H_MARGIN.top,
        y2: H_MARGIN.top + H_ROW * data.length,
        stroke: tick === 0 ? AXIS : GRID,
        'stroke-width': 1,
      }),
      svg(
        'text',
        {
          x: at,
          y: height - 12,
          'text-anchor': 'middle',
          class: 'chart__tick',
          fill: INK_MUTED,
        },
        [spec.formatTick(tick)],
      ),
    );
  }

  const tooltip = createTooltip(container);

  data.forEach((datum, index) => {
    const row = rows[index]!;
    const left = Math.min(baseline, x(datum.value));
    const width = Math.max(1, Math.abs(x(datum.value) - baseline));

    root.append(
      svg(
        'text',
        {
          x: H_MARGIN.left - 12,
          y: row.center + 4,
          'text-anchor': 'end',
          class: 'chart__tick',
          fill: INK_MUTED,
        },
        [datum.label],
      ),
    );

    const bar = svg('rect', {
      x: left,
      y: row.start,
      width,
      height: row.width,
      fill: datum.value === 0 ? POLE_NEUTRAL : datum.color,
      rx: Math.min(4, width / 2, row.width / 2),
      class: 'chart__bar',
      tabindex: 0,
      role: 'listitem',
      'aria-label': `${datum.label}: ${spec.formatValue(datum.value)}`,
    });

    const reveal = (): void =>
      tooltip.show((left + width) / WIDTH, row.start / height, datum.label, [
        { label: spec.valueLabel, value: spec.formatValue(datum.value), color: datum.color },
      ]);

    bar.addEventListener('pointerenter', reveal);
    bar.addEventListener('focus', reveal);
    bar.addEventListener('pointerleave', () => tooltip.hide());
    bar.addEventListener('blur', () => tooltip.hide());
    root.append(bar);

    // Rankings are short lists, so every bar can carry its value directly —
    // placed outside the bar end, where it can never be clipped by a short bar.
    root.append(
      svg(
        'text',
        {
          x: datum.value < 0 ? left - 8 : left + width + 8,
          y: row.center + 4,
          'text-anchor': datum.value < 0 ? 'end' : 'start',
          class: 'chart__endpoint',
        },
        [spec.formatValue(datum.value)],
      ),
    );
  });

  return root;
}
