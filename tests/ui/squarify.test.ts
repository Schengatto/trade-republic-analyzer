import { describe, expect, it } from 'vitest';
import { squarify, type Rect, type SquarifiedTile } from '../../src/ui/chart/squarify';

const BOUNDS: Rect = { x: 0, y: 0, width: 100, height: 100 };
const areaOf = (tile: SquarifiedTile<unknown>): number => tile.rect.width * tile.rect.height;

const overlaps = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.width - 1e-6 &&
  b.x < a.x + a.width - 1e-6 &&
  a.y < b.y + b.height - 1e-6 &&
  b.y < a.y + a.height - 1e-6;

describe('squarify', () => {
  it('gives a single item the whole rectangle', () => {
    const [tile] = squarify([{ value: 7, item: 'a' }], BOUNDS);
    expect(tile!.rect).toEqual(BOUNDS);
  });

  it('splits two equal items into two equal areas', () => {
    const tiles = squarify(
      [
        { value: 1, item: 'a' },
        { value: 1, item: 'b' },
      ],
      BOUNDS,
    );
    expect(areaOf(tiles[0]!)).toBeCloseTo(5000, 6);
    expect(areaOf(tiles[1]!)).toBeCloseTo(5000, 6);
  });

  it('makes each area proportional to its value', () => {
    const values = [50, 25, 15, 6, 4];
    const tiles = squarify(
      values.map((value, index) => ({ value, item: index })),
      BOUNDS,
    );
    for (const tile of tiles) {
      // The bounds hold 10000 units of area and the values sum to 100, so one
      // unit of value is worth exactly 100 units of area.
      expect(areaOf(tile)).toBeCloseTo(values[tile.item as number]! * 100, 6);
    }
  });

  it('fills the rectangle without overlapping', () => {
    const tiles = squarify(
      [9, 7, 5, 4, 3, 2, 1].map((value, index) => ({ value, item: index })),
      BOUNDS,
    );
    const total = tiles.reduce((sum, tile) => sum + areaOf(tile), 0);
    expect(total).toBeCloseTo(10000, 4);
    for (let i = 0; i < tiles.length; i++) {
      for (let j = i + 1; j < tiles.length; j++) {
        expect(overlaps(tiles[i]!.rect, tiles[j]!.rect)).toBe(false);
      }
    }
  });

  it('stays inside the bounds it was given', () => {
    const bounds: Rect = { x: 10, y: 20, width: 60, height: 40 };
    const tiles = squarify(
      [5, 3, 2].map((value, index) => ({ value, item: index })),
      bounds,
    );
    for (const { rect } of tiles) {
      expect(rect.x).toBeGreaterThanOrEqual(bounds.x - 1e-6);
      expect(rect.y).toBeGreaterThanOrEqual(bounds.y - 1e-6);
      expect(rect.x + rect.width).toBeLessThanOrEqual(bounds.x + bounds.width + 1e-6);
      expect(rect.y + rect.height).toBeLessThanOrEqual(bounds.y + bounds.height + 1e-6);
    }
  });

  it('packs a row wider than one tile when that squares the tiles up', () => {
    // The example from Bruls et al., the paper the algorithm comes from: seven
    // values summing to 24 in a 6x4 rectangle, so one unit of value is one unit
    // of area. The first two both measure 3x2 because the layout grows the row
    // while doing so keeps getting squarer. Place one tile per row instead —
    // delete the comparison that ends the row — and the first becomes 1.5x4:
    // the same area, an aspect of 2.67 instead of 1.5. This is the test that
    // fails if the heuristic goes; the rest hold for any layout that conserves
    // area.
    const tiles = squarify(
      [6, 6, 4, 3, 2, 2, 1].map((value, index) => ({ value, item: index })),
      { x: 0, y: 0, width: 6, height: 4 },
    );
    expect(tiles[0]!.rect).toEqual({ x: 0, y: 0, width: 3, height: 2 });
    expect(tiles[1]!.rect).toEqual({ x: 0, y: 2, width: 3, height: 2 });
  });

  it('preserves the order it was given', () => {
    // No internal sort: the caller owns the order, and this project's treemap
    // relies on that to keep its months chronological.
    const tiles = squarify(
      [1, 9, 3, 7].map((value, index) => ({ value, item: index })),
      BOUNDS,
    );
    expect(tiles.map((tile) => tile.item)).toEqual([0, 1, 2, 3]);
  });

  it('drops values that cannot be drawn', () => {
    const tiles = squarify(
      [
        { value: 5, item: 'a' },
        { value: 0, item: 'zero' },
        { value: -3, item: 'negative' },
      ],
      BOUNDS,
    );
    expect(tiles.map((tile) => tile.item)).toEqual(['a']);
  });

  it('returns nothing for an empty list', () => {
    expect(squarify([], BOUNDS)).toEqual([]);
  });
});
