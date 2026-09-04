/**
 * Every colour pair the reader actually sees, measured against WCAG AA.
 *
 * Two defects were fixed one at a time before this existed — the primary button
 * (4.42:1 under #fff) and the focused skip link (4.12:1 on the page) — and both
 * were caught by eye rather than by measurement. Catching the third one the same
 * way is a matter of luck, so this enumerates instead of listing: it walks the
 * rendered report and checks every element that paints text, which means a
 * component written next month is covered the day it renders.
 *
 * Why a browser rather than a parse of app.css. The effective background of a
 * rule is not a property of that rule:
 *
 *   - `.tile` is --surface-2, but `.section--lead .tile` is --surface-1, so
 *     `.tile__label`'s ink sits on two different grounds depending on an
 *     ancestor;
 *   - that deciding class exists in no source file — `views/common.ts` builds it
 *     as `section section--${variant}`;
 *   - 42 rules in app.css declare `color` and only 28 declare a background, so
 *     most ink inherits its ground from an element that never names it;
 *   - `.app-bar` is `color-mix(in srgb, var(--surface-0) 88%, transparent)`, and
 *     a heatmap cell's tint is computed in JS, so two grounds are not literals
 *     anywhere.
 *
 * Compositing up the ancestor chain in a real layout answers all four. The
 * static half of the job — that every `var()` names a token that exists — stays
 * in `tests/ui/contrast.test.ts`, because a dropped declaration is invisible
 * here: `getComputedStyle` reports the inherited colour and the page merely
 * looks wrong.
 */
