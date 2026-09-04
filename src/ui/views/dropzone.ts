/**
 * The landing view: drop a file, or pick one.
 *
 * The privacy claim sits on this screen rather than in a footer, because this
 * is the moment the reader decides whether to hand over a bank export. It is
 * also the only claim on the page that the reader can check themselves, from
 * the browser's own Network tab — so it says how.
 */

import { CsvError } from '../../core/csv';
import { el } from '../dom';
import type { MessageKey, Translator } from '../i18n';
import { LINKS } from '../links';

export interface DropzoneHandlers {
  /** Called with the file the reader chose or dropped. */
  onFile(file: File): void;
}

export interface DropzoneView {
  root: HTMLElement;
  showError(error: unknown): void;
  showBusy(busy: boolean): void;
}

export function dropzone(t: Translator, handlers: DropzoneHandlers): DropzoneView {
  const input = el('input', {
    type: 'file',
    accept: '.csv,text/csv',
    id: 'csv-input',
    class: 'visually-hidden',
  });

  const button = el('button', { type: 'button', class: 'button button--primary' }, [
    t('upload.button'),
  ]);
  button.addEventListener('click', () => input.click());

  input.addEventListener('change', () => {
    const file = input.files?.[0];
    // Reset first: picking the same file twice must fire `change` both times.
    input.value = '';
    if (file) handlers.onFile(file);
  });

  const status = el('p', { class: 'dropzone__status', role: 'status', 'aria-live': 'polite' });
  status.hidden = true;

  const errorBox = el('div', { class: 'dropzone__error', role: 'alert' });
  errorBox.hidden = true;

  const zone = el('div', { class: 'dropzone', 'data-testid': 'dropzone' }, [
    el('h2', { class: 'dropzone__heading' }, [t('upload.heading')]),
    el('p', { class: 'dropzone__instruction' }, [t('upload.instruction')]),
    button,
    input,
    el('p', { class: 'dropzone__hint' }, [t('upload.formatHint')]),
    status,
    errorBox,
  ]);

  let depth = 0;
  const setActive = (active: boolean): void => {
    zone.classList.toggle('is-active', active);
  };

  // dragenter/dragleave fire for every child element, so the nesting is
  // counted: without it, dragging across the heading clears the highlight.
  zone.addEventListener('dragenter', (event) => {
    event.preventDefault();
    depth += 1;
    setActive(true);
  });
  zone.addEventListener('dragover', (event) => {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  });
  zone.addEventListener('dragleave', () => {
    depth = Math.max(0, depth - 1);
    if (depth === 0) setActive(false);
  });
  zone.addEventListener('drop', (event) => {
    event.preventDefault();
    depth = 0;
    setActive(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) handlers.onFile(file);
  });

  const root = el('div', { class: 'landing' }, [zone, privacyPanel(t)]);

  return {
    root,
    showBusy(busy) {
      status.textContent = busy ? t('upload.reading') : '';
      status.hidden = !busy;
      button.disabled = busy;
    },
    showError(error) {
      errorBox.replaceChildren(
        el('p', { class: 'dropzone__error-heading' }, [t('error.heading')]),
        el('p', {}, [errorMessage(t, error)]),
        el('p', { class: 'dropzone__error-retry' }, [t('error.retry')]),
      );
      errorBox.hidden = false;
    },
  };
}

/**
 * The three facts, in the order the reader can check them: the Network tab
 * first, because it is one keystroke away; pulling the plug last, because it
 * costs the most to try and settles the most.
 */
const PRIVACY_FACTS = ['noUpload', 'noStorage', 'offline'] as const;

/**
 * The claim, and the three ways to falsify it.
 *
 * A description list, not prose: each row is an assertion and the evidence for
 * it, and a reader deciding whether to hand over a bank export scans the
 * assertions before reading a word of the evidence.
 */
function privacyPanel(t: Translator): HTMLElement {
  const facts = PRIVACY_FACTS.flatMap((fact) => [
    el('dt', { class: 'privacy-card__term' }, [t(`upload.privacyFact.${fact}.term` as MessageKey)]),
    el('dd', { class: 'privacy-card__detail' }, [
      t(`upload.privacyFact.${fact}.detail` as MessageKey),
    ]),
  ]);

  return el('aside', { class: 'privacy-card' }, [
    el('h3', { class: 'privacy-card__heading' }, [t('upload.privacyHeading')]),
    el('p', { class: 'privacy-card__lead' }, [t('upload.privacyBody')]),
    el('dl', { class: 'privacy-card__facts' }, facts),
    el(
      'a',
      {
        class: 'privacy-card__link',
        href: LINKS.privacy,
        target: '_blank',
        rel: 'noopener noreferrer',
      },
      [t('footer.privacy')],
    ),
  ]);
}

/**
 * Turn a failure into a sentence.
 *
 * Nothing here ever interpolates file content: a malformed row is identified by
 * its line number only, because the row itself may hold a name or an IBAN.
 */
export function errorMessage(t: Translator, error: unknown): string {
  if (error instanceof CsvError) {
    const key = `error.${error.code}` as MessageKey;
    return t(key, {
      count: error.missingColumns.length,
      columns: error.missingColumns.join(', '),
      line: error.line ?? '?',
    });
  }
  return t('error.UNKNOWN');
}
