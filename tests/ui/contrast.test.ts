/**
 * The contrast of the filled controls in the interface.
 *
 * A control that paints its own fill is where a palette edit can quietly drop a
 * label below WCAG AA, because the fill was chosen to look right rather than to
 * carry text. Both controls here had done it with --series-1, a categorical
 * chart slot: `.button--primary` measured 4.42:1 under #fff in the light palette
 * and 3.64:1 in the dark one, and `.skip-link:focus` inked its text at 4.12:1 on
 * --surface-0 in the light palette.
 *
 * Each pair is read out of app.css rather than restated here. A test that
 * asserted two hex values would keep passing after the rule was pointed at a
 * different token, which is exactly the regression it exists to catch.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/* Comments out: a declaration explained in prose above it would otherwise be
   read as a property whose name is the last sentence of the comment. */
const CSS = readFileSync(join(process.cwd(), 'src', 'ui', 'app.css'), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
);

/* main.ts imports both sheets, so a token declared in either is live in both. */
const PRINT_CSS = readFileSync(join(process.cwd(), 'src', 'ui', 'print.css'), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
);

/** The declarations of one flat rule. None of the blocks read here nest. */
function declarations(selector: string): Map<string, string> {
  const head = `${selector} {`;
  const start = CSS.indexOf(head);
  if (start < 0) throw new Error(`app.css has no rule for ${selector}`);
  const end = CSS.indexOf('}', start);
  const entries = CSS.slice(start + head.length, end)
    .split(';')
    .map((line) => line.trim())
    .filter((line) => line.includes(':'))
    .map((line): [string, string] => {
      const colon = line.indexOf(':');
      return [line.slice(0, colon).trim(), line.slice(colon + 1).trim()];
    });
  return new Map(entries);
}

const ROOT = declarations(':root');
const DARK = declarations('[data-theme="dark"]');
const BUTTON = declarations('.button--primary');
const SKIP_LINK = declarations('.skip-link:focus');

const THEMES = [
  { name: 'light', tokens: ROOT },
  { name: 'dark', tokens: new Map([...ROOT, ...DARK]) },
];

/** A declared value, with a single `var(--token)` looked up in the theme. */
function resolve(value: string, tokens: Map<string, string>): string {
  const reference = /^var\((--[\w-]+)\)$/.exec(value);
  if (!reference) return value;
  const token = tokens.get(reference[1]!);
  if (!token) throw new Error(`app.css never declares ${reference[1]}`);
  return token;
}

function channels(hex: string): [number, number, number] {
  const short = /^#([\da-f])([\da-f])([\da-f])$/i.exec(hex);
  const long = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex);
  if (short) return [short[1]!, short[2]!, short[3]!].map((c) => parseInt(c + c, 16)) as [number, number, number];
  if (long) return [long[1]!, long[2]!, long[3]!].map((c) => parseInt(c, 16)) as [number, number, number];
  throw new Error(`not a hex colour: ${hex}`);
}

