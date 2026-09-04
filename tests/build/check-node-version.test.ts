/**
 * The Node-version guard, exercised the way the gate uses it: a command, an
 * exit code, a message.
 *
 * Most cases build a throwaway repo root holding just the five files, so drift
 * can be created on purpose — a guard nobody has watched fail is a guess. The
 * last case runs it against the real root, and is what actually fails `npm test`
 * when the five numbers stop agreeing.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SCRIPT = join(process.cwd(), 'scripts', 'check-node-version.mjs');

interface Run {
  status: number;
  output: string;
}

function check(root: string): Run {
  try {
    // Piping stderr rather than inheriting it: the failure cases print the full
    // five-line report, and several of those would bury a real failure.
    const stdout = execFileSync(process.execPath, [SCRIPT, root], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { status: 0, output: stdout };
  } catch (error) {
    const failure = error as { status: number; stdout: string; stderr: string };
    return { status: failure.status, output: failure.stdout + failure.stderr };
  }
}

/**
 * The five declarations, each written at whatever version it is given, plus the
 * lockfile — which is not a sixth declaration but a copy of package.json's, and
 * so follows `engines` unless a case sets `lock` to pull them apart.
 */
function declarations(versions: {
  engines?: string;
  ci?: string;
  pages?: string;
  readme?: string;
  contributing?: string;
  lock?: string;
}): Record<string, string> {
  return {
    'package.json': `{ "engines": { "node": ">=${versions.engines}" } }`,
    'package-lock.json': JSON.stringify({
      lockfileVersion: 3,
      packages: { '': { engines: { node: `>=${versions.lock ?? versions.engines}` } } },
    }),
    '.github/workflows/ci.yml': `      - uses: actions/setup-node@v4\n        with:\n          node-version: ${versions.ci}\n`,
    '.github/workflows/pages.yml': `      - uses: actions/setup-node@v4\n        with:\n          node-version: ${versions.pages}\n`,
    'README.md': `Node ${versions.readme} or newer — the floor comes from the test toolchain.\n`,
    'CONTRIBUTING.md': `Node ${versions.contributing} or newer, as declared in \`engines.node\`.\n`,
  };
}

/** A throwaway repo root, described as `{ path: contents }`. */
function repo(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'check-node-version-'));
  for (const [path, contents] of Object.entries(files)) {
    const full = join(root, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, contents, 'utf8');
  }
  return root;
}

/** All five agreeing on `version`, the state the guard is meant to protect. */
function agreeing(version: string): Record<string, string> {
  return declarations({
    engines: version,
    ci: version,
    pages: version,
    readme: version,
    contributing: version,
  });
}

describe('five declarations that agree', () => {
  it('passes and names the version it found', () => {
    const run = check(repo(agreeing('24.15.0')));

    expect(run.status).toBe(0);
    expect(run.output).toContain('24.15.0 in all 5 declarations');
  });

  it('passes on a version the project does not use, so it compares rather than hardcodes', () => {
    const run = check(repo(agreeing('26.1.3')));

    expect(run.status).toBe(0);
  });

  it('ignores a range about another package that happens to contain a version', () => {
    const files = agreeing('24.15.0');
    // jsdom's own engines, quoted in CONTRIBUTING.md as the reason for the floor.
    files['CONTRIBUTING.md'] += 'jsdom 30 declares `^22.22.2 || ^24.15.0 || >=26.0.0`.\n';

    const run = check(repo(files));

    expect(run.status).toBe(0);
  });
});

describe('one declaration left behind', () => {
  it.each([
    ['package.json', { engines: '24.15.0' }],
    ['.github/workflows/ci.yml', { ci: '24.15.0' }],
    ['.github/workflows/pages.yml', { pages: '24.15.0' }],
    ['README.md', { readme: '24.15.0' }],
    ['CONTRIBUTING.md', { contributing: '24.15.0' }],
  ])('fails when only %s still says the old version', (file, stale) => {
    const run = check(
      repo(
        declarations({
          engines: '26.0.0',
          ci: '26.0.0',
          pages: '26.0.0',
          readme: '26.0.0',
          contributing: '26.0.0',
          ...stale,
        }),
      ),
    );

    expect(run.status).toBe(1);
    expect(run.output).toContain('2 different versions declared');
    expect(run.output).toContain(file);
    expect(run.output).toContain('24.15.0');
  });
});

