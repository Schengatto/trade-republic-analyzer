/**
 * The bundle scan, exercised through the interface the build uses: a command,
 * an exit code, a message. Testing it that way is what makes the assertions
 * about "the build fails" true rather than merely likely.
 *
 * Every case here builds its own throwaway directory. The real `dist/` is
 * checked by the build itself, which runs after these tests and would not have
 * produced a bundle yet.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SCRIPT = join(process.cwd(), 'scripts', 'check-bundle.mjs');

interface Run {
  status: number;
  output: string;
}

function check(dir: string): Run {
  try {
    // Piping stderr rather than inheriting it: the failure cases print a full
    // report, and eight of those in the test log would bury a real one.
    const stdout = execFileSync(process.execPath, [SCRIPT, dir], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { status: 0, output: stdout };
  } catch (error) {
    const failure = error as { status: number; stdout: string; stderr: string };
    return { status: failure.status, output: failure.stdout + failure.stderr };
  }
}

/** A throwaway `dist`, described as `{ filename: contents }`. */
function bundle(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'check-bundle-'));
  for (const [name, contents] of Object.entries(files)) {
    writeFileSync(join(dir, name), contents, 'utf8');
  }
  return dir;
}

describe('a bundle that keeps the promise', () => {
  it('passes on relative paths only', () => {
    const run = check(
      bundle({
        'index.html': '<script src="./assets/index-abc123.js"></script>',
        'index.js': 'const u=new URL("./data.csv",import.meta.url);',
      }),
    );

    expect(run.status).toBe(0);
    expect(run.output).toContain('no unexpected absolute URL');
  });

  it('passes on the SVG namespace, which is an identifier and not an address', () => {
    const run = check(
      bundle({ 'index.js': 'document.createElementNS("http://www.w3.org/2000/svg","svg")' }),
    );

    expect(run.status).toBe(0);
  });

  it('passes on the dependency licence banners already in the bundle', () => {
    const run = check(
      bundle({
        'index.js':
          '/*! decimal.js v10 https://github.com/MikeMcl/decimal.js */\n' +
          '/* @license Papa Parse https://github.com/mholt/PapaParse */',
      }),
    );

    expect(run.status).toBe(0);
  });
});

describe('a bundle that breaks it', () => {
  it('fails on a CDN script and names the file and the URL', () => {
    const run = check(
      bundle({ 'index.html': '<script src="https://cdn.jsdelivr.net/npm/x@1/y.js"></script>' }),
    );

    expect(run.status).toBe(1);
    expect(run.output).toContain('https://cdn.jsdelivr.net/npm/x@1/y.js');
    expect(run.output).toContain('index.html');
  });

  it('fails on a stylesheet pulling a remote font', () => {
    const run = check(
      bundle({ 'index.css': '@import url(https://fonts.googleapis.com/css2?family=Inter);' }),
    );

    expect(run.status).toBe(1);
    expect(run.output).toContain('https://fonts.googleapis.com/css2?family=Inter');
  });

  it('fails on a different path of an allowlisted host', () => {
    // The allowlist is exact on purpose: `github.com` being vouched for once
    // must not vouch for an arbitrary endpoint on it.
    const run = check(bundle({ 'index.js': 'fetch("https://github.com/collect")' }));

    expect(run.status).toBe(1);
    expect(run.output).toContain('https://github.com/collect');
  });

  it('reports every offending file, not just the first', () => {
    const run = check(
      bundle({
        'a.js': 'fetch("https://one.example.com/a")',
        'b.js': 'fetch("https://two.example.com/b")',
      }),
    );

    expect(run.status).toBe(1);
    expect(run.output).toContain('https://one.example.com/a');
    expect(run.output).toContain('https://two.example.com/b');
  });

  it('looks inside nested asset directories', () => {
    const dir = bundle({});
    mkdirSync(join(dir, 'assets'));
    writeFileSync(join(dir, 'assets', 'index.js'), 'fetch("https://deep.example.com/x")', 'utf8');

    const run = check(dir);

    expect(run.status).toBe(1);
    expect(run.output).toContain('https://deep.example.com/x');
  });
});

describe('nothing to scan is a failure, not a pass', () => {
  it('fails on an empty directory', () => {
    const run = check(bundle({}));

    expect(run.status).toBe(1);
    expect(run.output).toContain('is empty');
  });

  it('fails when the directory does not exist', () => {
    const run = check(join(tmpdir(), 'check-bundle-absent-directory'));

    expect(run.status).toBe(1);
    expect(run.output).toContain('cannot read');
  });
});
