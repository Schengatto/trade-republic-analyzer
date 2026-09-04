/**
 * Fails when the Node version is not the same number in all five places.
 *
 * The floor is one decision, written down five times: `engines.node`, the
 * `setup-node` pin in each workflow, and the "Node <version> or newer" sentence
 * in each of the two docs. Nothing links them, so editing one and forgetting the
 * rest is a silent, plausible mistake — and the specific way it goes wrong is
 * that the workflows stop exercising the version the docs promise, which is the
 * bug the pin exists to prevent. This turns that into a failed run.
 *
 * A file that matches nothing is a failure, not a pass. That covers the two
 * realistic edits: rewording a sentence past the pattern, and loosening a
 * workflow pin to a major line (`node-version: 24`), which is a legitimate
 * choice but makes "the floor is the version exercised" untrue until the docs
 * are changed to match.
 *
 * `MEMORY.md` states the number too and is deliberately not listed: it is a
 * narrative log of how the project got here, not a declaration anything reads.
 *
 * Usage: `node scripts/check-node-version.mjs [repo-root]` (default `.`).
 * Exit 1 on drift, on a file that declares nothing, or on a file it cannot read.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Where the floor is written, and the shape it takes in each file.
 *
 * Every pattern captures a full `x.y.z` in group 1 and is applied globally: a
 * file is allowed to say it more than once, as long as it agrees with itself.
 * The doc pattern requires the literal word `Node` before the number so that
 * jsdom's `^22.22.2 || ^24.15.0 || >=26.0.0` — quoted in CONTRIBUTING.md, and
 * about a different package — is not mistaken for a declaration.
 */
const DECLARATIONS = [
  {
    file: 'package.json',
    where: 'engines.node',
    pattern: /"node":\s*">=\s*(\d+\.\d+\.\d+)"/g,
  },
  {
    file: '.github/workflows/ci.yml',
    where: 'the setup-node pin',
    pattern: /node-version:\s*['"]?v?(\d+\.\d+\.\d+)/g,
  },
  {
    file: '.github/workflows/pages.yml',
    where: 'the setup-node pin',
    pattern: /node-version:\s*['"]?v?(\d+\.\d+\.\d+)/g,
  },
  {
    file: 'README.md',
    where: 'the "Node <version> or newer" sentence',
    pattern: /Node(?:\.js)?\s+v?(\d+\.\d+\.\d+)/g,
  },
  {
    file: 'CONTRIBUTING.md',
    where: 'the "Node <version> or newer" sentence',
    pattern: /Node(?:\.js)?\s+v?(\d+\.\d+\.\d+)/g,
  },
];

const LOCKFILE = 'package-lock.json';

/**
 * `engines.node` as package.json writes it, and the copy npm keeps in the
 * lockfile's root entry.
 *
 * This is not a sixth declaration, which is why it is not in DECLARATIONS. The
 * five above are independent statements that have to agree with each other, and
 * drift between them is fixed by editing them. `packages[""]` is a projection of
 * package.json that can never legitimately differ, and is fixed by running
 * `npm install` — different relation, different repair, so a separate check
 * with its own message rather than a sixth row in the same report.
 *
 * It is worth checking because nothing else does: `npm ci` compares the root
 * entry's name, version and dependencies against package.json and ignores its
 * `engines`, so a lockfile left behind installs cleanly and says nothing. That
 * is how `>=22.22.2` survived in this repo after the floor moved to 24.15.0.
 *
 * Read as JSON and scoped to `packages[""]` on purpose: 158 of the 241 entries
 * in this lockfile declare an `engines.node` — 157 of them dependencies stating
 * their own floor, across 51 distinct ranges — so the `">=x.y.z"` pattern the
 * declarations use would match every dependency instead of the project.
 *
 * Compared as written rather than by version, because npm copies the string
 * verbatim — any difference at all means the lockfile was not regenerated.
 */
function mirroredRanges(root) {
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const lockfile = JSON.parse(readFileSync(join(root, LOCKFILE), 'utf8'));

  const rootEntry = lockfile.packages?.[''];
  if (rootEntry === undefined) {
    throw new Error(
      `${LOCKFILE}: no packages[""] entry to mirror — expected a lockfileVersion 2 or 3 file`,
    );
  }

  return { declared: manifest.engines?.node, mirrored: rootEntry.engines?.node };
}

/** Every version `declaration.pattern` finds in its file, duplicates kept. */
function versionsIn(root, { file, pattern }) {
  const source = readFileSync(join(root, file), 'utf8');
  return [...source.matchAll(pattern)].map(([, version]) => version);
}

/**
 * Read all five, as `{ file, where, versions }`.
 *
 * A file that cannot be read throws: the guard is worthless if a rename turns
 * it into a no-op.
 */
function readDeclarations(root) {
  return DECLARATIONS.map((declaration) => ({
    ...declaration,
    versions: versionsIn(root, declaration),
  }));
}

/** The distinct versions across every declaration, in first-seen order. */
function distinctVersions(declarations) {
  return [...new Set(declarations.flatMap(({ versions }) => versions))];
}

function report(declarations) {
  for (const { file, where, versions } of declarations) {
    const found = versions.length > 0 ? [...new Set(versions)].join(', ') : '(none found)';
    console.error(`  ${file} — ${where}: ${found}`);
  }
}

function main() {
  const root = process.argv[2] ?? '.';

  let declarations;
  try {
    declarations = readDeclarations(root);
  } catch (error) {
    console.error(`check-node-version: ${error.message}`);
    process.exit(1);
  }

  const silent = declarations.filter(({ versions }) => versions.length === 0);
  if (silent.length > 0) {
    console.error('check-node-version: no version found in:\n');
    report(declarations);
    console.error(
      '\nEach of the five must state an exact x.y.z. If a workflow pin was' +
        '\nloosened to a major line on purpose, say so in CONTRIBUTING.md instead' +
        '\nof claiming the floor is the version exercised, and drop that entry' +
        '\nfrom DECLARATIONS in scripts/check-node-version.mjs.',
    );
    process.exit(1);
  }

  const versions = distinctVersions(declarations);
  if (versions.length > 1) {
    console.error(`check-node-version: ${versions.length} different versions declared:\n`);
    report(declarations);
    console.error(
      '\nThe Node floor is one decision written down five times. Change one and' +
        '\nchange all five: package.json, both workflows, README.md, CONTRIBUTING.md.',
    );
    process.exit(1);
  }

  let ranges;
  try {
    ranges = mirroredRanges(root);
  } catch (error) {
    console.error(`check-node-version: ${error.message}`);
    process.exit(1);
  }

  if (ranges.mirrored !== ranges.declared) {
    console.error(`check-node-version: ${LOCKFILE} does not carry the declared range:\n`);
    console.error(`  package.json — engines.node: ${ranges.declared ?? '(none)'}`);
    console.error(`  ${LOCKFILE} — packages[""].engines.node: ${ranges.mirrored ?? '(none)'}`);
    console.error(
      "\nThat entry is npm's copy of engines, not a declaration to edit by hand," +
        '\nand npm ci installs happily without it matching. Run `npm install` and' +
        '\ncommit the lockfile alongside the change to package.json.',
    );
    process.exit(1);
  }

  console.log(
    `check-node-version: ${versions[0]} in all ${declarations.length} declarations, ` +
      `and ${LOCKFILE} carries ${ranges.declared}.`,
  );
}

main();