describe('a declaration that stops declaring is a failure, not a pass', () => {
  it('fails when a workflow pin is loosened to a major line', () => {
    const files = agreeing('24.15.0');
    files['.github/workflows/ci.yml'] = '          node-version: 24\n';

    const run = check(repo(files));

    expect(run.status).toBe(1);
    expect(run.output).toContain('no version found');
    expect(run.output).toContain('(none found)');
  });

  it('fails when a doc sentence is reworded past the pattern', () => {
    const files = agreeing('24.15.0');
    files['README.md'] = 'You will need a recent Node.\n';

    const run = check(repo(files));

    expect(run.status).toBe(1);
    expect(run.output).toContain('no version found');
  });

  it('fails when a file it reads is missing entirely', () => {
    const files = agreeing('24.15.0');
    delete files['CONTRIBUTING.md'];

    const run = check(repo(files));

    expect(run.status).toBe(1);
    expect(run.output).toContain('ENOENT');
  });
});

/**
 * The real `package-lock.json`, with `mutate` applied to a parsed copy.
 *
 * The synthetic lockfile above has one package entry. The real one has 241, of
 * which 158 declare an `engines.node` — the root plus 157 dependencies stating
 * their own floor. That is the whole reason this check reads `packages[""]` as
 * JSON rather than matching a pattern, and a guard proved only against the
 * two-line version proves nothing about it.
 */
function realLockfile(mutate: (lock: LockShape) => void): string {
  const lock = JSON.parse(
    readFileSync(join(process.cwd(), 'package-lock.json'), 'utf8'),
  ) as LockShape;
  mutate(lock);
  return JSON.stringify(lock, null, 2);
}

interface LockShape {
  packages: Record<string, { engines?: { node?: string } }>;
}

describe('the lockfile copy of the floor', () => {
  it('fails when the root entry lags behind package.json, as it really did', () => {
    const files = agreeing('24.15.0');
    // The state committed at 473549c: package.json moved, the lockfile did not.
    files['package-lock.json'] = realLockfile((lock) => {
      lock.packages[''].engines = { node: '>=22.22.2' };
    });

    const run = check(repo(files));

    expect(run.status).toBe(1);
    expect(run.output).toContain('package-lock.json');
    expect(run.output).toContain('>=22.22.2');
    expect(run.output).toContain('npm install');
  });

  it('fails when the root entry has no engines at all, as it also really did', () => {
    const files = agreeing('24.15.0');
    // The state committed at 41e24ed: package.json declared a floor, the
    // lockfile predated it and carried none. Absent is drift, not a pass.
    files['package-lock.json'] = realLockfile((lock) => {
      delete lock.packages[''].engines;
    });

    const run = check(repo(files));

    expect(run.status).toBe(1);
    expect(run.output).toContain('(none)');
  });

  it('ignores every dependency that declares a floor of its own', () => {
    const others = Object.entries(
      (JSON.parse(readFileSync(join(process.cwd(), 'package-lock.json'), 'utf8')) as LockShape)
        .packages,
    ).filter(([path, entry]) => path !== '' && entry.engines?.node);
    // If this ever shrinks to nothing the case below stops proving anything.
    expect(others.length).toBeGreaterThan(50);

    const files = agreeing('24.15.0');
    files['package-lock.json'] = realLockfile((lock) => {
      lock.packages[''].engines = { node: '>=24.15.0' };
      for (const [path] of others) lock.packages[path].engines = { node: '>=99.0.0' };
    });

    const run = check(repo(files));

    expect(run.status).toBe(0);
  });

  it('compares the range as written, not the number inside it', () => {
    const files = agreeing('24.15.0');
    // The same floor, spelled differently. npm copies `engines` verbatim, so
    // any difference at all means the lockfile was not regenerated.
    files['package-lock.json'] = JSON.stringify({
      lockfileVersion: 3,
      packages: { '': { engines: { node: '>= 24.15.0' } } },
    });

    const run = check(repo(files));

    expect(run.status).toBe(1);
    expect(run.output).toContain('>= 24.15.0');
  });

  it('fails when the lockfile is missing entirely', () => {
    const files = agreeing('24.15.0');
    delete files['package-lock.json'];

    const run = check(repo(files));

    expect(run.status).toBe(1);
    expect(run.output).toContain('ENOENT');
  });

  it('fails when the lockfile has no root entry to mirror', () => {
    const files = agreeing('24.15.0');
    files['package-lock.json'] = JSON.stringify({ lockfileVersion: 1, dependencies: {} });

    const run = check(repo(files));

    expect(run.status).toBe(1);
    expect(run.output).toContain('packages[""]');
  });
});

describe('the repository itself', () => {
  it('declares one Node version in all five places', () => {
    const run = check(process.cwd());

    expect(run.status).toBe(0);
  });

  it('carries that same range in the lockfile npm generated', () => {
    const run = check(process.cwd());

    expect(run.status).toBe(0);
    expect(run.output).toContain('package-lock.json');
  });
});
