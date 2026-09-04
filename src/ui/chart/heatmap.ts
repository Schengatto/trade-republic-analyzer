/**
 * A calendar heatmap: one row per year, twelve fixed columns, one button per
 * month that actually exists in the file.
 *
 * HTML rather than SVG, unlike every other chart here, and the exception is
 * deliberate: these cells are clicked and read. `<button>` gives focus, the
 * `Enter` and `Space` keys, the tab order and two lines of wrapped label as
 * native behaviour, none of which is free inside an `<svg>`.
 *
 * Intensity is the opacity of a single polar tint, never a new hue: the
 * palette holds three fixed poles and `guards.test.ts` forbids a hex colour
 * outside it, so a continuous ramp has to be built out of one of them.
 */

import { el } from '../dom';
import { poleFor } from './palette';
import { createTooltip } from './tooltip';

/**
 * Below this the tint disappears against the page; above it, the text does.
 *
 * The ceiling is measured, not chosen by eye. Text sits on the tint composited
 * over `--surface-1`, and its contrast falls monotonically as alpha rises in
 * both themes — lighter toward white in light, brighter toward the pole in dark
 * — so the worst cell on the ramp is always the peak, whatever the data. The
 * worst of the six pole/theme combinations is the dark gain pole: 0.70 puts it
 * at 5.30:1 against `--ink`, 0.78 at 4.59:1, and 0.79 at 4.48:1, which fails the
 * 4.5 WCAG AA threshold these two type sizes need. The ceiling stays at 0.70
 * rather than climbing to its 0.78 limit: the span bought is small and the
 * margin spent is what keeps the spec's `--pole-ink` fallback unnecessary.
 */
const MIN_ALPHA = 0.12;
const MAX_ALPHA = 0.7;
/** A month inside the period that closed at exactly zero: present, but flat. */
const ZERO_ALPHA = 0.1;

/**
 * One figure, in the two lengths this grid needs.
 *
 * The cell is a fixed box in a row of twelve, so what it prints is abbreviated
 * — `-19,4K €`. That string cannot be reconciled or added up, so the exact one
 * travels with it and reaches the reader three ways that do not depend on a
 * pointer: the accessible name, the hover readout, and the table under the
 * figure.
 */
export interface HeatmapFigure {
  /** What the figure is of: `gen 2026`, `2025`, `gennaio`. */
  name: string;
  /** Abbreviated. What the cell prints. */
  primary: string;
  /** Exact. What the accessible name and the readout carry. */
  exact: string;
}

export interface HeatmapCell extends HeatmapFigure {
  /** YYYY-MM, the key the selection is expressed in. */
  key: string;
  /** Calendar month, 1-12: the column this cell belongs in. */
  month: number;
  value: number;
}

export interface HeatmapRow {
  year: string;
  cells: readonly HeatmapCell[];
  /** The year, summed: the cell that closes the row. */
  total: HeatmapFigure;
}

export interface HeatmapTotals {
  /** Heads the trailing column and names the trailing row. */
  label: string;
  /**
   * One per calendar month, January first — every year's January added
   * together. Null where no year in the file holds that month.
   */
  byMonth: readonly (HeatmapFigure | null)[];
  /** The corner where the two totals meet: every month in the file. */
  grand: HeatmapFigure;
}

export interface HeatmapSpec {
  rows: readonly HeatmapRow[];
  /** Twelve abbreviated month names, January first. */
  columns: readonly string[];
  /**
   * The margins of the grid. Summed by the caller, which holds the values as
   * decimals: adding the plotted floats back up here would drift the cents.
   */
  totals: HeatmapTotals;
  /** Opens the month: the figure replaces this grid with that month's parts. */
  onOpen: (key: string) => void;
}

