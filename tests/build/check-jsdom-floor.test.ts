/**
 * The jsdom-floor guard, exercised the way the gate uses it: a command, an exit
 * code, a message.
 *
 * CONTRIBUTING.md justifies the Node floor by quoting jsdom's own `engines`.
 * That quote is hand-copied, and a jsdom bump rewrites the range without
 * touching the sentence — the same silent drift `check-node-version.mjs`
 * exists to prevent, one level up: that guard proves the five copies of the
 * floor agree with each other, not that the number they agree on is still the
 * right one.
 *
 * Most cases build a throwaway repo root with a synthetic `node_modules/jsdom`,
 * so a bump can be staged on purpose — a guard nobody has watched fail is a
 * guess. The last case runs against the real root and the really installed
 * jsdom, and is what fails `npm test` when the doc goes stale.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SCRIPT = join(process.cwd(), 'scripts', 'check-jsdom-floor.mjs');

interface Run {
  status: number;
  output: string;
}

function check(root: string): Run {
  try {
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
 * The state of the world the guard reads, split into what is true and what the
 * doc says about it — which is the whole point: they drift apart.
 */
interface World {
  /** `engines.node` in package.json, as `>=floor`. */
  floor: string;
  /** The installed jsdom, and the range it really declares. */
  jsdomVersion: string;
  engines: string | null;
  /** What CONTRIBUTING.md claims about that jsdom. */
  docMajor: string;
  docRange: string;
}

/** Everything agreeing, at the values the repository actually holds. */
const TRUE_TODAY: World = {
  floor: '24.15.0',
  jsdomVersion: '30.0.1',
  engines: '^22.22.2 || ^24.15.0 || >=26.0.0',
  docMajor: '30',
  docRange: '^22.22.2 || ^24.15.0 || >=26.0.0',
};

/** The three files the guard reads, described as `{ path: contents }`. */
function world(overrides: Partial<World> = {}): Record<string, string> {
  const { floor, jsdomVersion, engines, docMajor, docRange } = {
    ...TRUE_TODAY,
    ...overrides,
  };

  const jsdom =
    engines === null
      ? { version: jsdomVersion }
      : { version: jsdomVersion, engines: { node: engines } };

  return {
    'package.json': `{ "engines": { "node": ">=${floor}" } }`,
    'node_modules/jsdom/package.json': JSON.stringify(jsdom),
    'CONTRIBUTING.md':
      `Node ${floor} or newer, as declared in \`engines.node\`. The built page needs\n` +
      `no Node at all; the floor is jsdom ${docMajor}, whose own \`engines\` are\n` +
      `\`${docRange}\`. Below it, undici reaches for \`markAsUncloneable\`.\n`,
  };
}

/** A throwaway repo root, described as `{ path: contents }`. */
function repo(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'check-jsdom-floor-'));
  for (const [path, contents] of Object.entries(files)) {
    const full = join(root, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, contents, 'utf8');
  }
  return root;
}

describe('a doc that still describes the installed jsdom', () => {
  it('passes and names what it compared', () => {
    const run = check(repo(world()));

    expect(run.status).toBe(0);
    expect(run.output).toContain('^22.22.2 || ^24.15.0 || >=26.0.0');
    expect(run.output).toContain('24.15.0');
  });

  it('passes on a jsdom and a floor the project does not use, so it compares rather than hardcodes', () => {
    const run = check(
      repo(
        world({
          floor: '25.0.0',
          jsdomVersion: '31.2.0',
          engines: '>=25.0.0',
          docMajor: '31',
          docRange: '>=25.0.0',
        }),
      ),
    );

    expect(run.status).toBe(0);
  });
});

describe('a jsdom bump that leaves the sentence behind', () => {
  it('fails when the quoted range is no longer the declared one', () => {
    // A range the floor still satisfies: only the quote has gone stale.
    const run = check(repo(world({ engines: '^24.15.0 || >=26.0.0' })));

    expect(run.status).toBe(1);
    expect(run.output).toContain('does not quote');
    expect(run.output).toContain('^24.15.0 || >=26.0.0');
  });

  it('fails when the named major is no longer the installed one', () => {
    const run = check(repo(world({ jsdomVersion: '31.0.0' })));

    expect(run.status).toBe(1);
    expect(run.output).toContain('jsdom 30');
    expect(run.output).toContain('31.0.0');
  });

  it('fails when the floor no longer satisfies the range', () => {
    const raised = '^24.16.0 || >=26.0.0';
    const run = check(repo(world({ engines: raised, docRange: raised })));

    expect(run.status).toBe(1);
    expect(run.output).toContain('does not satisfy');
    expect(run.output).toContain('24.15.0');
  });
});

describe('a guard that cannot read is a failure, not a pass', () => {
  it('fails when jsdom is not installed', () => {
    const files = world();
    delete files['node_modules/jsdom/package.json'];

    const run = check(repo(files));

    expect(run.status).toBe(1);
    expect(run.output).toContain('ENOENT');
  });

  it('fails when jsdom stops declaring engines', () => {
    const run = check(repo(world({ engines: null })));

    expect(run.status).toBe(1);
    expect(run.output).toContain('declares no engines.node');
  });

  it('fails when package.json stops declaring a floor', () => {
    const files = world();
    files['package.json'] = '{ "engines": { "node": "*" } }';

    const run = check(repo(files));

    expect(run.status).toBe(1);
    expect(run.output).toContain('no floor');
  });
});

describe('the repository itself', () => {
  it('explains its Node floor with the jsdom that is actually installed', () => {
    const run = check(process.cwd());

    expect(run.status).toBe(0);
  });
});
