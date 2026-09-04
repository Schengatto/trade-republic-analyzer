import { describe, expect, it } from 'vitest';
import { includeZero, linearScale, linePath, niceTicks } from '../../src/ui/chart/geometry';

describe('linearScale', () => {
  it('maps the domain ends onto the range ends', () => {
    const scale = linearScale([0, 10], [0, 100]);
    expect(scale(0)).toBe(0);
    expect(scale(10)).toBe(100);
    expect(scale(5)).toBe(50);
  });

  it('supports an inverted range, which is how SVG y axes run', () => {
    const scale = linearScale([0, 10], [200, 0]);
    expect(scale(0)).toBe(200);
    expect(scale(10)).toBe(0);
    expect(scale(5)).toBe(100);
  });

  it('handles a negative domain', () => {
    const scale = linearScale([-50, 50], [0, 100]);
    expect(scale(-50)).toBe(0);
    expect(scale(0)).toBe(50);
    expect(scale(50)).toBe(100);
  });

  it('puts a flat domain in the middle of the range instead of dividing by zero', () => {
    // A single-point series, or a month where every value is identical.
    const scale = linearScale([7, 7], [0, 100]);
    expect(Number.isFinite(scale(7))).toBe(true);
    expect(scale(7)).toBe(50);
  });
});

describe('niceTicks', () => {
  it('returns round numbers covering the range', () => {
    // Step 20, not 25: 2.5 is not one of the 1-2-5 multiples.
    expect(niceTicks(0, 100, 5)).toEqual([0, 20, 40, 60, 80, 100]);
  });

  it('steps in 1-2-5 multiples, never arbitrary fractions', () => {
    const ticks = niceTicks(0, 37, 5);
    const step = ticks[1]! - ticks[0]!;
    const mantissa = step / 10 ** Math.floor(Math.log10(step));
    expect([1, 2, 5]).toContain(Math.round(mantissa));
  });

  it('spans zero when the data does, so the baseline is a real tick', () => {
    expect(niceTicks(-40, 60, 5)).toContain(0);
  });

  /**
   * A count is a whole number, and the axis that measures one has to be too.
   * Left to itself the 1-2-5 rule picks a step of 0.5 for a 0..2 range, and the
   * integer formatter then prints 0, 0.5, 1, 1.5, 2 as "0, 1, 1, 2, 2" — two
   * gridlines carrying the same label, at different heights.
   */
  it('holds the step at a whole number when asked', () => {
    expect(niceTicks(0, 2, 5, 1)).toEqual([0, 1, 2]);
    expect(niceTicks(0, 3, 5, 1)).toEqual([0, 1, 2, 3]);
    expect(niceTicks(0, 1, 5, 1)).toEqual([0, 1]);
  });

  it('leaves a whole-number floor alone once the range is wide enough to need it', () => {
    // The floor is a minimum, not an override: a big count still steps in
    // 1-2-5 multiples rather than counting by ones.
    expect(niceTicks(0, 100, 5, 1)).toEqual([0, 20, 40, 60, 80, 100]);
  });

  it('still returns a usable tick for a flat range', () => {
    const ticks = niceTicks(5, 5, 5);
    expect(ticks.length).toBeGreaterThan(0);
    expect(ticks.every((t) => Number.isFinite(t))).toBe(true);
  });

  it('never returns a NaN tick', () => {
    for (const [min, max] of [
      [0, 0],
      [-1, 1],
      [0.0001, 0.0002],
      [-1e6, 1e6],
    ] as const) {
      expect(niceTicks(min, max, 5).every(Number.isFinite)).toBe(true);
    }
  });
});

describe('includeZero', () => {
  it('extends a positive-only domain down to zero, so bars are not truncated', () => {
    expect(includeZero([10, 50])).toEqual([0, 50]);
  });

  it('extends a negative-only domain up to zero', () => {
    expect(includeZero([-50, -10])).toEqual([-50, 0]);
  });

  it('leaves a domain that already spans zero alone', () => {
    expect(includeZero([-20, 30])).toEqual([-20, 30]);
  });
});

describe('linePath', () => {
  it('draws a move followed by line segments', () => {
    expect(
      linePath([
        { x: 0, y: 10 },
        { x: 5, y: 20 },
        { x: 10, y: 0 },
      ]),
    ).toBe('M 0 10 L 5 20 L 10 0');
  });

  it('is empty for no points, rather than producing an invalid path', () => {
    expect(linePath([])).toBe('');
  });

  it('draws a single point as a degenerate segment so it stays visible', () => {
    expect(linePath([{ x: 3, y: 4 }])).toBe('M 3 4 L 3 4');
  });
});
