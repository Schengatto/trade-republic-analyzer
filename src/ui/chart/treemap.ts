/**
 * One month's profit, split into the parts that made it, as tiles whose area is
 * the size of each part.
 *
 * A component is signed and an area cannot be: the area carries the magnitude
 * and the colour carries the sign, at full strength. That division is why the
 * heatmap this figure flips out of ramps opacity and this does not — here the
 * size already says how big, so the colour is free to say only which way.
 *
 * The consequence has to be said plainly, because the picture cannot say it:
 * **the areas do not add up to the month's profit.** Charges subtract, and
 * nothing drawn as an area can subtract. A month of +50 trading and -25 charges
 * draws 75 units of tile for a month worth 25. The figure's table states the
 * share of the summed magnitudes — which is what the areas are actually drawn
 * from — and the signed amounts beside it.
 *
 * Nothing here sorts. `squarify` lays tiles out in the order it is handed them,
 * and the order it is handed is the fixed order of the parts, so a colour and a
 * position always mean the same component. The canonical algorithm sorts
 * descending by area and squares the tiles up a little further; that is the
 * trade this file declines to take.
 *
 * The tiles are not interactive — there is nothing below a component to open —
 * so the picture names itself once with `role="img"` and the figure's table
 * carries the numbers, the same division of labour the bar charts use.
 */

import { el } from '../dom';
import { poleFor } from './palette';
import { squarify, type Rect } from './squarify';

/** The whole box, in the percentages the tiles are positioned with. */
const BOX: Rect = { x: 0, y: 0, width: 100, height: 100 };

/**
 * The `.treemap__text` chip a tile draws, in px: two line boxes at 0.62rem and
 * 0.7rem of type, plus its own vertical padding.
 */
const LABEL_BLOCK_PX = 32;
/**
 * The height of the box, in px: `.treemap` is a flat `height: 16rem`.
 *
 * Fixed on purpose, and this is the reason. The check below is a percentage of
 * the box, and a box whose height moved with the viewport would leave it a
 * guess — taken against the shortest the box might be, it would strip labels
 * off tiles that had room for them at every width but the narrowest.
 */
const BOX_HEIGHT_PX = 256;
/**
 * A tile shorter than this fraction of the box draws no text at all.
 *
 * `.treemap__tile` clips rather than spills, which is the right trade against
 * labelling a neighbour, but an 8px-tall tile then shows the middle 8px of a
 * word — a smear that reads as a rendering fault. Not drawing beats both. Only
 * the drawing goes: the tile keeps its area, and the table still lists the
 * part, with the amount the tile could not say.
 */
const MIN_TEXT_HEIGHT_PERCENT = (LABEL_BLOCK_PX / BOX_HEIGHT_PX) * 100;

export interface TreemapTile {
  /** The part's key, e.g. `charges`. Drawn onto the tile as `data-part`. */
  key: string;
  /** Signed: the sign picks the colour, the magnitude picks the area. */
  value: number;
  /** The part's name in the reader's language. */
  label: string;
  /** The formatted, signed amount, drawn under the label. */
  amount: string;
}

export interface TreemapSpec {
  tiles: readonly TreemapTile[];
  /** The accessible name of the whole picture. */
  title: string;
}

export function treemap(spec: TreemapSpec): HTMLElement | null {
  // A part at exactly zero has no area. Omitted rather than drawn thin: a
  // minimum size would be a claim about a weight it does not have.
  const drawable = spec.tiles.filter((tile) => tile.value !== 0);
  if (drawable.length === 0) return null;

  const laid = squarify(
    drawable.map((tile) => ({ value: Math.abs(tile.value), item: tile })),
    BOX,
  );

  return el(
    'div',
    { class: 'treemap', role: 'img', 'aria-label': spec.title },
    laid.map(({ item, rect }) => renderTile(item, rect)),
  );
}

function renderTile(tile: TreemapTile, rect: Rect): HTMLElement {
  return el(
    'div',
    {
      class: 'treemap__tile',
      style: `${box(rect)};background:${poleFor(tile.value)}`,
      'data-part': tile.key,
    },
    rect.height < MIN_TEXT_HEIGHT_PERCENT
      ? []
      : [
          // The text sits on a ground of its own rather than straight on the
          // tile. The poles are painted at full strength here — no opacity ramp
          // to soften them — and at full strength neither ink clears 4.5:1 on
          // them: the darkest is 3.87:1 on the light positive pole, and white
          // is no better. A chip is the only way to keep both the contrast and
          // the strength of the colour that carries the sign.
          el('span', { class: 'treemap__text' }, [
            el('span', { class: 'treemap__label' }, [tile.label]),
            el('span', { class: 'treemap__amount' }, [tile.amount]),
          ]),
        ],
  );
}

function box(rect: Rect): string {
  const round = (value: number) => value.toFixed(4);
  return `left:${round(rect.x)}%;top:${round(rect.y)}%;width:${round(rect.width)}%;height:${round(rect.height)}%`;
}
