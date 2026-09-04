// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LANGUAGES, translate, translatorFor } from '../../src/ui/i18n';
import { LINKS } from '../../src/ui/links';
import { footer } from '../../src/ui/views/footer';

function anchors(language: 'it' | 'en' = 'en'): HTMLAnchorElement[] {
  return [...footer(translatorFor(language)).querySelectorAll('a')];
}

describe('the outbound links', () => {
  it('opens every one in a new tab without handing it this one', () => {
    // `noopener` keeps window.opener null; `noreferrer` stops the destination
    // learning which page the reader came from. A page that promises to send
    // nothing must not send that either.
    for (const anchor of anchors()) {
      expect(anchor.getAttribute('target'), anchor.href).toBe('_blank');
      expect(anchor.getAttribute('rel'), anchor.href).toBe('noopener noreferrer');
    }
  });

  it('points at the author and the source, and nowhere else', () => {
    // getAttribute, not .href: the property resolves against the document and
    // would compare an origin with the trailing slash the parser adds.
    expect(anchors().map((anchor) => anchor.getAttribute('href'))).toEqual([
      LINKS.author,
      LINKS.privacy,
      LINKS.sourceCode,
    ]);
  });

  it('has every link in links.ts vouched for by the bundle check', () => {
    // scripts/check-bundle.mjs fails the build on an absolute URL that is not
    // in its allowlist. Finding that out here names the missing entry; finding
    // it out at `npm run build` names only a URL in a minified file.
    const script = readFileSync(join(process.cwd(), 'scripts', 'check-bundle.mjs'), 'utf8');
    for (const url of Object.values(LINKS)) {
      expect(script, `${url} is not in ALLOWED`).toContain(`'${url}'`);
    }
  });
});

describe('the disclaimers', () => {
  it.each(LANGUAGES)('states all three in %s', (language) => {
    const text = footer(translatorFor(language)).textContent ?? '';
    expect(text).toContain(translate(language, 'footer.notAffiliated'));
    expect(text).toContain(translate(language, 'footer.notAdvice'));
    expect(text).toContain(translate(language, 'footer.noWarranty'));
  });

  it.each(LANGUAGES)('disclaims affiliation with Trade Republic in %s', (language) => {
    // The tool reads one broker's export and carries its name throughout, which
    // is exactly the reason a reader could take it for an official one.
    expect(translate(language, 'footer.notAffiliated')).toContain('Trade Republic');
  });

  it('credits the author and links to their site', () => {
    const text = footer(translatorFor('it')).textContent ?? '';
    expect(text).toContain('Enrico Schintu');
    expect(anchors('it').map((anchor) => anchor.getAttribute('href'))).toContain(LINKS.author);
  });
});

describe('on paper', () => {
  it('leaves the screen footer behind', () => {
    // Two footers on a printout, one of them a nav bar of links, is why this
    // block is hidden and report.ts prints `print.legal` in its place.
    expect(footer(translatorFor('en')).classList.contains('no-print')).toBe(true);
  });

  it.each(LANGUAGES)('says the same three things in one printed line in %s', (language) => {
    const line = translate(language, 'print.legal');
    expect(line).toContain('Trade Republic');
    expect(line).toContain('Enrico Schintu');
    expect(line.toLowerCase()).toContain('mit');
    // One line, because on paper the disclaimers must not cost a page.
    expect(line.length).toBeLessThan(200);
  });
});
