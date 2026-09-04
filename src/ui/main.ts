/**
 * Application entry point: header controls, file handling, and rendering.
 *
 * The file is read with `FileReader` and parsed in this tab. There is no
 * `fetch`, no `XMLHttpRequest`, no worker fetching anything — the only thing
 * that ever crosses a boundary is the page itself, loaded once.
 */

import './app.css';
import './print.css';

import { parseOperations } from '../core/csv';
import { calculate } from '../core/fifo';
import { reconcile } from '../core/reconcile';
import type { Operation } from '../core/operation';
import { clear, el } from './dom';
import { LANGUAGES, LANGUAGE_NAMES, isLanguage, translatorFor, type Language } from './i18n';
import { rail } from './rail';
import {
  applyLanguage,
  applyRail,
  applyTheme,
  loadLanguage,
  loadRail,
  loadTheme,
  saveRail,
  saveLanguage,
  saveTheme,
  type Theme,
} from './preferences';
import { dropzone } from './views/dropzone';
import { footer } from './views/footer';
import { reportView } from './views/report';
import type { ReportContext } from './views/common';

let language: Language = loadLanguage();
let theme: Theme = loadTheme();
let railOpen = loadRail();
/**
 * The parsed file, held in a module variable for the life of the tab so that
 * switching language re-renders without asking for the file again. Nothing
 * writes it to storage, and reloading the page loses it — by design.
 */
let operations: Operation[] | null = null;
let generatedAt = new Date();

const root = appRoot();

function appRoot(): HTMLDivElement {
  const found = document.querySelector<HTMLDivElement>('#app');
  if (!found) throw new Error('#app container missing from the document');
  return found;
}

applyTheme(theme);
applyLanguage(language);
render();

/*
 * Each chart's table lives in a collapsed <details>. CSS alone cannot open it —
 * the browser hides the contents of a closed <details> regardless of styling —
 * so it is opened for real before printing. On paper the table is how a chart
 * is read, because there is no hover there.
 */
window.addEventListener('beforeprint', () => {
  for (const details of document.querySelectorAll<HTMLDetailsElement>('details.figure__table')) {
    details.open = true;
  }
});

function render(): void {
  const t = translatorFor(language);
  clear(root);
  // The body is built first so the rail can be read off the sections that
  // actually rendered. A hand-kept list would drift the first time a section
  // learned to return null.
  const body = main();
  const index = rail(body, t, {
    open: railOpen,
    onToggle(open) {
      railOpen = open;
      saveRail(open);
      applyRail(open);
    },
  });

  // The rail follows the header so that the skip link stays the first stop for
  // a keyboard: it is fixed to the viewport, so its place in the tree costs it
  // nothing on screen.
  applyRail(index === false ? null : railOpen);
  // The footer is appended to the shell, not to either view, so that the
  // disclaimers are there whether or not a file has been chosen.
  root.append(header(), ...(index === false ? [] : [index]), appBar(), body, footer(t));
  document.title = t('app.title');
}

/** The identity block. Scrolls away; the bar below it does not. */
function header(): HTMLElement {
  const t = translatorFor(language);

  return el('header', { class: 'app-header' }, [
    el('a', { href: '#report', class: 'skip-link' }, [t('app.skipToReport')]),
    el('div', { class: 'app-header__identity' }, [
      el('h1', { class: 'app-header__title' }, [t('app.title')]),
      el('p', { class: 'app-header__tagline' }, [t('app.tagline')]),
    ]),
  ]);
}

/**
 * The controls.
 *
 * Sticky: once the header had scrolled away there was no route to the print
 * button or the theme other than scrolling back to the top. The way to a
 * section left this bar for the rail, which is why it now fits on one line.
 */
function appBar(): HTMLElement {
  const t = translatorFor(language);

  const languageSelect = el('select', { class: 'control__select', id: 'language-select' });
  for (const code of LANGUAGES) {
    const option = el('option', { value: code, selected: code === language }, [
      LANGUAGE_NAMES[code],
    ]);
    languageSelect.append(option);
  }
  languageSelect.addEventListener('change', () => {
    const chosen = languageSelect.value;
    if (!isLanguage(chosen)) return;
    language = chosen;
    saveLanguage(language);
    applyLanguage(language);
    render();
  });

  // Names the action, not a state: under a label reading "Theme", the word
  // "Dark" was taken for the theme in force rather than the one on offer.
  const themeButton = el('button', { type: 'button', class: 'button button--quiet' }, [
    theme === 'dark' ? t('nav.theme.toLight') : t('nav.theme.toDark'),
  ]);
  themeButton.addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    saveTheme(theme);
    applyTheme(theme);
    render();
  });

  const controls: (Node | false)[] = [
    el('label', { class: 'control' }, [
      el('span', { class: 'control__label' }, [t('nav.language')]),
      languageSelect,
    ]),
    el('div', { class: 'control' }, [
      el('span', { class: 'control__label' }, [t('nav.theme')]),
      themeButton,
    ]),
  ];

  if (operations) {
    const printButton = el('button', { type: 'button', class: 'button' }, [t('nav.print')]);
    printButton.addEventListener('click', () => window.print());

    const resetButton = el('button', { type: 'button', class: 'button button--quiet' }, [
      t('nav.reset'),
    ]);
    resetButton.addEventListener('click', () => {
      operations = null;
      render();
    });

    controls.push(el('div', { class: 'control control--actions' }, [printButton, resetButton]));
  }

  return el('div', { class: 'app-bar no-print' }, [
    el('div', { class: 'app-bar__controls' }, controls),
  ]);
}

function main(): HTMLElement {
  const t = translatorFor(language);

  if (!operations) {
    const view = dropzone(t, {
      onFile(file) {
        view.showBusy(true);
        readFile(file)
          .then((parsed) => {
            operations = parsed;
            generatedAt = new Date();
            render();
          })
          .catch((error: unknown) => {
            view.showBusy(false);
            view.showError(error);
          });
      },
    });
    return el('main', { class: 'app-main' }, [view.root]);
  }

  const report = calculate(operations);
  const context: ReportContext = {
    operations,
    report,
    reconciliation: reconcile(operations, report),
    language,
    t,
  };

  return el('main', { class: 'app-main' }, [reportView(context, generatedAt)]);
}

/**
 * Read the dropped file into a string.
 *
 * `FileReader` rather than `file.text()` only because the failure path is
 * explicit: a directory dropped onto the zone rejects here instead of resolving
 * to an empty string that would then look like an empty export.
 */
function readFile(file: File): Promise<Operation[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      try {
        resolve(parseOperations(String(reader.result)));
      } catch (error) {
        reject(error instanceof Error ? error : new Error('parse failed'));
      }
    });
    reader.addEventListener('error', () => reject(new Error('read failed')));
    reader.readAsText(file);
  });
}
