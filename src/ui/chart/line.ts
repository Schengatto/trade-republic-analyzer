/**
 * The cumulative trend chart: several series, one shared y axis.
 *
 * There is deliberately no option for a second axis. Two scales on one plot
 * make the crossings arbitrary and invent a correlation the data does not
 * contain; series that do not share a scale belong in separate charts.
 */

import { svg } from '../dom';
import { extent, includeZero, linePath, linearScale, niceTicks, type Point } from './geometry';
import { AXIS, GRID, INK_MUTED, SURFACE } from './palette';
import { createTooltip } from './tooltip';

export interface LineSeries {
  label: string;
  color: string;
  /** One value per x position; parallel to `xValues`. */
  values: number[];
}

export interface LineChartSpec {
  /** Numeric x positions, ascending — day numbers for a date axis. */
  xValues: number[];
  /** Axis and tooltip label for the x position at `index`. */
  xLabel: (index: number) => string;
  series: LineSeries[];
  formatValue: (value: number) => string;
  /** Shorter form for axis ticks, where space is tight. */
  formatTick: (value: number) => string;
}

const WIDTH = 880;
const HEIGHT = 380;
// The right margin holds the direct labels on the final values; the bottom
// margin holds the x-axis band, which must be inside the box so the card never
// grows a nested scrollbar.
const MARGIN = { top: 20, right: 104, bottom: 44, left: 76 };
const PLOT_WIDTH = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom;

export function lineChart(spec: LineChartSpec, container: HTMLElement): SVGSVGElement | null {
  const { xValues, series } = spec;
  if (xValues.length === 0 || series.length === 0) return null;

  const x = linearScale(extent(xValues), [MARGIN.left, MARGIN.left + PLOT_WIDTH]);
  const yDomain = includeZero(extent(series.flatMap((s) => s.values)));
  const y = linearScale(yDomain, [MARGIN.top + PLOT_HEIGHT, MARGIN.top]);
  const yTicks = niceTicks(yDomain[0], yDomain[1], 5);

  const root = svg('svg', {
    viewBox: `0 0 ${WIDTH} ${HEIGHT}`,
    class: 'chart chart--line',
    preserveAspectRatio: 'xMidYMid meet',
    role: 'img',
    'aria-label': series.map((s) => s.label).join(', '),
  });

  // --- grid and axes: solid hairlines, one shade off the surface ----------
  for (const tick of yTicks) {
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
        [spec.formatTick(tick)],
      ),
    );
  }

  for (const index of tickIndexes(xValues.map(x), 6)) {
    root.append(
      svg(
        'text',
        {
          x: x(xValues[index]!),
          y: MARGIN.top + PLOT_HEIGHT + 24,
          'text-anchor': 'middle',
          class: 'chart__tick',
          fill: INK_MUTED,
        },
        [spec.xLabel(index)],
      ),
    );
  }

  // --- the series ---------------------------------------------------------
  const pointsBySeries = series.map((s) =>
    s.values.map((value, index): Point => ({ x: x(xValues[index]!), y: y(value) })),
  );

  series.forEach((s, seriesIndex) => {
    root.append(
      svg('path', {
        d: linePath(pointsBySeries[seriesIndex]!),
        fill: 'none',
        stroke: s.color,
        'stroke-width': 2,
        'stroke-linejoin': 'round',
        'stroke-linecap': 'round',
        class: 'chart__line',
      }),
    );
  });

  // Direct labels on the final value only — never a number on every point.
  // Two series that end close together would otherwise print one label over
  // the other, so the label rows are spread apart while the dots stay put.
  const endpoints = series
    .map((s, seriesIndex) => ({
      point: pointsBySeries[seriesIndex]!.at(-1),
      value: s.values.at(-1),
      color: s.color,
    }))
    .filter((entry) => entry.point !== undefined && entry.value !== undefined);

  for (const entry of spread(endpoints.map((e) => e.point!.y), LABEL_ROW).map((labelY, index) => ({
    ...endpoints[index]!,
    labelY,
  }))) {
    root.append(
      svg('circle', {
        cx: entry.point!.x,
        cy: entry.point!.y,
        r: 4,
        fill: entry.color,
        stroke: SURFACE,
        'stroke-width': 2,
      }),
      svg(
        'text',
        {
          x: entry.point!.x + 10,
          y: entry.labelY + 4,
          class: 'chart__endpoint',
          fill: entry.color,
        },
        [spec.formatValue(entry.value!)],
      ),
    );
  }

  // --- crosshair and hover readout ----------------------------------------
  const crosshair = svg('line', {
    y1: MARGIN.top,
    y2: MARGIN.top + PLOT_HEIGHT,
    stroke: AXIS,
    'stroke-width': 1,
    class: 'chart__crosshair',
  });
  crosshair.setAttribute('visibility', 'hidden');
  root.append(crosshair);

  const markers = series.map((s) => {
    const marker = svg('circle', {
      r: 5,
      fill: s.color,
      stroke: SURFACE,
      'stroke-width': 2,
      class: 'chart__marker',
    });
    marker.setAttribute('visibility', 'hidden');
    root.append(marker);
    return marker;
  });

  const tooltip = createTooltip(container);

  const showAt = (index: number): void => {
    const px = x(xValues[index]!);
    crosshair.setAttribute('x1', String(px));
    crosshair.setAttribute('x2', String(px));
    crosshair.setAttribute('visibility', 'visible');

    let top = Infinity;
    markers.forEach((marker, seriesIndex) => {
      const point = pointsBySeries[seriesIndex]![index]!;
      marker.setAttribute('cx', String(point.x));
      marker.setAttribute('cy', String(point.y));
      marker.setAttribute('visibility', 'visible');
      top = Math.min(top, point.y);
    });

    tooltip.show(
      px / WIDTH,
      top / HEIGHT,
      spec.xLabel(index),
      series.map((s) => ({
        label: s.label,
        value: spec.formatValue(s.values[index]!),
        color: s.color,
      })),
    );
  };

  const hide = (): void => {
    crosshair.setAttribute('visibility', 'hidden');
    for (const marker of markers) marker.setAttribute('visibility', 'hidden');
    tooltip.hide();
  };

  // One overlay covering the whole plot, so the hit target is the full column
  // rather than the 2px line itself.
  const overlay = svg('rect', {
    x: MARGIN.left,
    y: MARGIN.top,
    width: PLOT_WIDTH,
    height: PLOT_HEIGHT,
    fill: 'transparent',
    tabindex: 0,
    role: 'application',
    'aria-label': series.map((s) => s.label).join(', '),
  });

  let focused = Math.max(0, xValues.length - 1);

  overlay.addEventListener('pointermove', (event) => {
    const box = root.getBoundingClientRect();
    if (box.width === 0) return;
    const viewBoxX = ((event.clientX - box.left) / box.width) * WIDTH;
    focused = nearestIndex(xValues, x, viewBoxX);
    showAt(focused);
  });
  overlay.addEventListener('pointerleave', hide);
  overlay.addEventListener('blur', hide);
  overlay.addEventListener('focus', () => showAt(focused));
  // Keyboard reaches the same readout as the pointer.
  overlay.addEventListener('keydown', (event) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    focused = Math.min(xValues.length - 1, Math.max(0, focused + step));
    showAt(focused);
  });

  root.append(overlay);
  return root;
}