export function heatmap(spec: HeatmapSpec): HTMLElement | null {
  const cells = spec.rows.flatMap((row) => [...row.cells]);
  if (cells.length === 0) return null;

  // The peak is taken over the months alone. A year is larger than any month
  // inside it, so admitting the totals would rank every month against the year
  // that contains it and drain the colour out of the grid.
  const peak = cells.reduce((max, cell) => Math.max(max, Math.abs(cell.value)), 0);

  // The readout hangs outside the scroller: mounted inside it, its own
  // overflow would clip the box on the side the reader is pointing at.
  const wrap = el('div', { class: 'heatmap-wrap' });
  const tip = createTooltip(wrap, { silent: true });
  const readout = (target: HTMLElement, figure: HeatmapFigure): HTMLElement => {
    const show = (): void => {
      const box = wrap.getBoundingClientRect();
      const spot = target.getBoundingClientRect();
      // Fractions of the mounting box, which is how every chart here places
      // the readout. Nothing has been laid out under a test runner, so a zero
      // box parks it in the corner instead of dividing by nothing.
      const x = box.width === 0 ? 0 : (spot.left + spot.width / 2 - box.left) / box.width;
      const y = box.height === 0 ? 0 : (spot.top + spot.height / 2 - box.top) / box.height;
      tip.show(x, y, figure.name, [{ label: '', value: figure.exact }]);
    };
    target.addEventListener('mouseenter', show);
    target.addEventListener('focus', show);
    target.addEventListener('mouseleave', () => tip.hide());
    target.addEventListener('blur', () => tip.hide());
    return target;
  };

  const head = el('thead', {}, [
    el('tr', {}, [
      // The corner cell names nothing; leaving it a plain <td> keeps a screen
      // reader from announcing the year column as a heading of the months.
      el('td', { class: 'heatmap__corner' }),
      ...spec.columns.map((label) => el('th', { scope: 'col' }, [label])),
      el('th', { scope: 'col', class: 'heatmap__total-head' }, [spec.totals.label]),
    ]),
  ]);

  const body = el(
    'tbody',
    {},
    spec.rows.map((row) => {
      const byMonth = new Map(row.cells.map((cell) => [cell.month, cell]));
      return el('tr', {}, [
        el('th', { scope: 'row', class: 'heatmap__year' }, [row.year]),
        ...Array.from({ length: 12 }, (_, index) => {
          const cell = byMonth.get(index + 1);
          // A month outside the period is empty, not a zero: the account did
          // not break even that month, it did not exist. An inert <td> keeps
          // it out of the tab order and out of the reading of the row.
          return el('td', { class: 'heatmap__slot' }, cell ? [button(cell, peak, readout, spec)] : []);
        }),
        total(row.total, readout),
      ]);
    }),
  );

  const foot = el('tfoot', {}, [
    el('tr', {}, [
      el('th', { scope: 'row', class: 'heatmap__year' }, [spec.totals.label]),
      ...spec.totals.byMonth.map((figure) =>
        figure ? total(figure, readout) : el('td', { class: 'heatmap__total' }),
      ),
      total(spec.totals.grand, readout, 'heatmap__total--grand'),
    ]),
  ]);

  wrap.prepend(
    el('div', { class: 'heatmap-scroll' }, [el('table', { class: 'heatmap' }, [head, body, foot])]),
  );
  return wrap;
}

/**
 * A margin figure: printed, hoverable, and nothing else.
 *
 * Not a button, because there is no single month behind it to open — offering
 * one would promise a view that does not exist.
 */
function total(
  figure: HeatmapFigure,
  readout: (target: HTMLElement, figure: HeatmapFigure) => HTMLElement,
  modifier?: string,
): HTMLElement {
  const node = el('td', { class: `heatmap__total${modifier ? ` ${modifier}` : ''}` }, [
    el('span', { class: 'heatmap__value' }, [figure.primary]),
  ]);
  return readout(node, figure);
}

function button(
  cell: HeatmapCell,
  peak: number,
  readout: (target: HTMLElement, figure: HeatmapFigure) => HTMLElement,
  spec: HeatmapSpec,
): HTMLElement {
  const magnitude = Math.abs(cell.value);
  const alpha =
    magnitude === 0 || peak === 0
      ? ZERO_ALPHA
      : MIN_ALPHA + (MAX_ALPHA - MIN_ALPHA) * (magnitude / peak);

  const node = el(
    'button',
    {
      type: 'button',
      class: 'heatmap__cell',
      'data-month': cell.key,
      // No `aria-pressed`: activating a cell does not turn it on, it replaces
      // the grid with that month's parts. A toggle state that never becomes
      // true would promise a pressed cell the reader is never going to find.
      // The exact figure, not the abbreviation the cell prints: a screen
      // reader has no hover to fall back on.
      'aria-label': `${cell.name}: ${cell.exact}`,
    },
    [
      // The tint is a layer under the text rather than the button's own
      // background, so fading it never fades what has to stay readable.
      el('span', {
        class: 'heatmap__fill',
        style: `background:${poleFor(cell.value)};opacity:${alpha.toFixed(3)}`,
      }),
      el('span', { class: 'heatmap__value' }, [cell.primary]),
    ],
  );

  // No toggle: opening is one-way, because a second click on the same month
  // would close the figure no one asked to close. Going back is the back
  // button's job, so a repeat click is a no-op.
  node.addEventListener('click', () => spec.onOpen(cell.key));
  return readout(node, cell);
}
