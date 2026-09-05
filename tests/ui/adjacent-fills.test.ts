/**
 * Two fills the reader is asked to compare side by side.
 *
 * `e2e/contrast.spec.ts` composites ink against the ground behind it, which is
 * the one thing a stylesheet cannot answer on its own. It says nothing about
 * this defect: two filled marks drawn 2px apart that a colour-blind reader
 * cannot tell apart. Nothing composites here — both bars take their token
 * value straight — so the check is a parse of the two sheets rather than a
 * browser, and that is what lets it cover the paper palette as cheaply as the
 * screen one.
 *
 * The `#capital` figure is the first place a categorical slot and a diverging
 * pole are neighbours: `groupedRowChart` puts the average capital
 * (`--series-1`) and the month's result (`--pole-positive` / `--pole-negative`)
 * in one group, `G_PAIR_GAP` = 2px apart. Everywhere before it the two families
 * lived in separate figures, so the adjacent-pair rule at the head of
 * `src/ui/chart/palette.ts` had only ever been run within one family.
 *
 * The thresholds and the simulation are the data-visualization validator's: a
 * ΔE (OKLab ×100) of 8 between neighbours under Machado-Oliveira-Fernandes
 * severity-1.0 protanopia and deuteranopia, and 15 under unsimulated vision.
 * They are the same numbers the palette header quotes, so a pair recorded there
 * as passing and a pair passing here cannot drift apart.
 *
 * `--pole-neutral` is not in the pair list although a group can draw it: a bar
 * only takes the neutral when its value is exactly zero, and that bar is
 * `Math.max(1, …)` — one pixel at the baseline. Its hue identifies nothing, and
 * it is the colour chosen so that nothing is what it reads as. (Measured
 * anyway, for the record: --pole-neutral ↔ --pole-positive is ΔE 5.3 under
 * deuteranopia in the dark palette. A wider zero bar would need a rethink.)
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { POLE_NEGATIVE, POLE_POSITIVE, SERIES_1 } from '../../src/ui/chart/palette';

const CVD_TARGET = 8;
const NORMAL_FLOOR = 15;

function read(file: string): string {
  /* Comments out, as in contrast.test.ts: a hex quoted in the prose above a
     declaration would otherwise be parsed as a declared value. */
  return readFileSync(join(process.cwd(), 'src', 'ui', file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Every flat rule of a sheet, as a selector list and its custom properties. */
function rules(css: string): { selectors: string[]; tokens: Map<string, string> }[] {
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, head, body]) => ({
    selectors: head!.split(',').map((one) => one.trim()),
    tokens: new Map(
      [...body!.matchAll(/(--[\w-]+)\s*:\s*([^;]+)/g)].map(([, name, value]) => [name!, value!.trim()]),
    ),
  }));
}

const APP = rules(read('app.css'));
/* main.ts imports print.css after app.css, so at the equal specificity of
   `:root` and `[data-theme="dark"]` the paper block wins in both themes. */
const PRINT = rules(read('print.css'));

/**
 * The tokens in force for one mode: the rules of `sheets`, in cascade order,
 * whose selector list carries one of `selectors`.
 *
 * The screen modes read app.css alone. Handing them both sheets is the trap
 * this parser fell into first — print.css also declares `:root`, and being the
 * later import it wins, so all four modes silently measured the paper palette
 * and agreed with each other.
 */
function palette(sheets: (typeof APP)[], selectors: string[]): Map<string, string> {
  const merged = new Map<string, string>();
  for (const rule of sheets.flat()) {
    if (!rule.selectors.some((one) => selectors.includes(one))) continue;
    for (const [name, value] of rule.tokens) merged.set(name, value);
  }
  return merged;
}

const LIGHT = ':root';
const DARK = '[data-theme="dark"]';

/*
 * Four modes, of which two coincide today: the paper block resets both themes
 * to one palette, on purpose. They are still parsed separately, so the day a
 * print token is given a per-theme value the pair is measured in both.
 */
const MODES = [
  { name: 'light', tokens: palette([APP], [LIGHT]) },
  { name: 'dark', tokens: palette([APP], [LIGHT, DARK]) },
  { name: 'print, light', tokens: palette([APP, PRINT], [LIGHT]) },
  { name: 'print, dark', tokens: palette([APP, PRINT], [LIGHT, DARK]) },
];

/** `var(--x)` back to `--x`: the pair list names roles, never hexes. */
function tokenOf(role: string): string {
  const name = /^var\((--[\w-]+)\)$/.exec(role);
  if (!name) throw new Error(`not a token reference: ${role}`);
  return name[1]!;
}

/** The capital bar against each colour the result bar beside it can take. */
const PAIRS = [
  { of: SERIES_1, against: POLE_POSITIVE },
  { of: SERIES_1, against: POLE_NEGATIVE },
];

// -- colour maths, ported from the validator the palette header was checked with

/** Machado, Oliveira & Fernandes (2009), severity 1.0, on linear RGB. */
const MACHADO = {
  protan: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deutan: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
} as const;