import { expect, test, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const FIXTURE = fileURLToPath(new URL('../tests/fixtures/full-coverage.csv', import.meta.url));

/**
 * Pairs this sweep cannot honestly measure, each with the reason and where the
 * contrast is guaranteed instead. This is a list, not a filter: a pair drops out
 * only by being named here, and `they are all still in the page` below fails if
 * an entry ever stops matching anything, so a stale excuse cannot outlive the
 * element it excused.
 */
const EXCEPTIONS: { selector: string; why: string }[] = [];

/*
 * The list is empty, and that is a finding rather than an oversight. The one
 * exception this sweep was written expecting — SVG chart labels, on the grounds
 * that a label painted over sibling geometry has no ancestor to read — turned
 * out not to apply to any label this app draws: `chart__tick` is placed in the
 * margin (`MARGIN.left - 10`, `height - 12`) and `chart__endpoint` beyond the
 * end of its bar (`left + width + 8`, bars.ts:426). Both sit on the plain
 * section surface, so ancestry answers correctly and excusing them would only
 * have hidden them. The heatmap's JS-computed tint needs no excuse either: it
 * is an inline background on the cell, which is exactly what compositing reads.
 */

/**
 * Runs in the page. Self-contained on purpose: Playwright serialises it, so it
 * may not close over anything in this module.
 */
function collect(): Sample[] {
  type Rgba = { r: number; g: number; b: number; a: number };

  const parse = (value: string): Rgba | null => {
    const match = /rgba?\(([^)]+)\)/.exec(value);
    if (!match) return null;
    const parts = match[1]!.split(/[\s,/]+/).filter(Boolean).map(Number);
    if (parts.length < 3 || parts.some(Number.isNaN)) return null;
    return { r: parts[0]!, g: parts[1]!, b: parts[2]!, a: parts.length > 3 ? parts[3]! : 1 };
  };

  // Straight source-over: the lower layer is already opaque.
  const flatten = (top: Rgba, bottom: Rgba): Rgba => ({
    r: top.r * top.a + bottom.r * (1 - top.a),
    g: top.g * top.a + bottom.g * (1 - top.a),
    b: top.b * top.a + bottom.b * (1 - top.a),
    a: 1,
  });

  const luminance = ({ r, g, b }: Rgba): number => {
    const [rl, gl, bl] = [r, g, b].map((value) => {
      const c = value / 255;
      return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    }) as [number, number, number];
    return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
  };

  const ratio = (x: Rgba, y: Rgba): number => {
    const [hi, lo] = [luminance(x), luminance(y)].sort((a, b) => b - a) as [number, number];
    return (hi + 0.05) / (lo + 0.05);
  };

  const hex = ({ r, g, b }: Rgba): string =>
    '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

  // The ground under an element: the first opaque background at or above it,
  // with every translucent layer between composited back down onto it.
  const ground = (start: Element): { colour: Rgba; gradient: string | null } => {
    const stack: Rgba[] = [];
    let gradient: string | null = null;
    for (let node: Element | null = start; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.backgroundImage !== 'none' && gradient === null) {
        gradient = node.tagName.toLowerCase();
      }
      const colour = parse(style.backgroundColor);
      if (!colour || colour.a === 0) continue;
      stack.push(colour);
      if (colour.a >= 1) break;
    }
    const WHITE: Rgba = { r: 255, g: 255, b: 255, a: 1 };
    // Nothing opaque all the way up means the canvas shows through.
    const top = stack[stack.length - 1];
    let base: Rgba =
      top && top.a >= 1
        ? stack.pop()!
        : parse(getComputedStyle(document.documentElement).backgroundColor) ?? WHITE;
    if (base.a < 1) base = flatten(base, WHITE);
    for (let i = stack.length - 1; i >= 0; i -= 1) base = flatten(stack[i]!, base);
    return { colour: base, gradient };
  };

  const describe = (node: Element): string => {
    const name = node.tagName.toLowerCase();
    const raw = node.getAttribute('class');
    return name + (raw ? '.' + raw.trim().split(/\s+/).join('.') : '');
  };

  const results: Sample[] = [];
  for (const node of document.querySelectorAll('body *')) {
    const own = [...node.childNodes].some((child) => child.nodeType === 3 && child.textContent!.trim());
    if (!own) continue;

    const style = getComputedStyle(node);
    if (style.visibility === 'hidden' || style.display === 'none') continue;
    const box = node.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) continue;

    // An ancestor faded to nothing takes its subtree with it.
    let faded = false;
    for (let a: Element | null = node; a; a = a.parentElement) {
      if (Number.parseFloat(getComputedStyle(a).opacity) === 0) faded = true;
    }
    if (faded) continue;

    // SVG paints text with fill; HTML paints it with color.
    const isSvg = node.namespaceURI === 'http://www.w3.org/2000/svg';
    const ink = parse(isSvg ? style.fill : style.color);
    if (!ink || ink.a === 0) continue;

    const { colour: bg, gradient } = ground(node);
    const size = Number.parseFloat(style.fontSize);
    const weight = Number.parseInt(style.fontWeight, 10) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);

    const painted = ink.a < 1 ? flatten(ink, bg) : ink;
    results.push({
      element: describe(node),
      text: node.textContent!.trim().slice(0, 40),
      ink: hex(painted),
      background: hex(bg),
      gradient,
      size,
      weight,
      required: large ? 3 : 4.5,
      ratio: Math.round(ratio(painted, bg) * 100) / 100,
      svg: isSvg,
    });
  }
  return results;
}

type Sample = {
  element: string;
  text: string;
  ink: string;
  background: string;
  gradient: string | null;
  size: number;
  weight: number;
  required: number;
  ratio: number;
  svg: boolean;
};

async function load(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /csv/i }).click();
  await (await chooser).setFiles(FIXTURE);
  await expect(page.locator('#report')).toBeVisible();
  // Each chart's table is a collapsed <details>. Its contents are text a reader
  // reaches by clicking, so they are in scope; closed, they have no box at all
  // and the sweep would score them as absent rather than as passing.
  await page.evaluate(() => {
    for (const details of document.querySelectorAll('details')) details.open = true;
  });
}

async function sample(page: Page): Promise<Sample[]> {
  return await page.evaluate(collect);
}

function excuse(element: string): string | null {
  for (const { selector, why } of EXCEPTIONS) if (element.startsWith(selector)) return why;
  return null;
}

function failures(samples: Sample[]): Sample[] {
  return samples.filter((s) => !excuse(s.element) && s.ratio < s.required);
}

function report(samples: Sample[]): string {
  return samples
    .map(
      (s) =>
        `${s.element} — ${s.ratio}:1 (needs ${s.required}:1) ink ${s.ink} on ${s.background} @${s.size}px/${s.weight} "${s.text}"`,
    )
    .join('\n');
}

