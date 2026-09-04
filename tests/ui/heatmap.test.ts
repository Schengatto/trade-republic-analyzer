// @vitest-environment jsdom

/**
 * The calendar heatmap, checked as structure and behaviour rather than pixels.
 *
 * The invariants worth guarding are the ones a screen reader depends on: a
 * fixed twelve-column grid whatever months the file holds, a month outside the
 * period that is empty rather than a zero and out of the tab order, and an
 * accessible name on every clickable cell so the tint is never the only thing
 * carrying the figure.
 */

import { describe, expect, it, vi } from 'vitest';
import { heatmap, type HeatmapSpec } from '../../src/ui/chart/heatmap';

const COLUMNS = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];

/**
 * Every figure carries an abbreviated form and an exact one. The fixture keeps
 * them visibly different — `100` against `100,00` — so a test can tell which of
 * the two a cell, a label or the hover readout actually used.
 */
const figure = (name: string, value: number) => ({
  name,
  primary: `${value}`,
  exact: `${value},00`,
});

const cell = (key: string, month: number, value: number): HeatmapSpec['rows'][number]['cells'][number] => ({
  ...figure(key, value),
  key,
  month,
  value,
});

const spec = (overrides: Partial<HeatmapSpec> = {}): HeatmapSpec => ({
  columns: COLUMNS,
  rows: [
    {
      year: '2024',
      cells: [cell('2024-11', 11, 100), cell('2024-12', 12, -50)],
      total: figure('2024', 50),
    },
    { year: '2025', cells: [cell('2025-01', 1, 25)], total: figure('2025', 25) },
  ],
  totals: {
    label: 'Totale',
    // January and the two months of 2024 are the only ones any year holds.
    byMonth: [
      figure('gennaio', 25),
      ...Array.from({ length: 9 }, () => null),
      figure('novembre', 100),
      figure('dicembre', -50),
    ],
    grand: figure('Totale', 75),
  },
  onOpen: () => {},
  ...overrides,
});

/** The hover readout is wired to `mouseenter`, which does not bubble. */
const hover = (target: Element): void => {
  target.dispatchEvent(new MouseEvent('mouseenter'));
};

describe('heatmap', () => {
  it('draws one row per year and twelve columns', () => {
    const node = heatmap(spec())!;
    expect(node.querySelectorAll('tbody tr')).toHaveLength(2);
    // Twelve column headings and the totals column. The corner is a <td>, not
    // a <th>: it names nothing, and heading it would make a screen reader read
    // the year column as a heading of the months.
    const headings = [...node.querySelectorAll('thead th')].map((th) => th.textContent);
    expect(headings).toEqual([...COLUMNS, 'Totale']);
  });

  it('leaves a month outside the period empty and out of the tab order', () => {
    const node = heatmap(spec())!;
    const row = node.querySelectorAll('tbody tr')[0]!;
    const cells = row.querySelectorAll('td');
    // Twelve months and the row's own total.
    expect(cells).toHaveLength(13);
    // January 2024 is before the account existed: not a zero, and not clickable.
    expect(cells[0]!.querySelector('button')).toBeNull();
    expect(cells[0]!.textContent).toBe('');
    expect(cells[10]!.querySelector('button')).not.toBeNull();
  });

  it('gives every present month a button carrying its figure', () => {
    const node = heatmap(spec())!;
    const buttons = [...node.querySelectorAll('button')];
    expect(buttons).toHaveLength(3);
    expect(buttons[0]!.textContent).toContain('100');
    // The cell prints the abbreviation; the accessible name spends its room on
    // the exact figure, because a screen reader has no hover to fall back on.
    expect(buttons[0]!.getAttribute('aria-label')).toBe('2024-11: 100,00');
    // The key is on the element, so a test — and the view — can read the month
    // back off a button without parsing its label.
    expect(buttons[0]!.dataset.month).toBe('2024-11');
  });

  // One figure per cell. A second line used to carry the comparison with the
  // month before, which could not hold one unit — a percentage where the sign
  // held, an amount where it flipped — so the same slot read as two different
  // quantities down one grid. `textContent` is the assertion rather than a
  // count of spans: a cell that renders the figure twice, or appends anything
  // beside it, fails here.
  it('says the figure once and nothing else', () => {
    const node = heatmap(spec())!;
    const buttons = [...node.querySelectorAll('button')];
    expect(buttons.map((b) => b.textContent)).toEqual(['100', '-50', '25']);
  });

  it('reports the month that was clicked', () => {
    const onOpen = vi.fn();
    const node = heatmap(spec({ onOpen }))!;
    node.querySelectorAll('button')[1]!.click();
    expect(onOpen).toHaveBeenCalledWith('2024-12');
  });

  // A cell opens the month; it does not switch itself on. `aria-pressed` would
  // promise a pressed state that never arrives, because the grid the cell lives
  // in is gone by the time the month is showing.
  it('carries no toggle state on a cell that only ever opens', () => {
    const node = heatmap(spec())!;
    const pressed = [...node.querySelectorAll('button')].map((b) => b.getAttribute('aria-pressed'));
    expect(pressed).toEqual([null, null, null]);
  });

  it('scales the tint against the largest month, not against zero', () => {
    const node = heatmap(spec())!;
    const fills = [...node.querySelectorAll<HTMLElement>('.heatmap__fill')];
    const alphaOf = (index: number) => Number(fills[index]!.style.opacity);
    // 100 is the biggest magnitude in the set, so it is the most opaque.
    expect(alphaOf(0)).toBeGreaterThan(alphaOf(1));
    expect(alphaOf(1)).toBeGreaterThan(alphaOf(2));
    expect(alphaOf(0)).toBeLessThanOrEqual(1);
  });

  // The ceiling is a contrast budget, not a taste. Text sits on the tint
  // composited over --surface-1 and loses contrast monotonically as alpha
  // rises, in both themes, so the peak cell is the worst cell whatever the
  // data. 0.70 puts the worst pole/theme pair — the dark gain pole — at
  // 5.30:1; 0.79 drops it to 4.48 and fails WCAG AA for this size of type.
  it('never tints the peak month past the ceiling the text can survive', () => {
    const node = heatmap(spec())!;
    const alphas = [...node.querySelectorAll<HTMLElement>('.heatmap__fill')].map((fill) =>
      Number(fill.style.opacity),
    );
    expect(Math.max(...alphas)).toBeLessThanOrEqual(0.7);
  });

  it('renders nothing when there is no month at all', () => {
    expect(heatmap(spec({ rows: [] }))).toBeNull();
  });
});