function nearestIndex(xValues: number[], x: (v: number) => number, target: number): number {
  let best = 0;
  let bestDistance = Infinity;
  for (let index = 0; index < xValues.length; index += 1) {
    const distance = Math.abs(x(xValues[index]!) - target);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  }
  return best;
}

/** Minimum vertical distance between two endpoint labels, in viewBox units. */
const LABEL_ROW = 14;

/**
 * Axis label indexes, chosen by pixel position rather than by index.
 *
 * The x axis is a date axis, so evenly spaced *indexes* bunch up wherever the
 * account traded often — which is exactly where labels then overlap. Candidates
 * are spread across the drawn width and any that lands too close to the one
 * before it is dropped.
 */
function tickIndexes(positions: number[], count: number): number[] {
  if (positions.length === 0) return [];
  if (positions.length <= count) return positions.map((_, index) => index);

  const step = (positions.length - 1) / (count - 1);
  const candidates = Array.from({ length: count }, (_, index) => Math.round(index * step));

  const kept: number[] = [];
  let lastX = -Infinity;
  for (const index of candidates) {
    const at = positions[index]!;
    if (at - lastX < MIN_LABEL_GAP) continue;
    kept.push(index);
    lastX = at;
  }
  // The last point anchors the axis; if it was dropped, swap it for its
  // neighbour rather than leaving the axis unlabelled at its right edge.
  const last = positions.length - 1;
  if (kept.at(-1) !== last) {
    if (positions[last]! - positions[kept.at(-1) ?? 0]! < MIN_LABEL_GAP) kept.pop();
    kept.push(last);
  }
  return kept;
}

/** Width reserved for one date label, in viewBox units. */
const MIN_LABEL_GAP = 96;

/**
 * Push values apart so none sits within `gap` of its neighbour, keeping their
 * order and their rough position. Used only for label rows, never for marks.
 */
function spread(values: number[], gap: number): number[] {
  const order = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
  const result = new Array<number>(values.length);
  let previous = -Infinity;
  for (const entry of order) {
    const placed = Math.max(entry.value, previous + gap);
    result[entry.index] = placed;
    previous = placed;
  }
  return result;
}
