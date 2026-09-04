/**
 * Un semicerchio spesso, aperto verso l'alto: le parti di un intero.
 *
 * È una proporzione, non un totale, quindi non ha assi né scala: l'arco è
 * lungo quanto la quota che rappresenta, e la cifra grande sotto di esso dice
 * quale quota sia. Il verde e il rosso qui sono accessibilità e non
 * decorazione, ma nessuno dei due regge del testo sopra: il testo sta nel
 * vuoto sotto l'arco, sul fondo della card.
 */

import { svg } from '../dom';
import { GRID } from './palette';

export interface GaugeSegment {
  /** Per la legenda e per l'etichetta accessibile; il grafico non la stampa. */
  label: string;
  /** Una quota, non una misura: solo il rapporto con il totale conta. */
  value: number;
  color: string;
}

export interface GaugeSpec {
  segments: GaugeSegment[];
  /** La proporzione, in grande, nel vuoto sotto l'arco. */
  headline: string;
  /** I conteggi da cui viene. */
  caption: string;
  /** Nomina l'intera figura per chi non la vede. */
  ariaLabel: string;
}

const WIDTH = 320;
const HEIGHT = 186;
const CENTER = { x: WIDTH / 2, y: 156 };
const RADIUS = 128;
const THICKNESS = 26;

/** `0` è l'estremo sinistro dell'arco, `1` il destro: mezzo giro sopra il vuoto. */
function point(fraction: number): { x: number; y: number } {
  const angle = Math.PI * (1 - fraction);
  return {
    x: CENTER.x + RADIUS * Math.cos(angle),
    y: CENTER.y - RADIUS * Math.sin(angle),
  };
}

function arc(from: number, to: number, color: string): SVGElement {
  const start = point(from);
  const end = point(to);
  // Mai più di mezzo giro, quindi il large-arc flag è sempre 0; il sweep flag
  // è 1 perché in SVG la y cresce verso il basso.
  return svg('path', {
    d: `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 0 1 ${end.x} ${end.y}`,
    fill: 'none',
    stroke: color,
    'stroke-width': THICKNESS,
    class: 'chart__gauge-arc',
  });
}

export function gaugeChart(spec: GaugeSpec): SVGSVGElement | null {
  const total = spec.segments.reduce((sum, segment) => sum + segment.value, 0);
  if (total <= 0) return null;

  const root = svg('svg', {
    viewBox: `0 0 ${WIDTH} ${HEIGHT}`,
    class: 'chart chart--gauge',
    preserveAspectRatio: 'xMidYMid meet',
    role: 'img',
    'aria-label': spec.ariaLabel,
  });

  // Il fondo per primo, così un vuoto di arrotondamento fra due segmenti
  // mostra la traccia e non la pagina.
  root.append(arc(0, 1, GRID));

  let done = 0;
  for (const segment of spec.segments) {
    // Un segmento a quota zero si salta: `start === end` non dipinge niente e
    // lascia in giro un path vuoto che i test contano.
    if (segment.value <= 0) continue;
    const next = done + segment.value;
    root.append(arc(done / total, next / total, segment.color));
    done = next;
  }

  root.append(
    svg(
      'text',
      {
        x: CENTER.x,
        y: CENTER.y - 46,
        class: 'chart__gauge-value',
        'text-anchor': 'middle',
      },
      [spec.headline],
    ),
    svg(
      'text',
      {
        x: CENTER.x,
        y: CENTER.y - 18,
        class: 'chart__gauge-caption',
        'text-anchor': 'middle',
      },
      [spec.caption],
    ),
  );

  return root;
}