describe('heatmap totals', () => {
  it('closes each year with that year’s figure', () => {
    const node = heatmap(spec())!;
    const row = node.querySelectorAll('tbody tr')[0]!;
    const total = row.querySelector('.heatmap__total')!;
    expect(total.textContent).toBe('50');
    expect(row.querySelectorAll('td')[12]).toBe(total);
  });

  it('closes the grid with a row holding each calendar month across the years', () => {
    const node = heatmap(spec())!;
    const foot = node.querySelector('tfoot tr')!;
    expect(foot.querySelector('th')!.textContent).toBe('Totale');
    const figures = [...foot.querySelectorAll('td')].map((td) => td.textContent);
    // Twelve months and the grand total. A month no year holds stays empty
    // rather than printing a zero nothing added up to.
    expect(figures).toEqual(['25', '', '', '', '', '', '', '', '', '', '100', '-50', '75']);
  });

  // A year is bigger than any month inside it. Letting the totals into the
  // ramp would push every month down against the year that contains them, and
  // the grid would go pale wherever the account did well.
  it('keeps the totals out of the colour scale that the months are ranked on', () => {
    const node = heatmap(spec())!;
    expect(node.querySelectorAll('.heatmap__total .heatmap__fill')).toHaveLength(0);
    // The peak is still the largest month, so its cell is still the darkest.
    const fills = [...node.querySelectorAll<HTMLElement>('.heatmap__fill')];
    expect(fills).toHaveLength(3);
    expect(Number(fills[0]!.style.opacity)).toBe(0.7);
  });

  // A total is not a month: there is nothing for a click to open, so offering
  // a button would promise a view that does not exist.
  it('leaves the totals unclickable and out of the tab order', () => {
    const onOpen = vi.fn();
    const node = heatmap(spec({ onOpen }))!;
    expect(node.querySelectorAll('.heatmap__total button')).toHaveLength(0);
    expect(node.querySelectorAll('button')).toHaveLength(3);
  });
});

describe('heatmap hover readout', () => {
  it('answers a hovered cell with the exact figure the abbreviation dropped', () => {
    const node = heatmap(spec())!;
    const tip = node.querySelector<HTMLElement>('.tooltip')!;
    expect(tip.hidden).toBe(true);

    hover(node.querySelectorAll('button')[0]!);

    expect(tip.hidden).toBe(false);
    expect(tip.textContent).toContain('2024-11');
    expect(tip.textContent).toContain('100,00');
  });

  it('answers a hovered total too, which no keyboard can reach', () => {
    const node = heatmap(spec())!;
    hover(node.querySelector('.heatmap__total')!);
    expect(node.querySelector<HTMLElement>('.tooltip')!.textContent).toContain('50,00');
  });

  it('takes the readout back when the pointer leaves', () => {
    const node = heatmap(spec())!;
    const button = node.querySelectorAll('button')[0]!;
    hover(button);
    button.dispatchEvent(new MouseEvent('mouseleave'));
    expect(node.querySelector<HTMLElement>('.tooltip')!.hidden).toBe(true);
  });

  it('shows the readout on focus, so it is not the mouse’s alone', () => {
    const node = heatmap(spec())!;
    node.querySelectorAll('button')[2]!.dispatchEvent(new FocusEvent('focus'));
    expect(node.querySelector<HTMLElement>('.tooltip')!.textContent).toContain('25,00');
  });

  // The exact figure is already in the button's accessible name. A live region
  // repeating it would make every cell announce itself twice.
  it('stays silent for a screen reader, which already has the exact figure', () => {
    const node = heatmap(spec())!;
    const tip = node.querySelector('.tooltip')!;
    expect(tip.getAttribute('aria-hidden')).toBe('true');
    expect(tip.getAttribute('aria-live')).toBeNull();
  });

  // The grid scrolls sideways on a narrow screen. A readout mounted inside the
  // scroller is clipped by its own overflow, so it hangs outside it.
  it('mounts the readout outside the box that scrolls', () => {
    const node = heatmap(spec())!;
    expect(node.querySelector('.heatmap-scroll .tooltip')).toBeNull();
    expect(node.querySelector(':scope > .tooltip')).not.toBeNull();
  });
});
