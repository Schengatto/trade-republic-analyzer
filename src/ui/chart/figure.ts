/**
 * The frame every chart is mounted in.
 *
 * A figure cannot be built without its table: `rows` is a required argument, so
 * "every chart has an equivalent tabular view" is enforced by the type checker
 * rather than by remembering. That table is also what makes the report readable
 * when the SVG is unavailable — screen readers, forced-colours mode, and the
 * printed page all fall back to it.
 */

import { clear, el } from '../dom';
import type { Translator } from '../i18n';

export interface LegendEntry {
  label: string;
  color: string;
  /** Present turns the entry into a toggle; omitted leaves it a static key. */
  key?: string;
}

export type CellTone = 'positive' | 'negative' | 'neutral';

/**
 * A table cell, optionally carrying the sign of the value it holds.
 *
 * Plain strings stay plain: only a view that knows a column is a result rather
 * than a size opts into a tone, so a quantity or a count is never coloured.
 */
export type Cell = string | number | { text: string; tone: CellTone };

export interface TableSpec {
  columns: string[];
  rows: Cell[][];
  /** Columns rendered right-aligned with tabular figures. */
  numericFrom?: number;
}

/** Builds the plot host. Called again whenever the hidden set changes. */
export type PlotBuilder = (hidden: ReadonlySet<string>) => HTMLElement | null;

export interface FigureSpec {
  title: string;
  description?: string;
  /** Omitted for a single series: the title already names it. */
  legend?: LegendEntry[];
  /** Rendered between the description and the plot. */
  controls?: (rebuild: () => void) => HTMLElement;
  /** Returns the positioned host holding the SVG and its tooltip layer. */
  plot: PlotBuilder;
  /** A function form for a figure whose table depends on a control. */
  table: TableSpec | (() => TableSpec);
  t: Translator;
}

export function figure(spec: FigureSpec): HTMLElement {
  const { t } = spec;
  const hidden = new Set<string>();
  const plotSlot = el('div', { class: 'figure__plot' });

  // The SVG and its tooltip are created and discarded together with the host,
  // so a rebuild leaves no listener behind and there is no partial-update path
  // to get wrong.
  const renderPlot = (): void => {
    clear(plotSlot);
    plotSlot.append(spec.plot(hidden) ?? el('p', { class: 'figure__empty' }, [t('chart.empty')]));
  };
  renderPlot();

  // Only the contents are replaced, never the <details> itself: re-creating it
  // would close a table the reader had opened.
  const tableSlot = el('div', { class: 'table-scroll' });
  const renderTable = (): void => {
    clear(tableSlot);
    const table = typeof spec.table === 'function' ? spec.table() : spec.table;
    tableSlot.append(dataTable(table, t('chart.tableLabel', { title: spec.title })));
  };
  renderTable();

  const rebuild = (): void => {
    renderPlot();
    renderTable();
  };

  const parts: (Node | false)[] = [el('h3', { class: 'figure__title' }, [spec.title])];
  if (spec.description) {
    parts.push(el('p', { class: 'figure__description' }, [spec.description]));
  }
  if (spec.controls) {
    parts.push(el('div', { class: 'figure__controls' }, [spec.controls(rebuild)]));
  }
  if (spec.legend && spec.legend.length > 1) {
    parts.push(legendOf(spec.legend, hidden, renderPlot, t));
  }
  parts.push(plotSlot);

  // Open in print via `print.css`; a closed <details> prints as a single line.
  parts.push(
    el('details', { class: 'figure__table' }, [el('summary', {}, [t('chart.showTable')]), tableSlot]),
  );

  return el('figure', { class: 'figure' }, parts);
}

function legendOf(
  entries: LegendEntry[],
  hidden: Set<string>,
  onToggle: () => void,
  t: Translator,
): HTMLElement {
  const buttons: { key: string; button: HTMLButtonElement }[] = [];

  const syncDisabled = (): void => {
    // The last series standing cannot be hidden: an empty plot with no obvious
    // way back is worse than a filter that stops one step short.
    const visible = buttons.filter(({ key }) => !hidden.has(key));
    for (const { key, button } of buttons) {
      button.disabled = visible.length === 1 && !hidden.has(key);
    }
  };

  const items = entries.map((entry) => {
    const swatch = el('span', { class: 'legend__swatch', style: `background:${entry.color}` });
    if (entry.key === undefined) {
      return el('li', { class: 'legend__item' }, [swatch, entry.label]);
    }

    const key = entry.key;
    const item = el('li', { class: 'legend__item' }, []);
    const button = el(
      'button',
      { type: 'button', class: 'legend__toggle', 'aria-pressed': 'true' },
      [swatch, entry.label],
    );
    button.addEventListener('click', () => {
      const nowHidden = !hidden.has(key);
      if (nowHidden) hidden.add(key);
      else hidden.delete(key);
      button.setAttribute('aria-pressed', String(!nowHidden));
      // State is carried twice — a hollow swatch and a struck label — because a
      // reader who cannot separate the two fills must still see which is off.
      swatch.style.background = nowHidden ? 'transparent' : entry.color;
      swatch.style.boxShadow = nowHidden ? `inset 0 0 0 2px ${entry.color}` : 'none';
      item.classList.toggle('legend__item--off', nowHidden);
      syncDisabled();
      onToggle();
    });

    buttons.push({ key, button });
    item.append(button);
    return item;
  });

  const list = el('ul', { class: 'legend' }, items);
  syncDisabled();
  if (buttons.length > 0) {
    list.append(el('li', { class: 'legend__hint no-print' }, [t('chart.legendHint')]));
  }
  return list;
}

/** A plain data table, also used on its own for the non-chart sections. */
export function dataTable(spec: TableSpec, caption?: string): HTMLTableElement {
  const numericFrom = spec.numericFrom ?? 1;

  const head = el('thead', {}, [
    el(
      'tr',
      {},
      spec.columns.map((column, index) =>
        el(
          'th',
          { scope: 'col', class: index >= numericFrom ? 'is-numeric' : undefined },
          [column],
        ),
      ),
    ),
  ]);

  const body = el(
    'tbody',
    {},
    spec.rows.map((row) =>
      el(
        'tr',
        {},
        row.map((cell, index) => {
          const toned = typeof cell === 'object';
          const classes = [
            index >= numericFrom ? 'is-numeric' : '',
            toned ? `is-${cell.tone}` : '',
          ].filter(Boolean);
          return el(
            'td',
            { class: classes.length > 0 ? classes.join(' ') : undefined },
            [toned ? cell.text : String(cell)],
          );
        }),
      ),
    ),
  );

  return el('table', { class: 'data-table' }, [
    caption ? el('caption', { class: 'visually-hidden' }, [caption]) : false,
    head,
    body,
  ]);
}
