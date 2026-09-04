/**
 * Guards over the whole of `src/ui/`.
 *
 * These are not style rules. Each one is a promise the project makes to the
 * reader — no calculation outside the audited core, no network, no markup built
 * from file content — expressed as something a build can fail on rather than
 * something a reviewer has to notice.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const UI_DIR = join(process.cwd(), 'src', 'ui');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return entry.name.endsWith('.ts') ? [full] : [];
  });
}

const FILES = sourceFiles(UI_DIR).map((path) => ({
  path: relative(process.cwd(), path).replaceAll('\\', '/'),
  source: readFileSync(path, 'utf8'),
}));

/** Strip comments, so a rule explained in prose is not read as a violation. */
function code(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

it('finds the ui sources it is supposed to be guarding', () => {
  expect(FILES.length).toBeGreaterThan(10);
});

describe('no calculation logic in src/ui', () => {
  // Every figure in the report is computed in src/core and covered by its
  // tests. A second, untested arithmetic path in a view is exactly how two
  // numbers on one page start disagreeing.
  // The decimal.js method names specifically. Plain `Math.abs` on a plotted
  // coordinate is layout, not a report figure, and stays allowed.
  const ARITHMETIC = /\.(plus|minus|times|div|dividedBy|negated|mod)\s*\(/;

  it.each(FILES)('$path does no Decimal arithmetic', ({ source }) => {
    expect(code(source)).not.toMatch(ARITHMETIC);
  });

  it.each(FILES)('$path never constructs a Decimal', ({ source }) => {
    expect(code(source)).not.toMatch(/new Decimal\s*\(/);
  });
});

describe('no network at runtime', () => {
  const NETWORK = /\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|importScripts)\b/;

  it.each(FILES)('$path issues no request', ({ source }) => {
    expect(code(source)).not.toMatch(NETWORK);
  });
});

describe('nothing from the file is parsed as markup', () => {
  // A row of this export can carry an account holder's name; `el()` builds
  // every node with textContent for that reason.
  const MARKUP = /\b(innerHTML|outerHTML|insertAdjacentHTML|document\.write)\b/;

  it.each(FILES)('$path builds no HTML from strings', ({ source }) => {
    expect(code(source)).not.toMatch(MARKUP);
  });
});

describe('storage is reached through preferences.ts only', () => {
  it.each(FILES.filter((file) => !file.path.endsWith('preferences.ts')))(
    '$path does not touch storage directly',
    ({ source }) => {
      expect(code(source)).not.toMatch(/\b(localStorage|sessionStorage|indexedDB|document\.cookie)\b/);
    },
  );
});

describe('no colour literals outside the palette', () => {
  // Light and dark are two selected palettes, swapped by custom property. A
  // hex value in a chart would survive the theme switch and become unreadable.
  it.each(FILES.filter((file) => !file.path.endsWith('palette.ts')))(
    '$path names no hex colour',
    ({ source }) => {
      expect(code(source)).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    },
  );
});
