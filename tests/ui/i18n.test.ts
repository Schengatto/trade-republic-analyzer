import { describe, expect, it } from 'vitest';
import {
  LANGUAGES,
  LANGUAGE_NAMES,
  catalogue,
  isLanguage,
  translate,
  translatorFor,
  type MessageKey,
} from '../../src/ui/i18n';

/** The `{placeholder}` names a message expects, in the order they appear. */
function placeholders(template: string): string[] {
  return [...template.matchAll(/\{(\w+)\}/g)].map((match) => match[1] as string).sort();
}

describe('catalogues', () => {
  it('carries the same keys in every language', () => {
    const [first, ...rest] = LANGUAGES.map((language) => Object.keys(catalogue(language)).sort());
    for (const keys of rest) expect(keys).toEqual(first);
  });

  it('keeps every placeholder the Italian source declares', () => {
    // A translator who writes {conteggio} for {count} produces a message that
    // renders the brace instead of the number, and nothing else would catch it:
    // the key is present, the string is not empty, and it reads correctly.
    const source = catalogue('it');
    for (const language of LANGUAGES) {
      const target = catalogue(language);
      for (const key of Object.keys(source) as MessageKey[]) {
        expect(placeholders(target[key]), `${language}/${key}`).toEqual(placeholders(source[key]));
      }
    }
  });

  it('leaves the product name alone in every language', () => {
    // It is a proper noun; a translated one would not be the thing it names.
    for (const language of LANGUAGES) {
      expect(catalogue(language)['app.title'], language).toBe('Trade Republic Analyzer');
    }
  });

  it('leaves no message empty', () => {
    for (const language of LANGUAGES) {
      for (const [key, value] of Object.entries(catalogue(language))) {
        expect(value.trim(), `${language}/${key}`).not.toBe('');
      }
    }
  });

  it('states in both languages that the monthly count is of BUY and SELL rows', () => {
    // The user-facing promise: a partially filled order produces several rows,
    // so this figure must never be presented as a number of orders.
    expect(translate('it', 'monthlyTransactions.description')).toContain('BUY e SELL');
    expect(translate('it', 'monthlyTransactions.series')).toContain('BUY e SELL');
    expect(translate('en', 'monthlyTransactions.description')).toContain('BUY and SELL');
    expect(translate('en', 'monthlyTransactions.series')).toContain('BUY and SELL');
  });
});

describe('translate', () => {
  it('substitutes named placeholders', () => {
    expect(translate('en', 'summary.operationsRead', { count: 42 })).toContain('42');
  });

  it('leaves an unknown placeholder visible rather than blanking it', () => {
    // A silent gap would hide the bug; a stray {count} shows up on the page.
    expect(translate('en', 'summary.operationsRead', { other: 1 })).toContain('{count}');
  });

  it('binds one language with translatorFor', () => {
    expect(translatorFor('it')('nav.theme.toDark')).toBe('Passa a scuro');
  });
});

describe('isLanguage', () => {
  it('accepts every shipped code and nothing else', () => {
    for (const language of LANGUAGES) expect(isLanguage(language), language).toBe(true);
    expect(isLanguage('sv')).toBe(false);
    expect(isLanguage('it-IT')).toBe(false);
    expect(isLanguage(null)).toBe(false);
  });
});

describe('the language picker', () => {
  it('names every language in itself', () => {
    // A reader who cannot read the interface in force still has to find their
    // own language in the list, so the endonym is the only usable label.
    for (const language of LANGUAGES) {
      expect(LANGUAGE_NAMES[language]?.trim(), language).toBeTruthy();
    }
    expect(new Set(Object.values(LANGUAGE_NAMES)).size).toBe(LANGUAGES.length);
  });

  it('lists the languages in the order the picker shows them', () => {
    // Ordered by the name each gives itself, not by when it was added.
    const shown = LANGUAGES.map((language) => LANGUAGE_NAMES[language]);
    expect(shown).toEqual([...shown].sort((a, b) => a.localeCompare(b, 'en')));
  });
});

describe('the trading-quality copy', () => {
  it('counts securities, not operations, in the Italian win-rate heading', () => {
    // The statistic is one row per security, so "operazioni" was a lie about
    // the unit — and it is exactly the confusion the execution section exists
    // to resolve.
    expect(translate('it', 'winRate.heading')).not.toContain('operazioni');
    expect(translate('it', 'winRate.heading')).toContain('titoli');
  });

  it('carries the concentration placeholder in both languages', () => {
    for (const language of LANGUAGES) {
      expect(translate(language, 'execution.concentration', { percent: '90%' })).toContain('90%');
    }
  });
});
