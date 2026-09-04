/**
 * The favicon, held to the two things about it that are easy to break silently.
 *
 * The first is the privacy promise: an icon is a request like any other, and
 * the one shape that cannot become one is a data: URI. Swapping in a
 * `favicon.ico` would leave every visible thing about the page unchanged and
 * put a line back in the Network tab, which is exactly the claim the landing
 * screen makes.
 *
 * The second is that the drawing survives. A URI is one unescaped bracket away
 * from decoding into nothing, and a browser renders a broken icon as a blank
 * square rather than an error — so the assertions read the geometry out of the
 * decoded SVG instead of trusting that the attribute is non-empty.
 *
 * The colours are checked against app.css because the comment in index.html
 * claims they came from there. A data: URI is its own document and cannot read
 * a custom property, so the hexes are copies, and a copy nobody compares is a
 * copy that drifts.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const html = readFileSync(join(process.cwd(), 'index.html'), 'utf8');
const css = readFileSync(join(process.cwd(), 'src', 'ui', 'app.css'), 'utf8');

/** Every `href` on a `<link rel="icon">`, however the tag is wrapped. */
function iconHrefs(source: string): string[] {
  const tags = source.match(/<link\b[^>]*\brel=["']icon["'][^>]*>/gs) ?? [];
  return tags.map((tag) => tag.match(/\bhref="([^"]*)"/s)?.[1] ?? '');
}

/** The value of a custom property, read from the block `selector` opens. */
function token(selector: string, name: string): string {
  const block = css.split(selector)[1] ?? '';
  return block.slice(0, block.indexOf('}')).match(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`))?.[1] ?? '';
}

const PREFIX = 'data:image/svg+xml,';
const hrefs = iconHrefs(html);
const svg = decodeURIComponent((hrefs[0] ?? '').slice(PREFIX.length));

describe('the favicon', () => {
  it('is the only icon the page declares', () => {
    expect(hrefs).toHaveLength(1);
  });

  it('is inline, so it is never a network request', () => {
    expect(hrefs[0]).toMatch(/^data:image\/svg\+xml,/);
  });

  it('decodes to a single well-formed svg', () => {
    // An unescaped bracket would end the attribute early and truncate this.
    expect(svg).toMatch(/^<svg\b[^>]*\bviewBox='0 0 24 24'[^>]*>/);
    expect(svg.trimEnd()).toMatch(/<\/svg>$/);
    expect(hrefs[0]).not.toMatch(/[<>]/);
  });

  it('draws a magnifier: one lens and one handle leaving its edge', () => {
    const lens = svg.match(/<circle cx='([\d.]+)' cy='([\d.]+)' r='([\d.]+)'/);
    const handle = svg.match(/<path d='M([\d.]+) ([\d.]+) L([\d.]+) ([\d.]+)'/);
    expect(lens).not.toBeNull();
    expect(handle).not.toBeNull();

    const [cx, cy, r] = lens!.slice(1).map(Number);
    const [x1, y1, x2, y2] = handle!.slice(1).map(Number);

    // The handle starts on the rim, not inside the glass and not floating off
    // it: a stroke drawn across the lens is a cancel sign, not a magnifier.
    const start = Math.hypot(x1 - cx, y1 - cy);
    expect(start).toBeGreaterThan(r);
    expect(start).toBeLessThan(r + 1.2);

    // And it runs outward, away from the centre.
    expect(Math.hypot(x2 - cx, y2 - cy)).toBeGreaterThan(start);
  });

  it('carries the palette blue for each scheme, not one blue for both', () => {
    const light = token(':root', '--accent-strong');
    const dark = token('[data-theme="dark"]', '--series-1');
    expect(light).not.toBe('');
    expect(dark).not.toBe('');
    expect(light).not.toBe(dark);

    // Outside the query is the light stroke; inside it is the dark one.
    const [outside, inside] = svg.split('@media(prefers-color-scheme:dark)');
    expect(outside).toContain(`stroke:${light}`);
    expect(inside).toContain(`stroke:${dark}`);
  });
});
