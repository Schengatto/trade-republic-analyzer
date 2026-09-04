// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { gaugeChart } from '../../src/ui/chart/gauge';

const SEGMENTS = [
  { label: 'wins', value: 6, color: 'var(--pole-positive)' },
  { label: 'losses', value: 3, color: 'var(--pole-negative)' },
  { label: 'break-even', value: 1, color: 'var(--pole-neutral)' },
];

function build(segments = SEGMENTS): SVGSVGElement | null {
  return gaugeChart({
    segments,
    headline: '60%',
    caption: '6 of 10',
    ariaLabel: 'Sales in profit',
  });
}

/**
 * Legge gli estremi di un arco dal suo `d`, e il verso in cui è piegato.
 *
 * Il sweep flag si cattura invece di darlo per scontato: scritto `1` dentro il
 * pattern, un flag sbagliato faceva fallire il `match` e il test moriva con un
 * `TypeError` invece di dire cosa non andava.
 */
function endpoints(d: string): {
  startX: number;
  startY: number;
  sweep: string;
  endX: number;
  endY: number;
} {
  const [, startX, startY, sweep, endX, endY] = d.match(
    /^M ([\d.-]+) ([\d.-]+) A .* ([01]) ([\d.-]+) ([\d.-]+)$/,
  )!;
  return {
    startX: Number(startX),
    startY: Number(startY),
    sweep: sweep!,
    endX: Number(endX),
    endY: Number(endY),
  };
}

describe('the arcs', () => {
  it('draws the track plus one arc per segment', () => {
    const chart = build()!;
    // jsdom non misura la geometria SVG: si contano i comandi e si leggono
    // gli attributi.
    const paths = [...chart.querySelectorAll('path')];
    expect(paths).toHaveLength(4);
    for (const path of paths) {
      expect(path.getAttribute('d')!.match(/A/g)).toHaveLength(1);
    }
  });

  it('runs the segments left to right, chained end to start, from where the track starts', () => {
    const chart = build()!;
    const [track, ...segments] = [...chart.querySelectorAll('path')].map((path) =>
      endpoints(path.getAttribute('d')!),
    );

    // jsdom non vede mai la figura disegnata: senza un'asserzione sulla
    // posizione, un arco rimescolato o rovesciato resterebbe verde qui e
    // sbaglierebbe solo davanti a chi guarda lo schermo.

    // In SVG la y cresce verso il basso, quindi è il sweep flag a decidere da
    // che parte l'arco si piega: con `0` il semicerchio si rovescia sotto il
    // centro e seppellisce il testo che sta nel vuoto. Gli estremi però non si
    // muovono, quindi nessuna asserzione sui punti può accorgersene.
    for (const arc of [track!, ...segments]) {
      expect(arc.sweep).toBe('1');
    }

    // Il primo spicchio comincia dove comincia l'intera traccia: nessun
    // vuoto prima del primo colore.
    expect(segments[0]!.startX).toBeCloseTo(track!.startX);
    expect(segments[0]!.startY).toBeCloseTo(track!.startY);

    // Ogni spicchio finisce dove comincia il successivo: la catena non
    // lascia salti né sovrapposizioni fra un colore e l'altro.
    for (let i = 0; i < segments.length - 1; i++) {
      expect(segments[i]!.endX).toBeCloseTo(segments[i + 1]!.startX);
      expect(segments[i]!.endY).toBeCloseTo(segments[i + 1]!.startY);
    }

    // La x cresce lungo il giro: il primo spicchio comincia più a sinistra
    // di dove finisce l'ultimo. Una catena può restare continua e correre
    // comunque nel verso sbagliato: questa è la sola verifica che lo esclude.
    expect(segments[0]!.startX).toBeLessThan(segments[segments.length - 1]!.endX);
  });

  it('makes each arc as long as its share, not as long as its turn', () => {
    const chart = build()!;
    const [track, ...segments] = [...chart.querySelectorAll('path')].map((path) =>
      endpoints(path.getAttribute('d')!),
    );

    // La lunghezza dell'arco *è* la cifra: un gauge che dividesse 6/3/1 in tre
    // spicchi uguali resterebbe continuo, nel verso giusto e ancorato ai due
    // estremi — ogni asserzione qui sopra passerebbe — e mentirebbe sotto un
    // titolo che dice «60%». Il punto si riconverte in quota con l'angolo, che
    // è l'inverso della formula del modulo e non una sua copia.
    const centre = { x: (track!.startX + track!.endX) / 2, y: track!.startY };
    const share = (x: number, y: number): number =>
      1 - Math.atan2(centre.y - y, x - centre.x) / Math.PI;

    // 6, 3 e 1 su 10: i due confini cadono a sei e a nove decimi del giro.
    expect(segments.map((arc) => share(arc.endX, arc.endY))).toEqual([
      expect.closeTo(0.6, 6),
      expect.closeTo(0.9, 6),
      expect.closeTo(1, 6),
    ]);
  });

  it('skips a segment worth nothing rather than drawing an empty path', () => {
    const chart = build([
      { label: 'wins', value: 4, color: 'var(--pole-positive)' },
      { label: 'losses', value: 0, color: 'var(--pole-negative)' },
      { label: 'break-even', value: 0, color: 'var(--pole-neutral)' },
    ])!;

    const strokes = [...chart.querySelectorAll('path')].map((path) =>
      path.getAttribute('stroke'),
    );
    expect(strokes).toEqual(['var(--grid)', 'var(--pole-positive)']);
  });

  it('draws a hundred per cent as a real half turn, not as nothing', () => {
    const chart = build([{ label: 'wins', value: 4, color: 'var(--pole-positive)' }])!;
    const drawn = endpoints([...chart.querySelectorAll('path')][1]!.getAttribute('d')!);

    // Un arco che comincia e finisce nello stesso punto non dipinge niente:
    // gli estremi del semicerchio devono essere due punti distinti.
    expect(drawn.startX).not.toBe(drawn.endX);
  });

  it('has nothing to draw when every segment is zero', () => {
    expect(
      build([{ label: 'wins', value: 0, color: 'var(--pole-positive)' }]),
    ).toBeNull();
  });
});

describe('the well under the arc', () => {
  it('prints the proportion and the counts it came from', () => {
    const chart = build()!;
    const texts = [...chart.querySelectorAll('text')].map((node) => node.textContent);
    expect(texts).toEqual(['60%', '6 of 10']);
  });

  it('names the whole figure for a reader who cannot see it', () => {
    expect(build()!.getAttribute('aria-label')).toBe('Sales in profit');
    expect(build()!.getAttribute('role')).toBe('img');
  });
});
