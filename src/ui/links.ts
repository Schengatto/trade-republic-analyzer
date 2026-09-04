/**
 * The only outbound URLs in the application.
 *
 * They are links, not requests: nothing here is fetched, and none of them is
 * touched until a reader clicks. The page's promise is about what it sends on
 * its own, and a link the reader chooses to follow does not weaken it. Still,
 * every one of these strings has to be added by hand to `ALLOWED` in
 * `scripts/check-bundle.mjs`, which is what stops a URL from reaching the
 * bundle unnoticed — so this file is deliberately the only place they live.
 *
 * `rel="noopener noreferrer"` on every anchor: `noopener` because a new tab
 * must not get a handle on this one, `noreferrer` because the referrer would
 * tell the destination which page the reader came from.
 */

/*
 * Written out one by one rather than composed from a base: `ALLOWED` matches
 * whole URLs, and whether a bundler folds a template literal back into one
 * string is its own decision to change. A literal per entry is what keeps the
 * guard reading exactly what ships.
 */
export const LINKS = {
  /** The privacy statement, served by GitHub because Pages publishes no .md. */
  privacy: 'https://github.com/Schengatto/trade-republic-analyzer/blob/main/PRIVACY.md',
  sourceCode: 'https://github.com/Schengatto/trade-republic-analyzer',
  author: 'https://enricoschintu.com',
} as const;
