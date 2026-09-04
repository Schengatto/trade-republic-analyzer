/**
 * The only things this application is allowed to persist.
 *
 * `STORED_KEYS` is the complete list, and it is exported so a test can assert
 * that nothing else is ever written. Report data, file names and CSV contents
 * must never reach storage: the promise is that the export stays in memory for
 * the life of the tab and leaves no trace behind it.
 */

import { isLanguage, type Language } from './i18n';

export const THEMES = ['light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

const LANGUAGE_KEY = 'tra.language';
const THEME_KEY = 'tra.theme';
const RAIL_KEY = 'tra.rail';

/** Every storage key this application may use, for the guard test. */
export const STORED_KEYS = [LANGUAGE_KEY, THEME_KEY, RAIL_KEY] as const;

function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark';
}

/**
 * Storage can throw rather than merely be empty — Safari in private mode, and
 * any browser configured to block site data. A reader who blocked storage still
 * gets a working report, just without a remembered preference.
 */
function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Preference not remembered; the session still works.
  }
}

export function loadLanguage(): Language {
  const stored = read(LANGUAGE_KEY);
  if (isLanguage(stored)) return stored;
  // No stored choice: follow the browser, defaulting to English.
  return browserLanguage() ?? 'en';
}

/**
 * The first language the reader accepts that this build actually carries.
 *
 * `navigator.languages` is an ordered preference list, so someone who asks for
 * Dutch first and German second gets Dutch, rather than whichever this happens
 * to test first. Only the primary subtag is compared: a reader on `de-AT` or
 * `pt-BR` gets German or Portuguese in the one regional flavour shipped here.
 */
function browserLanguage(): Language | null {
  if (typeof navigator === 'undefined') return null;
  const accepted = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const tag of accepted) {
    const primary = tag?.toLowerCase().split('-')[0];
    if (isLanguage(primary)) return primary;
  }
  return null;
}

export function saveLanguage(language: Language): void {
  write(LANGUAGE_KEY, language);
}

export function loadTheme(): Theme {
  const stored = read(THEME_KEY);
  if (isTheme(stored)) return stored;
  const prefersDark =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

export function saveTheme(theme: Theme): void {
  write(THEME_KEY, theme);
}

/**
 * Whether the section rail starts open. Closed unless the reader said otherwise.
 *
 * Closed is the default because the rail is an index, not the document: on a
 * first visit the report should get the width, and the glyph column is enough
 * to show that an index is there to open.
 */
export function loadRail(): boolean {
  return read(RAIL_KEY) === 'open';
}

export function saveRail(open: boolean): void {
  write(RAIL_KEY, open ? 'open' : 'closed');
}

/**
 * Stamp the rail's state on the root element, which is what shifts the page.
 *
 * The rail is fixed to the viewport, so the room for it is made by padding the
 * body rather than by a wrapper the report would have to sit inside. `null`
 * clears the attribute: on the landing screen there is no rail and no gutter.
 */
export function applyRail(open: boolean | null): void {
  if (open === null) document.documentElement.removeAttribute('data-rail');
  else document.documentElement.setAttribute('data-rail', open ? 'open' : 'closed');
}

/** Stamp the chosen theme on the root element, which every token keys off. */
export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
}

export function applyLanguage(language: Language): void {
  document.documentElement.setAttribute('lang', language);
}
