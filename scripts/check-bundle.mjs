/**
 * Fails the build if the bundle contains an absolute URL nobody vouched for.
 *
 * The privacy promise is that the built page talks to nothing. The end-to-end
 * test watches a running page make no request; this watches the shipped bytes,
 * which catches what a browser run cannot: a call behind a long timer, an
 * unload beacon, a code path no test walks. A dependency bump that quietly adds
 * a CDN fetch has to get a URL into the bundle to do it, and this is where that
 * shows up.
 *
 * The rule is an allowlist rather than a pattern, so the answer to "is this one
 * fine?" is written down once by a person instead of guessed at every build.
 * Scope: `http://` and `https://` literals. Protocol-relative `//host/path` is
 * not detected — it is indistinguishable from ordinary text at this level.
 *
 * Usage: `node scripts/check-bundle.mjs [dir]` (default `dist`). Exit 1 on a
 * URL that is not allowed, or on a directory with nothing in it to scan.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Absolute URLs known to be inert, each with the reason it is harmless.
 *
 * Matching is exact. A neighbouring path on the same host is a new entry and a
 * new decision — which is the point.
 */
const ALLOWED = new Map([
  ['http://www.w3.org/2000/svg', 'XML namespace passed to createElementNS; never fetched'],
  ['https://github.com/mholt/PapaParse', 'papaparse licence banner, in a comment'],
  ['https://github.com/MikeMcl/decimal.js', 'decimal.js licence banner, in a comment'],
  // The three from src/ui/links.ts. These are anchor destinations, so they
  // differ in kind from the entries above: the page never requests them, and
  // nothing is reached until a reader clicks. Adding a fourth means a fourth
  // outbound link on the page — which is a decision, not a formality.
  [
    'https://github.com/Schengatto/trade-republic-analyzer/blob/main/PRIVACY.md',
    'href on the landing screen: the privacy statement',
  ],
  ['https://github.com/Schengatto/trade-republic-analyzer', 'href in the footer: the source code'],
  ['https://enricoschintu.com', "href in the footer: the author's site"],
]);

/** Every absolute http(s) URL in `source`, in order, duplicates collapsed. */
function absoluteUrls(source) {
  // Stops at whitespace, quote, backslash and the bracketing characters that
  // end a URL in minified JS, CSS `url()` and HTML attributes alike.
  const matches = source.match(/https?:\/\/[^\s"'`\\<>()[\]{},;]+/g) ?? [];
  return [...new Set(matches)];
}

/** The URLs in `source` that no entry in `ALLOWED` covers. */
function foreignUrls(source) {
  return absoluteUrls(source).filter((url) => !ALLOWED.has(url));
}

/** Every file under `dir`, recursively, as absolute paths. */
function filesUnder(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(full) : [full];
  });
}

/**
 * Scan `dir`, returning one `{ file, url }` per offending occurrence.
 *
 * Binary assets are read as UTF-8 too: a URL in a font or an image is still a
 * URL, and mojibake elsewhere in the file cannot produce a false match.
 */
function scan(dir) {
  return filesUnder(dir).flatMap((file) =>
    foreignUrls(readFileSync(file, 'utf8')).map((url) => ({
      file: relative(process.cwd(), file).replaceAll('\\', '/'),
      url,
    })),
  );
}

function main() {
  const dir = process.argv[2] ?? 'dist';

  let count;
  try {
    count = filesUnder(dir).length;
  } catch {
    console.error(`check-bundle: cannot read ${dir}/ — run the build first.`);
    process.exit(1);
  }
  // An empty directory would otherwise report a clean bundle.
  if (count === 0) {
    console.error(`check-bundle: ${dir}/ is empty — run the build first.`);
    process.exit(1);
  }

  const findings = scan(dir);
  if (findings.length > 0) {
    console.error(`check-bundle: ${findings.length} absolute URL(s) in the bundle:\n`);
    for (const { file, url } of findings) console.error(`  ${file}\n    ${url}`);
    console.error(
      '\nThe app must not reach the network. If this URL is inert — a namespace,' +
        '\na licence banner — add it to ALLOWED in scripts/check-bundle.mjs with' +
        '\nthe reason. Otherwise remove whatever introduced it.',
    );
    process.exit(1);
  }

  console.log(`check-bundle: ${count} file(s) scanned, no unexpected absolute URL.`);
}

main();
