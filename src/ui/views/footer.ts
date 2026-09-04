/**
 * The page footer: who wrote this, and what it does not claim to be.
 *
 * It renders under both the landing screen and the report, because the reader
 * who needs "this is not tax advice" is the one looking at the numbers, not the
 * one who has yet to choose a file. On paper it is hidden — `report.ts` prints
 * a single condensed line instead, so the disclaimers do not eat a page.
 */

import { el } from '../dom';
import type { MessageKey, Translator } from '../i18n';
import { LINKS } from '../links';

/** Every anchor on the page is built here, so the `rel` cannot be forgotten. */
function link(href: string, label: string): HTMLAnchorElement {
  return el('a', { href, target: '_blank', rel: 'noopener noreferrer' }, [label]);
}

/**
 * The three disclaimers, in descending order of how badly a reader would be
 * hurt by not knowing: whose tool this is, what the numbers are not, and what
 * happens if they are wrong.
 */
const DISCLAIMERS: MessageKey[] = ['footer.notAffiliated', 'footer.notAdvice', 'footer.noWarranty'];

export function footer(t: Translator): HTMLElement {
  const disclaimers = DISCLAIMERS.map((key) => el('p', { class: 'site-footer__note' }, [t(key)]));

  const links = el('ul', { class: 'site-footer__links' }, [
    el('li', {}, [link(LINKS.privacy, t('footer.privacy'))]),
    el('li', {}, [link(LINKS.sourceCode, t('footer.sourceCode'))]),
  ]);

  return el('footer', { class: 'site-footer no-print' }, [
    el('section', { class: 'site-footer__legal' }, [
      el('h2', { class: 'site-footer__heading' }, [t('footer.disclaimerHeading')]),
      ...disclaimers,
    ]),
    el('div', { class: 'site-footer__meta' }, [
      el('p', { class: 'site-footer__copyright' }, [
        t('footer.copyright'),
        ' · ',
        link(LINKS.author, t('footer.authorSite')),
      ]),
      links,
    ]),
  ]);
}