/** WCAG 2.x relative luminance. */
function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((value) => {
    const c = value / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (lighter + 0.05) / (darker + 0.05);
}

describe('the contrast maths', () => {
  // Anchored on the two ratios every implementation of this formula agrees on,
  // so a broken helper fails here rather than passing the button silently.
  it('puts black on white at 21:1 and a hex shorthand on the same scale', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrast('#fff', '#000')).toBeCloseTo(21, 5);
  });

  it('agrees with the published ratio for a mid-tone', () => {
    expect(contrast('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
  });
});

describe('the primary button', () => {
  it('paints itself with a theme token, so both palettes can be checked', () => {
    expect(BUTTON.get('background')).toMatch(/^var\(--[\w-]+\)$/);
    expect(BUTTON.get('border-color')).toBe(BUTTON.get('background'));
  });

  for (const { name, tokens } of THEMES) {
    it(`keeps its label at 4.5:1 in the ${name} palette`, () => {
      const fill = resolve(BUTTON.get('background')!, tokens);
      const ink = resolve(BUTTON.get('color')!, tokens);
      expect(contrast(fill, ink)).toBeGreaterThanOrEqual(4.5);
    });

    // 1.4.11: the fill is what tells the button apart from the card it sits on.
    it(`keeps its fill 3:1 from the surface under it in the ${name} palette`, () => {
      const fill = resolve(BUTTON.get('background')!, tokens);
      expect(contrast(fill, tokens.get('--surface-1')!)).toBeGreaterThanOrEqual(3);
    });
  }
});

/*
 * The skip link is the first thing a keyboard reaches, and revealing it is the
 * whole of its job, so focus turns it into a chip rather than recolouring its
 * text. That also spares it a token of its own: --accent-strong is the fill the
 * button already proved, whereas as an *ink* it is unusable here — it is a step
 * darker than --series-1 in the dark palette, where it measures 4.01:1 on the
 * page. A fill it can carry; text it cannot.
 */
describe('the focused skip link', () => {
  it('paints itself with a theme token, so both palettes can be checked', () => {
    expect(SKIP_LINK.get('background')).toMatch(/^var\(--[\w-]+\)$/);
  });

  // The ground below is the load-bearing assumption of the 3:1 check: the link
  // sits in .app-header, which paints nothing, so the body's --surface-0 shows
  // through. Giving the header a background would move the ground and leave the
  // measurement below quietly answering the wrong question.
  it('sits on the bare page, not on a surface of its own', () => {
    expect(declarations('.app-header').has('background')).toBe(false);
  });

  for (const { name, tokens } of THEMES) {
    it(`keeps its label at 4.5:1 in the ${name} palette`, () => {
      const fill = resolve(SKIP_LINK.get('background')!, tokens);
      const ink = resolve(SKIP_LINK.get('color')!, tokens);
      expect(contrast(fill, ink)).toBeGreaterThanOrEqual(4.5);
    });

    it(`keeps its fill 3:1 from the page under it in the ${name} palette`, () => {
      const fill = resolve(SKIP_LINK.get('background')!, tokens);
      expect(contrast(fill, tokens.get('--surface-0')!)).toBeGreaterThanOrEqual(3);
    });
  }
});

/*
 * The sweep of every rendered colour pair lives in `e2e/contrast.spec.ts`, not
 * here: what a rule's ink actually sits on is decided by an ancestor, and often
 * by an ancestor whose class is computed (`section section--${variant}`), so no
 * amount of reading this file resolves it. See that spec's header.
 *
 * What stays here is the one defect a browser cannot report. An undefined
 * `var()` does not fall back and does not throw — the declaration is dropped and
 * `getComputedStyle` answers with the inherited value, which is a plausible
 * colour. The rendered page looks merely wrong, so the sweep sails past it.
 * Only the text of the stylesheet shows the token was never declared.
 */
describe('the custom properties the stylesheets reference', () => {
  const SHEETS = [
    { name: 'app.css', text: CSS },
    { name: 'print.css', text: PRINT_CSS },
  ];

  /* Anchored to the line start: `.button--primary:hover {` is a selector, not a
     declaration of `--primary`, and counting it would let a typo resolve. */
  const declared = new Set(
    SHEETS.flatMap(({ text }) => [...text.matchAll(/^\s*(--[\w-]+)\s*:/gm)].map(([, name]) => name!)),
  );

  it('finds the tokens it is about to check', () => {
    // Without this, a regex that matched nothing would report zero violations.
    expect(declared.has('--ink')).toBe(true);
    expect(declared.has('--surface-0')).toBe(true);
    expect(declared.size).toBeGreaterThan(10);
  });

  for (const { name, text } of SHEETS) {
    it(`declares every token ${name} reads`, () => {
      const used = [...text.matchAll(/var\((--[\w-]+)/g)].map(([, token]) => token!);
      expect(used.length).toBeGreaterThan(0);
      expect([...new Set(used)].filter((token) => !declared.has(token))).toEqual([]);
    });
  }

  // A token that exists only under [data-theme="dark"] is unset in the light
  // palette, where it paints nothing at all. The reverse is fine: dark inherits
  // :root for everything it does not override.
  it('gives every dark-palette token a light-palette default', () => {
    const darkOnly = [...DARK.keys()].filter((token) => token.startsWith('--') && !ROOT.has(token));
    expect(darkOnly).toEqual([]);
  });
});
