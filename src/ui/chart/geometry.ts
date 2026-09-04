/**
 * Plotting geometry: pure number-to-number mapping, no DOM and no domain
 * knowledge. Everything here is about turning a value into a coordinate.
 */

export type Domain = [number, number];
export type Range = [number, number];

export interface Scale {
  (value: number): number;
  readonly domain: Domain;
  readonly range: Range;
}

/**
 * Linear mapping from a data domain onto a pixel range.
 *
 * A flat domain (every value identical, or a single point) maps to the middle
 * of the range: the alternative is a division by zero, which would silently
 * produce `NaN` coordinates and an invisible chart.
 */
export function linearScale(domain: Domain, range: Range): Scale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0;

  const scale = ((value: number): number =>
    span === 0 ? (r0 + r1) / 2 : r0 + ((value - d0) / span) * (r1 - r0)) as {
    (value: number): number;
    domain: Domain;
    range: Range;
  };

  scale.domain = domain;
  scale.range = range;
  return scale;
}

/**
 * Round tick values covering `[min, max]`, stepping in 1-2-5 multiples.
 *
 * Ticks are what the reader uses to estimate a value they are not hovering, so
 * they have to be numbers a person can do mental arithmetic with.
 *
 * `minStep` is a floor on that step, for an axis whose quantity has a smallest
 * meaningful unit. A count is the case: over a 0..2 range the 1-2-5 rule picks
 * 0.5, and an integer formatter then renders 0, 0.5, 1, 1.5, 2 as
 * "0, 1, 1, 2, 2" — five gridlines at five heights carrying three values. Pass
 * a step that is itself round, since it is used as given.
 */
export function niceTicks(min: number, max: number, target = 5, minStep = 0): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0];

  if (min === max) {
    // A flat series still needs an axis. One tick on the value is honest;
    // inventing a range around it would imply variation that is not there.
    return [min];
  }

  // A floor, not an override: once the range is wide enough to want a bigger
  // step than the floor, the 1-2-5 choice stands.
  const step = Math.max(niceStep((max - min) / Math.max(1, target)), minStep);
  const first = Math.ceil(min / step) * step;
  const ticks: number[] = [];
  // Guard the loop against a pathological step rather than trusting the maths.
  for (let value = first, guard = 0; value <= max + step / 1e6 && guard < 1000; guard += 1) {
    // Re-derive from the index to keep floating point drift from accumulating.
    ticks.push(round(value));
    value = first + step * (guard + 1);
  }
  return ticks.length > 0 ? ticks : [round(min), round(max)];
}

function niceStep(rough: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(Math.abs(rough)));
  const normalized = rough / magnitude;
  const stepped = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return stepped * magnitude;
}

/** Trim the floating point fuzz that `first + step * n` leaves behind. */
function round(value: number): number {
  const rounded = Number(value.toPrecision(12));
  return Object.is(rounded, -0) ? 0 : rounded;
}

/**
 * Extend a domain to the zero baseline.
 *
 * Bars are read by comparing lengths, so a bar chart whose axis starts at the
 * smallest value exaggerates every difference. Lines may be zoomed; bars may
 * not.
 */
export function includeZero(domain: Domain): Domain {
  const [min, max] = domain;
  return [Math.min(0, min), Math.max(0, max)];
}

/** The smallest and largest of a list, or `[0, 0]` when it is empty. */
export function extent(values: readonly number[]): Domain {
  if (values.length === 0) return [0, 0];
  let min = values[0]!;
  let max = values[0]!;
  for (const value of values) {
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return [min, max];
}

export interface Point {
  x: number;
  y: number;
}

/**
 * An SVG path through the given points.
 *
 * A lone point is drawn as a zero-length segment: with a bare `M` the browser
 * renders nothing, so a one-day series would vanish instead of showing a dot.
 */
export function linePath(points: readonly Point[]): string {
  if (points.length === 0) return '';
  const [first, ...rest] = points as [Point, ...Point[]];
  const head = `M ${first.x} ${first.y}`;
  if (rest.length === 0) return `${head} L ${first.x} ${first.y}`;
  return rest.reduce((path, point) => `${path} L ${point.x} ${point.y}`, head);
}

/**
 * Evenly spaced band positions for categorical marks.
 *
 * `gap` is subtracted from the band rather than added between bands, so the
 * first and last bar still touch the plot edges and the axis stays aligned.
 */
export interface Band {
  start: number;
  width: number;
  center: number;
}

export function bands(count: number, range: Range, gap = 2): Band[] {
  const [r0, r1] = range;
  if (count <= 0) return [];
  const step = (r1 - r0) / count;
  const width = Math.max(1, Math.abs(step) - gap);
  return Array.from({ length: count }, (_, index) => {
    const start = r0 + step * index + (Math.abs(step) - width) / 2;
    return { start, width, center: start + width / 2 };
  });
}

/** Days between two ISO dates, used as the x domain of the trend chart. */
export function dayNumber(iso: string): number {
  return Date.parse(`${iso.slice(0, 10)}T00:00:00Z`) / 86_400_000;
}
