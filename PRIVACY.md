# Privacy

Short version: **this tool has no server**, so there is nothing for anyone —
including its author — to collect.

## What is processed, and where

Your Trade Republic export is read by JavaScript running in your own browser
tab. It is parsed there, analysed there, and drawn there. The file is never
uploaded, and no derived figure is uploaded either.

There is no backend. The published site is a folder of static files: one HTML
document, one JavaScript bundle, two stylesheets. Nothing in it can receive
data.

## Why it is built this way

This is a design constraint, not a preference. A bank export identifies its
account holder and everyone they paid. An operator that received such a file
would become a data controller under the GDPR, with the retention, breach
notification and subject-access duties that follow. Keeping the file in the
browser removes the question rather than answering it.

## How to verify the claim yourself

Do not take it on trust — it is checkable in under a minute:

1. Open the page, then open your browser's developer tools on the **Network**
   tab.
2. Load your CSV and read the whole report.
3. The request list stays empty. Nothing is sent, because there is nowhere to
   send it.

Stronger still: go offline (aeroplane mode, or pull the cable) after the page
has loaded, then reload and use it. It works unchanged. Every asset is served
from the same origin — there is no CDN, no remote font, no analytics script,
no error reporter.

The same check runs on every push, so the claim cannot quietly stop being true
between releases. A build whose bundle contains an absolute `http(s)://` URL is
rejected, and a browser is then driven through the whole report and fails the
build if it requested anything beyond the page's own three files. Neither is
proof for all time — a call on a very long timer would outlast the test — but
together they mean a regression has to survive a person adding a URL to an
allowlist on purpose.

## What is stored on your device

`localStorage` holds three preferences and nothing else:

- `tra.language` — `it` or `en`
- `tra.theme` — `light` or `dark`
- `tra.rail` — whether the section rail is open or closed

No part of your file, and no figure computed from it, is ever written to
storage. Reloading the page discards the report; you load the file again.

The one entry point to storage is [`src/ui/preferences.ts`](src/ui/preferences.ts).
Two tests hold that line: [`tests/ui/guards.test.ts`](tests/ui/guards.test.ts)
fails the build if any other file in `src/ui/` names `localStorage`,
`sessionStorage`, `indexedDB` or `document.cookie`, and
[`tests/ui/preferences.test.ts`](tests/ui/preferences.test.ts) fails if a
session leaves any key in storage other than those three.

## Cookies, accounts, telemetry

None. There is no account to create, no cookie set, no usage counted, no crash
report sent.

## Printing

"Print or save as PDF" uses the browser's own print dialogue. The PDF is
produced by your browser on your machine. No print service is involved.

## Hosting

The site is published with GitHub Pages. As with any web page, GitHub sees the
HTTP request that fetches the files, which includes your IP address — that is
GitHub's log of a page load, and it happens before you choose a file. It does
not, and cannot, include anything about your export. See
[GitHub's privacy statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement).

If you would rather not touch GitHub at all, clone the repository and run it
locally — see [CONTRIBUTING.md](CONTRIBUTING.md).
