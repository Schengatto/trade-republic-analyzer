/**
 * File-level guards over the catalogues in `src/ui/messages/`.
 *
 * The type checker already proves that every catalogue carries exactly the keys
 * the Italian source declares. What it cannot see is the shape of the file: the
 * order the keys are written in, a byte-order mark, or an English sentence left
 * behind under a translated key. Those are what this covers, because the
 * catalogues past `it` and `en` are machine-assisted and unreviewed, and a
 * reviewer diffing two files side by side needs the lines to correspond.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LANGUAGES, catalogue } from '../../src/ui/i18n';

const MESSAGES_DIR = join(process.cwd(), 'src', 'ui', 'messages');

const FILES = LANGUAGES.map((language) => ({
  language,
  bytes: readFileSync(join(MESSAGES_DIR, `${language}.ts`)),
}));

/** The keys of one catalogue file, in the order they are written. */
function writtenKeys(source: string): string[] {
  return [...source.matchAll(/^ {2}'([^']+)':/gm)].map((match) => match[1] as string);
}

it('guards one file per shipped language, and no orphan', () => {
  const onDisk = readdirSync(MESSAGES_DIR)
    .filter((name) => name.endsWith('.ts'))
    .map((name) => name.replace(/\.ts$/, ''))
    .sort();
  expect(onDisk).toEqual([...LANGUAGES].sort());
});

describe('every catalogue file', () => {
  it.each(FILES)('$language starts with no byte-order mark', ({ bytes }) => {
    // A BOM survives into the bundle and has been introduced here before, by a
    // well-meaning pass that "resolved an encoding issue".
    expect([bytes[0], bytes[1], bytes[2]]).not.toEqual([0xef, 0xbb, 0xbf]);
  });

  it.each(FILES)('$language writes its keys in the source order', ({ language, bytes }) => {
    // The type only demands the same set. Reviewing a translation means reading
    // it against the Italian line by line, which a reordered file makes
    // impossible.
    const source = writtenKeys(readFileSync(join(MESSAGES_DIR, 'it.ts'), 'utf8'));
    expect(writtenKeys(bytes.toString('utf8')), language).toEqual(source);
  });
});

describe('the CSV literals', () => {
  it('says BUY and SELL in every language', () => {
    // These are values inside the reader's own file. Translating them would
    // misstate what the figure counts: a partially filled order writes several
    // rows, so this is a number of rows and never a number of orders.
    for (const language of LANGUAGES) {
      const messages = catalogue(language);
      for (const key of ['monthlyTransactions.description', 'monthlyTransactions.series'] as const) {
        expect(messages[key], `${language}/${key}`).toContain('BUY');
        expect(messages[key], `${language}/${key}`).toContain('SELL');
      }
    }
  });
});

describe('the author’s own details', () => {
  it('are never translated', () => {
    for (const language of LANGUAGES) {
      const messages = catalogue(language);
      expect(messages['footer.copyright'], language).toBe('© 2026 Enrico Schintu');
      expect(messages['footer.authorSite'], language).toBe('enricoschintu.com');
    }
  });
});
