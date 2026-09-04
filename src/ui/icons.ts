/**
 * One glyph per report section, drawn here rather than fetched.
 *
 * An icon set from a CDN would be a network request, and the promise on the
 * landing screen is that there are none. These are fourteen hand-drawn paths on
 * a 24px grid, stroked in `currentColor` so a glyph follows the theme and the
 * active state without the colour ever being named twice.
 *
 * Silhouette is what does the work: collapsed, the rail is read at a glance and
 * several sections are "a chart about money", so no two glyphs may share an
 * outline. The label is still the authority — it is one hover away, and always
 * present for a screen reader.
 */

import { svg } from './dom';

function path(d: string): SVGElement {
  return svg('path', { d });
}

function circle(cx: number, cy: number, r: number): SVGElement {
  return svg('circle', { cx, cy, r });
}

function line(x1: number, y1: number, x2: number, y2: number): SVGElement {
  return svg('line', { x1, y1, x2, y2 });
}

/** A filled point. Below about 1.5px a stroked circle reads as a smudge. */
function dot(cx: number, cy: number): SVGElement {
  return svg('circle', { cx, cy, r: 1.35, fill: 'currentColor', stroke: 'none' });
}

const GLYPHS: Record<string, () => SVGElement[]> = {
  /** The answer the reader came for: a target. */
  summary: () => [circle(12, 12, 8), circle(12, 12, 4), dot(12, 12)],
  /** A rising line with its corner arrow. */
  trend: () => [path('M3 17 L9.5 10.5 L13.5 14.5 L21 7'), path('M15.5 7 H21 V12.5')],
  /** A pie: the one circle allowed to be cut. */
  composition: () => [circle(12, 12, 8), path('M12 4 V12 L18.5 16')],
  /** What was left out, in the sign that says so. */
  excluded: () => [circle(12, 12, 8), line(6.5, 17.5, 17.5, 6.5)],
  /** Two equal quantities and a tick: the books agree. */
  reconciliation: () => [
    line(4, 9, 14, 9),
    line(4, 14, 14, 14),
    path('M15 15.5 L17.5 18 L21 13.5'),
  ],
  /** A span with two end caps: a stretch of time, measured. */
  windows: () => [line(4.5, 7, 4.5, 17), line(19.5, 7, 19.5, 17), line(4.5, 12, 19.5, 12)],
  /** A calendar, for the month-by-month view. */
  monthly: () => [
    svg('rect', { x: 3.5, y: 5, width: 17, height: 15.5, rx: 2 }),
    line(3.5, 10, 20.5, 10),
    line(8, 3, 8, 7),
    line(16, 3, 16, 7),
  ],
  /** Una colonna che cresce e la barra piatta del capitale che l'ha prodotta. */
  capital: () => [
    line(3.5, 19, 20.5, 19),
    svg('rect', { x: 5, y: 12, width: 5, height: 7 }),
    svg('rect', { x: 14, y: 6.5, width: 5, height: 12.5 }),
  ],
  /** Layers, one per class of asset. */
  'asset-class': () => [
    path('M12 3.5 L21 8 L12 12.5 L3 8 Z'),
    path('M3 12.5 L12 17 L21 12.5'),
    path('M3 17 L12 21.5 L21 17'),
  ],
  /*
   * Il tachimetro sta alla sezione che disegna un tachimetro. Lasciarlo a
   * `win-rate` avrebbe messo nel rail due glifi quasi uguali, e quello che
   * sembra un gauge non sarebbe stato la sezione col gauge.
   */
  performance: () => [
    path('M4 17 A8.5 8.5 0 1 1 20 17'),
    line(12, 17, 16.5, 11.5),
    dot(12, 17),
  ],
  /** Due colonne di altezza diversa: una quota contro l'altra. */
  'win-rate': () => [
    svg('rect', { x: 5, y: 8, width: 5.5, height: 12, rx: 1 }),
    svg('rect', { x: 13.5, y: 13, width: 5.5, height: 7, rx: 1 }),
    line(3, 20, 21, 20),
  ],
  /** Best and worst, pointing opposite ways. */
  'top-flop': () => [
    line(8, 20, 8, 5),
    path('M4.5 8.5 L8 5 L11.5 8.5'),
    line(16, 4, 16, 19),
    path('M12.5 15.5 L16 19 L19.5 15.5'),
  ],
  /** How long a position was held. */
  holding: () => [
    line(6, 3.5, 18, 3.5),
    line(6, 20.5, 18, 20.5),
    path('M7.5 3.5 V7 L12 12 L7.5 17 V20.5'),
    path('M16.5 3.5 V7 L12 12 L16.5 17 V20.5'),
  ],
  /** A balance: this section weighs one side against the other. */
  execution: () => [
    line(12, 4, 12, 20),
    line(5, 8, 19, 8),
    path('M5 8 L2.5 14 A3.5 3.5 0 0 0 7.5 14 Z'),
    path('M19 8 L16.5 14 A3.5 3.5 0 0 0 21.5 14 Z'),
  ],
  /** A list, because that section is one. */
  securities: () => [
    dot(5, 7),
    line(9, 7, 20, 7),
    dot(5, 12),
    line(9, 12, 20, 12),
    dot(5, 17),
    line(9, 17, 20, 17),
  ],
  /** What is still held: the case has not been put down. */
  'open-positions': () => [
    svg('rect', { x: 3, y: 7.5, width: 18, height: 12.5, rx: 2 }),
    path('M9 7.5 V5.8 A1.6 1.6 0 0 1 10.6 4.2 H13.4 A1.6 1.6 0 0 1 15 5.8 V7.5'),
    line(3, 13, 21, 13),
  ],
  /** What the report does not claim to cover. */
  limits: () => [path('M12 4.5 L21 19.5 H3 Z'), line(12, 10, 12, 14), dot(12, 16.8)],
};

/** The ids that carry a glyph, so a test can hold this file to `REPORT_SECTIONS`. */
export const ICON_IDS = Object.keys(GLYPHS);

/**
 * A section's glyph, or a plain dot for an id this file has not met.
 *
 * The fallback exists so that adding a section is never a way to break the
 * rail: an unknown id gets a neutral mark and its label, which is enough to
 * navigate by.
 */
export function sectionIcon(id: string): SVGSVGElement {
  const build = GLYPHS[id];

  return svg(
    'svg',
    {
      class: 'rail__icon',
      viewBox: '0 0 24 24',
      width: 22,
      height: 22,
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': 1.6,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'aria-hidden': 'true',
      focusable: 'false',
    },
    build ? build() : [dot(12, 12)],
  );
}

/** The rail's own control: a chevron that turns to face the way it will move. */
export function chevronIcon(): SVGSVGElement {
  return svg(
    'svg',
    {
      class: 'rail__icon rail__icon--chevron',
      viewBox: '0 0 24 24',
      width: 22,
      height: 22,
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': 1.6,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'aria-hidden': 'true',
      focusable: 'false',
    },
    [path('M9.5 5.5 L16 12 L9.5 18.5')],
  );
}
