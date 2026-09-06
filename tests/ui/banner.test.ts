// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { calculate } from '../../src/core/fifo';
import { reconcile } from '../../src/core/reconcile';
import type { Operation } from '../../src/core/operation';
import { type Language, translatorFor } from '../../src/ui/i18n';
import { banners } from '../../src/ui/views/banner';
import type { ReportContext } from '../../src/ui/views/common';
import { op } from '../helpers/operations';

/**
 * The engine reports an anomaly as a code and its numbers; the sentence the
 * reader sees is built here. Before this split, an Italian reader was handed
 * `AAA: sold 10 units with no holdings to cover` — English, written in
 * `src/core`, printed verbatim.
 */
describe('anomaly banner', () => {
  /** A sale of 10.5 units against an account that never bought any. */
  const UNCOVERED: Operation[] = [
    op('2024-01-02', 'CASH', 'CUSTOMER_INBOUND', { amount: '1000.00' }),
    op('2024-02-01', 'TRADING', 'SELL', { shares: '-10.5', amount: '150.00' }),
  ];

  function render(language: Language, operations: Operation[] = UNCOVERED): HTMLElement {
    const report = calculate(operations);
    const context: ReportContext = {
      operations,
      report,
      reconciliation: reconcile(operations, report),
      language,
      t: translatorFor(language),
    };
    const root = banners(context);
    if (!root) throw new Error('expected a banner for an account with an anomaly');
    return root;
  }

  function items(root: HTMLElement): string[] {
    return [...root.querySelectorAll('.banner__list li')].map((li) => li.textContent ?? '');
  }

  it('states an uncovered sale in Italian', () => {
    const [line, ...rest] = items(render('it'));
    expect(rest).toEqual([]);
    expect(line).toContain('AAA');
    // The quantity is a number for a reader, not `Decimal.toString()` output:
    // an Italian decimal separator, not the engine's dot.
    expect(line).toContain('10,5');
    expect(line).not.toContain('10.5');
  });

  it('states the same anomaly in English', () => {
    const [line] = items(render('en'));
    expect(line).toContain('AAA');
    expect(line).toContain('10.5');
  });

  it('leaves no English in the Italian banner', () => {
    // The exact words the engine used to hardcode.
    expect(items(render('it')).join(' ')).not.toMatch(/sold|units|no holdings/);
  });

  it('states an unmatched free-lot cancellation in both languages', () => {
    const operations: Operation[] = [
      op('2024-01-01', 'TRADING', 'BUY', { shares: '10', amount: '-100.00' }),
      op('2024-01-03', 'CORPORATE_ACTION', 'BONUS_ISSUE_CANCELLED', { shares: '-5', amount: '' }),
    ];
    expect(items(render('it', operations))[0]).toContain('AAA');
    expect(items(render('it', operations)).join(' ')).not.toMatch(/bonus cancellation|free lot/);
    expect(items(render('en', operations))[0]).toContain('AAA');
  });

  /*
   * The style the banners are written against.
   *
   * Both defects these cover shipped and stayed shipped, because a stylesheet
   * fails silently in both directions: `.banner__heading` selected nothing for
   * as long as it existed and the <h2> simply took the browser's 1.5em, while
   * `.banners` was named in the markup and styled nowhere, so its two panels met
   * with no gap. Neither is visible to a test that reads the DOM alone, and
   * jsdom lays nothing out, so the check is that the two files agree: every
   * selector app.css spends on a banner has to select a banner.
   */
  describe('the stylesheet the markup is written against', () => {
    /* Comments out: this file's own prose names both the live class and the dead
       one it replaced, and a selector scan cannot tell those from a rule. */
    const CSS = readFileSync(join(process.cwd(), 'src', 'ui', 'app.css'), 'utf8').replace(
      /\/\*[\s\S]*?\*\//g,
      '',
    );

    /** Every selector in app.css that claims to match part of a banner. */
    function bannerSelectors(): string[] {
      return [...CSS.matchAll(/([^{}]+)\{[^{}]*\}/g)]
        .flatMap((rule) => rule[1]!.split(','))
        .map((selector) => selector.trim())
        // Not `\.banners?\b`: `_` is a word character, so that boundary never
        // fires before `__title` and the scan skips the very selectors this
        // test exists for.
        .filter((selector) => /^\.banner/.test(selector));
    }

    /** The value of one property of one flat rule. */
    function declaration(selector: string, property: string): string {
      const head = `${selector} {`;
      const start = CSS.indexOf(head);
      if (start < 0) throw new Error(`app.css has no rule for ${selector}`);
      const body = CSS.slice(start + head.length, CSS.indexOf('}', start));
      const match = new RegExp(`(?:^|;)\\s*${property}\\s*:([^;]+)`).exec(body);
      if (!match) throw new Error(`${selector} declares no ${property}`);
      return match[1]!.trim();
    }

    /** An account that raises both banners: two unknown types and an anomaly. */
    const BOTH: Operation[] = [
      op('2024-01-02', 'CASH', 'CUSTOMER_INBOUND', { amount: '1000.00' }),
      op('2024-02-01', 'CASH', 'CRYPTO_STAKING_REWARD', { amount: '12.50' }),
      op('2024-02-02', 'CASH', 'REFERRAL_REWARD', { amount: '15.00' }),
      op('2024-03-01', 'TRADING', 'SELL', { shares: '-10.5', amount: '150.00' }),
    ];

    it('spends no rule on a class the markup never writes', () => {
      const root = render('en', BOTH);
      expect(root.querySelectorAll('.banner')).toHaveLength(2);

      const dead = bannerSelectors().filter(
        (selector) => !root.matches(selector) && root.querySelector(selector) === null,
      );
      expect(dead, 'app.css selectors that match nothing a banner renders').toEqual([]);
      // The scan is only evidence if it saw the rules: .banners, .banner,
      // .banner__title, .banner__list and `.banner p` are all in the sheet.
      expect(bannerSelectors().length).toBeGreaterThanOrEqual(5);
    });

    it('separates two banners by the gap the report puts between its panels', () => {
      // A banner is a bordered panel in the same stack as the sections, so
      // stacking two of them tighter than a section would read as one alert
      // divided by a rule — which is what a missing gap drew: 2px of touching
      // border.
      expect(declaration('.banners', 'gap')).toBe(declaration('.report', 'gap'));
    });
  });
});
