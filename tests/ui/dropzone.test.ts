// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { CsvError } from '../../src/core/csv';
import { LANGUAGES, translate, translatorFor } from '../../src/ui/i18n';
import { LINKS } from '../../src/ui/links';
import { dropzone, errorMessage } from '../../src/ui/views/dropzone';

const t = translatorFor('en');

function mount(onFile = vi.fn()) {
  const view = dropzone(t, { onFile });
  document.body.replaceChildren(view.root);
  const zone = view.root.querySelector<HTMLElement>('.dropzone');
  if (!zone) throw new Error('dropzone missing');
  return { view, zone, onFile };
}

/** A DragEvent carrying files, which jsdom does not construct on its own. */
function dropEvent(files: File[]): Event {
  const event = new Event('drop', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'dataTransfer', { value: { files } });
  return event;
}

describe('choosing a file', () => {
  it('hands the dropped file to the caller', () => {
    const { zone, onFile } = mount();
    const file = new File(['datetime\n'], 'export.csv', { type: 'text/csv' });
    zone.dispatchEvent(dropEvent([file]));
    expect(onFile).toHaveBeenCalledWith(file);
  });

  it('ignores a drop that carries no file', () => {
    const { zone, onFile } = mount();
    zone.dispatchEvent(dropEvent([]));
    expect(onFile).not.toHaveBeenCalled();
  });

  it('highlights only while the pointer is really over the zone', () => {
    // dragenter/dragleave fire for each child, so the nesting has to be
    // counted: otherwise crossing the heading clears the highlight mid-drag.
    const { zone } = mount();
    const heading = zone.querySelector('.dropzone__heading');
    if (!heading) throw new Error('heading missing');

    zone.dispatchEvent(new Event('dragenter', { bubbles: true }));
    heading.dispatchEvent(new Event('dragenter', { bubbles: true }));
    heading.dispatchEvent(new Event('dragleave', { bubbles: true }));
    expect(zone.classList.contains('is-active')).toBe(true);

    zone.dispatchEvent(new Event('dragleave', { bubbles: true }));
    expect(zone.classList.contains('is-active')).toBe(false);
  });
});

describe('the privacy panel', () => {
  it('pairs every claim with the evidence for it', () => {
    // A bare list of three reassurances is a slogan. Each term here is followed
    // by how the reader checks it themselves, and a term that lost its detail
    // would be the slogan again.
    const { view } = mount();
    const terms = [...view.root.querySelectorAll('.privacy-card__term')];
    const details = [...view.root.querySelectorAll('.privacy-card__detail')];

    expect(terms).toHaveLength(3);
    expect(details).toHaveLength(3);
    for (const node of [...terms, ...details]) {
      expect(node.textContent?.trim()).not.toBe('');
    }
  });

  it.each(LANGUAGES)('says in %s that the file never leaves the machine', (language) => {
    const view = dropzone(translatorFor(language), { onFile: vi.fn() });
    const text = view.root.querySelector('.privacy-card')?.textContent ?? '';
    for (const key of [
      'upload.privacyBody',
      'upload.privacyFact.noUpload.detail',
      'upload.privacyFact.noStorage.detail',
      'upload.privacyFact.offline.detail',
    ] as const) {
      expect(text).toContain(translate(language, key));
    }
  });

  it('links to the privacy statement without handing over this tab', () => {
    const link = mount().view.root.querySelector<HTMLAnchorElement>('.privacy-card__link');
    expect(link?.getAttribute('href')).toBe(LINKS.privacy);
    expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
  });
});

describe('reporting a failure', () => {
  it('names the missing columns, which are header names and not data', () => {
    const message = errorMessage(t, new CsvError('MISSING_COLUMNS', 'x', undefined, ['amount']));
    expect(message).toContain('amount');
  });

  it('identifies a bad row by line number and never quotes it', () => {
    // The row itself can hold an account holder's name or an IBAN.
    const message = errorMessage(t, new CsvError('MALFORMED_ROW', 'x', 42));
    expect(message).toContain('42');
    expect(message.toLowerCase()).toContain('personal data');
  });

  it('falls back to a generic message for anything else', () => {
    expect(errorMessage(t, new Error('boom'))).toBe(t('error.UNKNOWN'));
    // And the thrown message is not shown: it could carry file content.
    expect(errorMessage(t, new Error('boom'))).not.toContain('boom');
  });

  it('shows the error in the zone', () => {
    const { view, zone } = mount();
    view.showError(new CsvError('NO_ROWS', 'x'));
    const box = zone.querySelector<HTMLElement>('.dropzone__error');
    expect(box?.hidden).toBe(false);
    expect(box?.textContent).toContain(t('error.NO_ROWS'));
  });
});
