/**
 * The hover/focus readout shared by every chart.
 *
 * Positioned as a fraction of the plot box rather than in pixels, because the
 * SVG scales with its container: fractions stay correct at any rendered size.
 * The tooltip only ever repeats values that are also in the table view — it
 * enhances, it never gates.
 */

import { clear, el } from '../dom';

export interface TooltipRow {
  label: string;
  value: string;
  color?: string;
}

export interface Tooltip {
  show(xFraction: number, yFraction: number, title: string, rows: TooltipRow[]): void;
  hide(): void;
}

export interface TooltipOptions {
  /**
   * Drop the live region and hide the box from assistive technology.
   *
   * For a chart whose marks already carry the same figure in their accessible
   * names: there the readout is a second voice saying what has just been said,
   * and every mark announces itself twice.
   */
  silent?: boolean;
}

export function createTooltip(container: HTMLElement, options: TooltipOptions = {}): Tooltip {
  const node = el(
    'div',
    options.silent
      ? { class: 'tooltip', 'aria-hidden': 'true' }
      : { class: 'tooltip', role: 'status', 'aria-live': 'polite' },
  );
  node.hidden = true;
  container.append(node);

  return {
    show(xFraction, yFraction, title, rows) {
      clear(node);
      node.append(el('p', { class: 'tooltip__title' }, [title]));
      node.append(
        el(
          'ul',
          { class: 'tooltip__rows' },
          rows.map((row) =>
            el('li', {}, [
              row.color
                ? el('span', { class: 'tooltip__swatch', style: `background:${row.color}` })
                : false,
              el('span', { class: 'tooltip__label' }, [row.label]),
              el('span', { class: 'tooltip__value' }, [row.value]),
            ]),
          ),
        ),
      );
      // Flip to the left of the cursor past the midpoint so the box never runs
      // off the right edge of the card.
      node.classList.toggle('tooltip--flip', xFraction > 0.6);
      node.style.left = `${(xFraction * 100).toFixed(3)}%`;
      node.style.top = `${(yFraction * 100).toFixed(3)}%`;
      node.hidden = false;
    },
    hide() {
      node.hidden = true;
    },
  };
}