type Vision = keyof typeof MACHADO;

function linear(hex: string): [number, number, number] {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) throw new Error(`not a hex colour: ${hex}`);
  const channels = [1, 3, 5].map((at) => {
    const value = parseInt(hex.slice(at, at + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels as [number, number, number];
}

function simulate([r, g, b]: [number, number, number], vision: Vision): [number, number, number] {
  const matrix = MACHADO[vision];
  const clamp = (value: number): number => Math.max(0, Math.min(1, value));
  return matrix.map((row) => clamp(row[0]! * r + row[1]! * g + row[2]! * b)) as [
    number,
    number,
    number,
  ];
}

function oklab([r, g, b]: [number, number, number]): [number, number, number] {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** Euclidean distance in OKLab ×100. No vision given: unsimulated. */
function deltaE(one: string, other: string, vision?: Vision): number {
  const shift = (hex: string): [number, number, number] =>
    vision ? simulate(linear(hex), vision) : linear(hex);
  const [l1, a1, b1] = oklab(shift(one));
  const [l2, a2, b2] = oklab(shift(other));
  return 100 * Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

describe('the fills the capital figure draws 2px apart', () => {
  it('reads a hex for every one of them, in every mode', () => {
    // Without this, a selector or a regex that matched nothing would leave the
    // pairs below comparing an empty map against itself and reporting no
    // violation at all.
    for (const { name, tokens } of MODES) {
      for (const { of, against } of PAIRS) {
        for (const role of [of, against]) {
          expect(tokens.get(tokenOf(role)), `${role} in ${name}`).toMatch(/^#[0-9a-f]{6}$/);
        }
      }
    }
  });

  it('reads four palettes and not one repeated', () => {
    /*
     * Four green cases prove nothing if every case read the same map. Each
     * screen theme paints its own step, and paper overrides both; only the two
     * print modes are allowed to agree, and they agree because one block
     * resets `:root` and `[data-theme="dark"]` together.
     */
    const green = (name: string): string | undefined =>
      MODES.find((mode) => mode.name === name)!.tokens.get(tokenOf(POLE_POSITIVE));

    expect(green('light')).not.toBe(green('dark'));
    expect(green('light')).not.toBe(green('print, light'));
    expect(green('dark')).not.toBe(green('print, dark'));
    expect(green('print, light')).toBe(green('print, dark'));
  });

  it('measures pairs it knows the answer for', () => {
    // The maths, not the palette. OKLab's lightness axis runs 0 to 1, so black
    // against white is 100 and nothing is wider; a helper that answered with a
    // constant, or one that never simulated, fails here rather than passing
    // every pair below. The hexes are synthetic on purpose — a self-check
    // written on palette values stops being a self-check the day the palette
    // moves.
    expect(deltaE('#ffffff', '#000000')).toBeCloseTo(100, 0);
    expect(deltaE('#ffffff', '#ffffff', 'deutan')).toBe(0);

    // Red against green is the whole reason for simulating: far apart to a
    // full-colour reader, and the simulation has to collapse it.
    const full = deltaE('#ff0000', '#00cc00');
    expect(full).toBeGreaterThan(40);
    expect(deltaE('#ff0000', '#00cc00', 'deutan')).toBeLessThan(full / 4);
  });

  for (const { name, tokens } of MODES) {
    for (const { of, against } of PAIRS) {
      const hex = (role: string): string => tokens.get(tokenOf(role))!;

      it(`separates ${tokenOf(of)} from ${tokenOf(against)} (${name})`, () => {
        const pair = [hex(of), hex(against)] as const;
        for (const vision of ['protan', 'deutan'] as const) {
          expect(deltaE(pair[0], pair[1], vision), vision).toBeGreaterThanOrEqual(CVD_TARGET);
        }
        expect(deltaE(pair[0], pair[1]), 'normal').toBeGreaterThanOrEqual(NORMAL_FLOOR);
      });
    }
  }

  /*
   * The pair list is a claim about one figure, and the figure can change under
   * it. Reading the import binds the two: a fourth colour in `#capital` — a
   * third series, a slot swapped for another — lands here as a failure that
   * names the token nobody measured, instead of passing in silence.
   */
  it('is the whole palette the capital figure imports', () => {
    const source = readFileSync(join(process.cwd(), 'src', 'ui', 'views', 'capital.ts'), 'utf8');
    const imported = /import \{([^}]+)\} from '\.\.\/chart\/palette'/.exec(source);
    expect(imported, 'capital.ts no longer imports the palette by that path').not.toBeNull();

    const names = imported![1]!
      .split(',')
      .map((one) => one.trim())
      .filter(Boolean)
      .sort();
    // `poleFor` is the function that picks between the two poles, and it can
    // also return `POLE_NEUTRAL` — the one-pixel zero bar the header explains.
    expect(names).toEqual(['POLE_NEGATIVE', 'POLE_POSITIVE', 'SERIES_1', 'poleFor']);
  });
});