for (const theme of ['light', 'dark'] as const) {
  test(`every rendered pair meets WCAG AA in the ${theme} palette`, async ({ page }) => {
    await load(page);
    await page.evaluate((value) => document.documentElement.setAttribute('data-theme', value), theme);

    const samples = await sample(page);

    // Without this the suite would report "no violations" for an empty page.
    expect(samples.length, 'elements painting text').toBeGreaterThan(50);
    expect(
      samples.some((s) => s.element.includes('tile__label')),
      'the tile labels are among the elements swept',
    ).toBe(true);

    const gradients = samples.filter((s) => s.gradient);
    expect(gradients.map((s) => `${s.element} over ${s.gradient}`), 'grounds this sweep cannot flatten').toEqual([]);

    expect(failures(samples).length, `\n${report(failures(samples))}\n`).toBe(0);
  });
}

/*
 * Paper has its own poles and its own ink — print.css rewrites --ink, --surface
 * and every --series-* — and until now nothing checked any of it. It is swept
 * under both themes because the sheet forces the light palette on both, so the
 * dark run is what proves that forcing works rather than assuming it.
 */
for (const theme of ['light', 'dark'] as const) {
  test(`every printed pair meets WCAG AA with data-theme="${theme}"`, async ({ page }) => {
    await load(page);
    await page.evaluate((value) => document.documentElement.setAttribute('data-theme', value), theme);
    await page.emulateMedia({ media: 'print' });
    // emulateMedia does not fire beforeprint, and main.ts opens the tables in
    // that listener. Without dispatching it the printed tables are absent here
    // and the sweep quietly reports on a shorter document than the one printed.
    await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));

    const samples = await sample(page);
    expect(samples.length, 'elements painting text on paper').toBeGreaterThan(50);
    expect(failures(samples).length, `\n${report(failures(samples))}\n`).toBe(0);
  });
}

/*
 * The sweep passing is only evidence if the sweep can fail. Both pairs below are
 * planted in the live report: #767676 on white is the canonical 4.54:1 pass and
 * #777777 the 4.48:1 miss just under it, so this pins the threshold as well as
 * the plumbing. Deleting the ratio check makes this test fail, which is the
 * property the four sweeps above cannot demonstrate about themselves.
 */
test('the sweep reports a planted violation and spares its twin', async ({ page }) => {
  await load(page);
  await page.evaluate(() => {
    const report = document.querySelector('#report')!;
    for (const [id, colour] of [
      ['plant-bad', '#777777'],
      ['plant-good', '#767676'],
    ]) {
      const p = document.createElement('p');
      p.id = id!;
      p.setAttribute('style', `color: ${colour}; background: #ffffff; font-size: 14px`);
      p.textContent = 'planted';
      report.append(p);
    }
  });

  const samples = await sample(page);
  const bad = samples.find((s) => s.text === 'planted' && s.ink === '#777777');
  const good = samples.find((s) => s.text === 'planted' && s.ink === '#767676');

  expect(bad, 'the planted pair was not even collected').toBeDefined();
  expect(bad!.background, 'the ground was misread').toBe('#ffffff');
  expect(bad!.ratio).toBeCloseTo(4.48, 2);
  expect(good!.ratio).toBeCloseTo(4.54, 2);

  // Scoped to the plants: this test is about whether the sweep can see a
  // violation, not about how many the page currently has.
  const flagged = failures(samples).filter((s) => s.text === 'planted');
  expect(flagged.map((s) => s.ink), 'exactly the failing plant is reported').toEqual(['#777777']);
  expect(report(flagged), 'the failure names the element and both colours').toContain('#777777');
});

test('the exception list is honest', async ({ page }) => {
  await load(page);
  const samples = await sample(page);

  // The chart labels are the pairs most likely to be waved through, so the
  // sweep is required to be measuring them rather than merely not excusing them.
  expect(samples.some((s) => s.svg), 'SVG chart labels are measured, not skipped').toBe(true);

  for (const { selector, why } of EXCEPTIONS) {
    expect(why.length, `${selector} is excluded without a reason`).toBeGreaterThan(40);
    // An excuse matching nothing is an excuse for nothing, and would sit here
    // forever looking like diligence.
    expect(samples.some((s) => s.element.startsWith(selector)), `${selector} matches nothing`).toBe(true);
  }
});
