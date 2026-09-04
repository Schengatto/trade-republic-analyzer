// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { treemap, type TreemapSpec } from '../../src/ui/chart/treemap';

const tile = (key: string, value: number): TreemapSpec['tiles'][number] => ({
  key,
  value,
  label: key,
  amount: String(value),
});

const spec = (overrides: Partial<TreemapSpec> = {}): TreemapSpec => ({
  tiles: [tile('trading', 60), tile('charges', -30), tile('interest', 10)],
  title: 'What February was made of',
  ...overrides,
});

const percent = (value: string): number => Number(value.replace('%', ''));
const tilesOf = (node: HTMLElement): HTMLElement[] => [
  ...node.querySelectorAll<HTMLElement>('.treemap__tile'),
];

describe('treemap', () => {
  it('draws one tile per component', () => {
    expect(tilesOf(treemap(spec())!)).toHaveLength(3);
  });

  it('sizes a tile by the magnitude of its value, sign aside', () => {
    const areas = tilesOf(treemap(spec())!).map(
      (t) => percent(t.style.width) * percent(t.style.height),
    );
    // |60|, |30|, |10| of 100 units, laid out across a box worth 10000.
    expect(areas[0]!).toBeCloseTo(6000, 2);
    expect(areas[1]!).toBeCloseTo(3000, 2);
    expect(areas[2]!).toBeCloseTo(1000, 2);
  });

  // Area cannot be negative, so the colour is the only thing left to carry the
  // sign. The charge and the trading profit are the same kind of quantity to
  // `squarify` and must not read as the same kind of thing to the eye.
  it('colours a tile by the sign its area cannot express', () => {
    const backgrounds = tilesOf(treemap(spec())!).map((t) => t.style.background);
    expect(backgrounds[0]).toBe(backgrounds[2]);
    expect(backgrounds[1]).not.toBe(backgrounds[0]);
  });

  // The parts are in a fixed order so that a colour always means the same
  // component. A squarified treemap conventionally sorts descending by area,
  // which would let the order drift with the data.
  it('keeps the components in the order they arrived, not in descending size', () => {
    const node = treemap(
      spec({ tiles: [tile('trading', 5), tile('charges', -70), tile('interest', 25)] }),
    )!;
    expect(tilesOf(node).map((t) => t.dataset.part)).toEqual(['trading', 'charges', 'interest']);
  });

  it('omits a component that came to exactly zero', () => {
    // Zero area is not drawable, and a token minimum would state a weight the
    // component does not have.
    const node = treemap(spec({ tiles: [tile('trading', 60), tile('dividends', 0)] }))!;
    expect(tilesOf(node).map((t) => t.dataset.part)).toEqual(['trading']);
  });

  it('renders nothing when every component is zero', () => {
    expect(treemap(spec({ tiles: [tile('trading', 0)] }))).toBeNull();
  });

  // The tiles are not buttons and there is nothing below them to open, so the
  // picture names itself once and the figure's table carries the numbers. A
  // role of `img` also stops a screen reader reciting the decorative labels
  // inside, which would read the month twice over.
  it('names the whole picture and hides the tiles from assistive tech', () => {
    const node = treemap(spec())!;
    expect(node.getAttribute('role')).toBe('img');
    expect(node.getAttribute('aria-label')).toBe('What February was made of');
    expect(node.querySelector('button')).toBeNull();
  });

  // A tile eight pixels tall shows the middle eight pixels of a word, which
  // reads as a rendering fault rather than as a label. `overflow: hidden` is
  // still the right trade against spilling over a neighbour, but not drawing
  // the label at all beats either.
  describe('a tile too short for its two lines of type', () => {
    const cramped = spec({
      tiles: [tile('trading', 100), tile('charges', -50), tile('interest', 1)],
    });

    it('drops the label and the amount, while a tile that fits keeps both', () => {
      const drawn = tilesOf(treemap(cramped)!).map((t) => t.textContent);
      expect(drawn[0]).toBe('trading100');
      expect(drawn[1]).toBe('charges-50');
      expect(drawn[2]).toBe('');
    });

    it('still lays the dropped tile out at its true size', () => {
      // The label goes; the area never does. A tile that shrank to fit its
      // text would misstate the component it stands for.
      const areas = tilesOf(treemap(cramped)!).map(
        (t) => percent(t.style.width) * percent(t.style.height),
      );
      expect(areas[2]!).toBeCloseTo(10000 * (1 / 151), 2);
    });
  });
});
