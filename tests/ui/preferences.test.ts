// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import {
  STORED_KEYS,
  applyLanguage,
  applyRail,
  applyTheme,
  loadLanguage,
  loadRail,
  loadTheme,
  saveLanguage,
  saveRail,
  saveTheme,
} from '../../src/ui/preferences';

beforeEach(() => {
  window.localStorage.clear();
});

describe('preferences', () => {
  it('round-trips a language and a theme', () => {
    saveLanguage('it');
    saveTheme('dark');
    expect(loadLanguage()).toBe('it');
    expect(loadTheme()).toBe('dark');
  });

  it('ignores a stored value that is not a supported option', () => {
    window.localStorage.setItem('tra.theme', 'neon');
    expect(loadTheme()).toBe('light');
  });

  it('stamps the choice on the root element', () => {
    applyTheme('dark');
    applyLanguage('it');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.getAttribute('lang')).toBe('it');
  });

  it('starts the rail closed until the reader opens it', () => {
    expect(loadRail()).toBe(false);
    saveRail(true);
    expect(loadRail()).toBe(true);
  });

  it('clears the rail gutter when there is no rail to sit in it', () => {
    applyRail(true);
    expect(document.documentElement.getAttribute('data-rail')).toBe('open');
    applyRail(false);
    expect(document.documentElement.getAttribute('data-rail')).toBe('closed');
    applyRail(null);
    expect(document.documentElement.hasAttribute('data-rail')).toBe(false);
  });
});

describe('the language a first visit lands on', () => {
  function withAcceptedLanguages(tags: string[], run: () => void): void {
    const original = Object.getOwnPropertyDescriptor(window.navigator, 'languages');
    Object.defineProperty(window.navigator, 'languages', { value: tags, configurable: true });
    try {
      run();
    } finally {
      if (original) Object.defineProperty(window.navigator, 'languages', original);
    }
  }

  it('takes the first accepted language this build carries', () => {
    // Swedish is not shipped, so Dutch wins over German by being asked first.
    // Testing only `navigator.language` would have let a build pick whichever
    // supported language it happened to compare first.
    withAcceptedLanguages(['sv-SE', 'nl-NL', 'de-DE'], () => {
      expect(loadLanguage()).toBe('nl');
    });
  });

  it('matches on the primary subtag, so a regional flavour still counts', () => {
    withAcceptedLanguages(['pt-BR'], () => {
      expect(loadLanguage()).toBe('pt');
    });
  });

  it('falls back to English when it carries none of them', () => {
    withAcceptedLanguages(['ja', 'ko'], () => {
      expect(loadLanguage()).toBe('en');
    });
  });

  it('lets a stored choice outrank the browser', () => {
    // The reader who picked a language means it, including when they picked one
    // their browser never asked for.
    saveLanguage('es');
    withAcceptedLanguages(['de-DE'], () => {
      expect(loadLanguage()).toBe('es');
    });
  });
});

describe('storage boundary', () => {
  it('writes preferences and nothing else', () => {
    // The promise is that the export stays in memory for the life of the tab.
    // If a future change ever persists report data, this fails loudly.
    saveLanguage('en');
    saveTheme('light');
    saveRail(false);
    expect(Object.keys(window.localStorage).sort()).toEqual([...STORED_KEYS].sort());
  });

  it('survives storage that throws instead of merely being empty', () => {
    // Safari in private mode, and any browser set to block site data.
    const original = window.localStorage.setItem;
    window.localStorage.setItem = () => {
      throw new Error('blocked');
    };
    expect(() => saveTheme('dark')).not.toThrow();
    window.localStorage.setItem = original;
  });
});
