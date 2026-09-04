/**
 * Fails when CONTRIBUTING.md's account of the Node floor stops matching the
 * jsdom that is actually installed.
 *
 * The floor is not a taste: it is jsdom's floor, because below it undici — which
 * jsdom pulls in — reaches for `worker_threads.markAsUncloneable` at load and
 * every jsdom-backed test throws while the run still reports them as passed.
 * CONTRIBUTING.md says so by hand-copying jsdom's `engines`, and a jsdom bump
 * rewrites that range without touching the sentence.
 *
 * `scripts/check-node-version.mjs` cannot catch this. It proves the five copies
 * of the floor agree with each other; it has no opinion on whether the number
 * they agree on is still the right one. So when jsdom raises its floor, every
 * existing gate stays green, the doc quietly lies, and CI installs a Node the
 * test toolchain no longer supports — the exact failure this project already
 * shipped once.
 *
 * Three claims, checked against `node_modules/jsdom`, all reported at once so a
 * bump is one edit rather than three runs:
 *
 *   1. the major CONTRIBUTING.md names is the major installed,
 *   2. it quotes the declared range verbatim,
 *   3. `engines.node` in package.json actually satisfies that range.
 *
 * (3) is the one that matters — (1) and (2) keep the sentence honest, (3) keeps
 * the floor correct — and it is the only one that would fire if someone lowered
 * the floor rather than jsdom raising its own.
 *
 * `MEMORY.md` quotes the range too and is deliberately not read: it is a
 * narrative log of how the project got here, true as of its writing, not a
 * declaration anything depends on.
 *
 * Usage: `node scripts/check-jsdom-floor.mjs [repo-root]` (default `.`).
 * Exit 1 on drift, on a floor below jsdom's, or on anything it cannot read.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { satisfies } from 'semver';

const DOC = 'CONTRIBUTING.md';

function readJson(root, ...path) {
  return JSON.parse(readFileSync(join(root, ...path), 'utf8'));
}

/**
 * What is true: the installed jsdom's major and the Node range it declares.
 *
 * A jsdom that declares nothing is a failure rather than a pass. There would be
 * nothing left to compare against, and a guard that quietly becomes a no-op is
 * worse than no guard at all.
 */
function installedJsdom(root) {
  const { version, engines } = readJson(root, 'node_modules', 'jsdom', 'package.json');
  if (!engines?.node) {
    throw new Error(`jsdom ${version} declares no engines.node — nothing to check the floor against`);
  }
  return { version, major: version.split('.')[0], range: engines.node };
}

/** The floor this project promises, from the one place that is machine-read. */
function declaredFloor(root) {
  const { engines } = readJson(root, 'package.json');
  const floor = /^>=\s*(\d+\.\d+\.\d+)$/.exec(engines?.node ?? '')?.[1];
  if (!floor) {
    throw new Error(`package.json: no floor in engines.node (${engines?.node ?? 'absent'})`);
  }
  return floor;
}

/** Every way the doc and the installed jsdom can disagree, gathered. */
function drift(doc, jsdom, floor) {
  const problems = [];

  const named = /jsdom (\d+)/.exec(doc)?.[1];
  if (named !== jsdom.major) {
    problems.push(
      `${DOC} says jsdom ${named ?? '(no version named)'}, but jsdom ${jsdom.version} is installed.`,
    );
  }

  // The whole code span, backticks included. Bare containment would pass a
  // narrowed range against a stale quote — `^24.15.0 || >=26.0.0` is a
  // substring of `^22.22.2 || ^24.15.0 || >=26.0.0`, so dropping the oldest
  // line from jsdom's engines would go unnoticed.
  if (!doc.includes(`\`${jsdom.range}\``)) {
    problems.push(
      `${DOC} does not quote jsdom's engines.\n` +
        `    jsdom ${jsdom.version} declares: ${jsdom.range}\n` +
        `    ${DOC} has no \`...\` span holding exactly that.`,
    );
  }

  if (!satisfies(floor, jsdom.range)) {
    problems.push(
      `the Node floor ${floor} does not satisfy ${jsdom.range}.\n` +
        `    jsdom ${jsdom.version} will not run on the version this project promises.`,
    );
  }

  return problems;
}

function main() {
  const root = process.argv[2] ?? '.';

  let jsdom;
  let floor;
  let doc;
  try {
    jsdom = installedJsdom(root);
    floor = declaredFloor(root);
    doc = readFileSync(join(root, DOC), 'utf8');
  } catch (error) {
    console.error(`check-jsdom-floor: ${error.message}`);
    process.exit(1);
  }

  const problems = drift(doc, jsdom, floor);
  if (problems.length > 0) {
    console.error('check-jsdom-floor: the Node floor and the installed jsdom disagree.\n');
    for (const problem of problems) console.error(`  ${problem}`);
    console.error(
      `\nThe floor exists because of jsdom. Re-read its engines, fix the sentence` +
        `\nunder "Getting started" in ${DOC}, and if the floor itself moved, move it` +
        `\nin all five places — check-node-version.mjs lists them.`,
    );
    process.exit(1);
  }

  console.log(
    `check-jsdom-floor: jsdom ${jsdom.version} requires ${jsdom.range}; ` +
      `the floor ${floor} satisfies it, and ${DOC} says so.`,
  );
}

main();
