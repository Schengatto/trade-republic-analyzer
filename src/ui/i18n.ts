/**
 * The message catalogues and the lookup over them.
 *
 * Italian is the source catalogue: `Messages` is derived from it in
 * `messages/it.ts`, so any other catalogue fails to compile until it carries
 * exactly the same keys. That check is what keeps a half-translated build from
 * reaching a reader.
 *
 * One catalogue per file. Seven of them inline would make the module that owns
 * `translate` unreadable, and a translator working on one language should not
 * have to scroll past six others to find it.
 */

import { de } from './messages/de';
import { en } from './messages/en';
import { es } from './messages/es';
import { fr } from './messages/fr';
import { it, type MessageKey, type Messages } from './messages/it';
import { nl } from './messages/nl';
import { pt } from './messages/pt';

export type { MessageKey, Messages };

/**
 * Ordered by the name each language gives itself, which is the order the
 * picker shows: a reader scanning for "Português" should not have to know that
 * the source language is Italian.
 */
export const LANGUAGES = ['de', 'en', 'es', 'fr', 'it', 'nl', 'pt'] as const;
export type Language = (typeof LANGUAGES)[number];

/**
 * Each language named in itself.
 *
 * A reader who cannot read the interface in force still has to find their own
 * language in the list, so "Deutsch" — never "Tedesco" or "German".
 */
export const LANGUAGE_NAMES: Record<Language, string> = {
  de: 'Deutsch',
  en: 'English',
  es: 'Español',
  fr: 'Français',
  it: 'Italiano',
  nl: 'Nederlands',
  pt: 'Português',
};

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

const CATALOGUES: Record<Language, Messages> = { de, en, es, fr, it, nl, pt };

export type MessageVars = Record<string, string | number>;

/**
 * Look up a message and substitute `{placeholder}` variables.
 *
 * An unknown placeholder is left in place rather than blanked, so a missing
 * variable shows up while reading the page instead of turning into a silent gap.
 */
export function translate(language: Language, key: MessageKey, vars?: MessageVars): string {
  const template = CATALOGUES[language][key];
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in vars ? String(vars[name]) : whole,
  );
}

/** A `translate` bound to one language, for handing down to view functions. */
export type Translator = (key: MessageKey, vars?: MessageVars) => string;

export function translatorFor(language: Language): Translator {
  return (key, vars) => translate(language, key, vars);
}

export function catalogue(language: Language): Messages {
  return CATALOGUES[language];
}
