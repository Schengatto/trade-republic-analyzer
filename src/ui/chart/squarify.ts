/**
 * Squarified treemap layout: lay tiles out so each is as close to a square as
 * the ordering allows, because area is judged far more reliably on a square
 * than on a sliver.
 *
 * Pure arithmetic — no DOM and no unit. Feed it whatever coordinate space the
 * caller draws in (this project passes percentages) and it answers in the same.
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SquarifyItem<T> {
  /** Must be positive to be drawable; anything else is dropped. */
  value: number;
  item: T;
}

export interface SquarifiedTile<T> {
  item: T;
  rect: Rect;
}

interface Sized<T> {
  item: T;
  /** The item's value converted into the coordinate space's area units. */
  area: number;
}

/**
 * Lay `items` out as tiles filling `bounds`.
 *
 * @param items The order is the caller's to choose and is preserved: tiles come
 *   out in the order they went in. Sorting by descending value is what the
 *   canonical algorithm does and it squares the tiles up a little further, but
 *   it also scrambles a sequence the reader is meant to follow — this project's
 *   treemap keeps the fixed order of the profit's parts on purpose, so a colour
 *   and a position mean the same component in every month it is opened on.
 * @param bounds The rectangle to fill, in whatever coordinate space the caller
 *   draws in.
 */
export function squarify<T>(
  items: readonly SquarifyItem<T>[],
  bounds: Rect,
): SquarifiedTile<T>[] {
  // A zero or negative value has no area to draw, and giving it a token
  // minimum would state a weight it does not have.
  const drawable = items.filter((entry) => entry.value > 0);
  const total = drawable.reduce((sum, entry) => sum + entry.value, 0);
  if (total <= 0 || bounds.width <= 0 || bounds.height <= 0) return [];

  const scale = (bounds.width * bounds.height) / total;
  const queue: Sized<T>[] = drawable.map((entry) => ({
    item: entry.item,
    area: entry.value * scale,
  }));

  const tiles: SquarifiedTile<T>[] = [];
  let free: Rect = { ...bounds };

  while (queue.length > 0) {
    // Rows are laid along the shorter side: that is what keeps the tiles from
    // degenerating into slivers as the free rectangle gets thin.
    const side = Math.min(free.width, free.height);
    const row: Sized<T>[] = [];
    while (queue.length > 0) {
      const candidate = [...row, queue[0]!];
      // Grow the row while it keeps getting squarer, and stop at the first
      // item that would make its worst tile worse.
      if (row.length > 0 && worstRatio(candidate, side) > worstRatio(row, side)) break;
      row.push(queue.shift()!);
    }
    free = placeRow(row, free, tiles);
  }

  return tiles;
}

/**
 * The worst width-to-height ratio in a row laid across `side`.
 * Lower is squarer.
 */
function worstRatio<T>(row: readonly Sized<T>[], side: number): number {
  let sum = 0;
  let min = Infinity;
  let max = 0;
  for (const entry of row) {
    sum += entry.area;
    if (entry.area < min) min = entry.area;
    if (entry.area > max) max = entry.area;
  }
  const side2 = side * side;
  const sum2 = sum * sum;
  return Math.max((side2 * max) / sum2, sum2 / (side2 * min));
}

/**
 * Place one row against the short edge of `free` and return what is left.
 */
function placeRow<T>(
  row: readonly Sized<T>[],
  free: Rect,
  into: SquarifiedTile<T>[],
): Rect {
  const sum = row.reduce((total, entry) => total + entry.area, 0);
  // Wider than tall: stack the row down the left edge and eat into the width.
  const vertical = free.width >= free.height;
  const thickness = vertical ? sum / free.height : sum / free.width;
  let offset = vertical ? free.y : free.x;

  for (const entry of row) {
    const length = entry.area / thickness;
    into.push({
      item: entry.item,
      rect: vertical
        ? { x: free.x, y: offset, width: thickness, height: length }
        : { x: offset, y: free.y, width: length, height: thickness },
    });
    offset += length;
  }

  return vertical
    ? { x: free.x + thickness, y: free.y, width: free.width - thickness, height: free.height }
    : { x: free.x, y: free.y + thickness, width: free.width, height: free.height - thickness };
}
