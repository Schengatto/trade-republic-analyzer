// @vitest-environment jsdom

/**
 * The section rail: the only way to a section other than scrolling.
 *
 * It is built against the real report rather than a handful of stub sections,
 * because the thing most likely to break it is a new section — one that renders
 * without a glyph, or that renders conditionally and leaves a link pointing at
 * an anchor that is not there.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { calculate } from '../../src/core/fifo';
import { reconcile } from '../../src/core/reconcile';
import type { Operation } from '../../src/core/operation';
import { translatorFor } from '../../src/ui/i18n';
import { sectionIcon } from '../../src/ui/icons';
import { rail } from '../../src/ui/rail';
import { reportView } from '../../src/ui/views/report';
import type { ReportContext } from '../../src/ui/views/common';
import { op } from '../helpers/operations';

const ACCOUNT: Operation[] = [
  op('2024-01-02', 'CASH', 'CUSTOMER_INBOUND', { amount: '1000.00' }),
  op('2024-01-03', 'TRADING', 'BUY', {
    shares: '10',
    amount: '-100.00',
    fee: '-1.00',
    assetClass: 'STOCK',
  }),
  op('2024-03-07', 'TRADING', 'SELL', {
    shares: '-10',
    amount: '150.00',
    tax: '-13.00',
    assetClass: 'STOCK',
  }),
  op('2024-04-01', 'CASH', 'DIVIDEND', { amount: '8.00', tax: '-2.08' }),
];

const t = translatorFor('it');

function reportBody(): HTMLElement {
  const report = calculate(ACCOUNT);
  const context: ReportContext = {
    operations: ACCOUNT,
    report,
    reconciliation: reconcile(ACCOUNT, report),
    language: 'it',
    t,
  };
  return reportView(context, new Date('2024-05-01T10:00:00Z'));
}

function build(open = false): { nav: HTMLElement; body: HTMLElement; toggled: boolean[] } {
  const body = reportBody();
  const toggled: boolean[] = [];
  const nav = rail(body, t, { open, onToggle: (next) => toggled.push(next) });
  if (nav === false) throw new Error('the rail declined to render');
  document.body.append(nav, body);
  return { nav, body, toggled };
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

describe('the section rail', () => {
  it('carries one link per rendered section, in reading order', () => {
    const { nav, body } = build();
    const targets = [...nav.querySelectorAll('.rail__link')].map((link) =>
      link.getAttribute('href'),
    );
    const ids = [...body.querySelectorAll('section.section')].map((section) => `#${section.id}`);

    expect(targets).toEqual(ids);
  });

  it('points every link at a section that is really there', () => {
    const { nav, body } = build();
    for (const link of nav.querySelectorAll('.rail__link')) {
      const id = link.getAttribute('href')?.slice(1) ?? '';
      expect(body.querySelector(`#${id}`), id).not.toBeNull();
    }
  });

  it('names each link with the section heading, once', () => {
    const { nav, body } = build();
    const titles = [...body.querySelectorAll('.section__title')].map((node) => node.textContent);
    const labels = [...nav.querySelectorAll('.rail__link')].map((link) => {
      // One node, not two: the label and the tooltip are the same element, so
      // a heading change cannot leave a stale tooltip behind.
      expect(link.querySelectorAll('.rail__text')).toHaveLength(1);
      return link.querySelector('.rail__text')?.textContent;
    });

    expect(labels).toEqual(titles);
  });

  it('gives every section a glyph of its own', () => {
    const { nav } = build();
    const drawn = [...nav.querySelectorAll('.rail__link .rail__icon')].map(
      (icon) => icon.innerHTML,
    );

    // Two sections sharing a silhouette make the closed rail unreadable.
    expect(new Set(drawn).size).toBe(drawn.length);

    // And uniqueness alone does not catch a *missing* glyph: the fallback dot
    // is unique too, so a section with no icon passed the check above while
    // rendering as a bare dot.
    const fallback = sectionIcon('no-such-section').innerHTML;
    expect(drawn).not.toContain(fallback);
  });

  it('declines to render when nothing was rendered to index', () => {
    expect(rail(document.createElement('div'), t, { open: false, onToggle: () => {} })).toBe(false);
  });
});

describe('opening and closing', () => {
  it('opens on the remembered state without being toggled', () => {
    const { nav, toggled } = build(true);
    expect(nav.dataset.open).toBe('true');
    expect(nav.querySelector('.rail__toggle')?.getAttribute('aria-expanded')).toBe('true');
    expect(toggled).toEqual([]);
  });

  it('reports each toggle so the choice can be remembered', () => {
    const { nav, toggled } = build();
    const toggle = nav.querySelector<HTMLButtonElement>('.rail__toggle');

    toggle?.click();
    expect(nav.dataset.open).toBe('true');
    expect(toggle?.getAttribute('aria-expanded')).toBe('true');

    toggle?.click();
    expect(nav.dataset.open).toBe('false');
    expect(toggled).toEqual([true, false]);
  });

  it('leaves the report alone: toggling rebuilds nothing', () => {
    const { nav, body } = build();
    const before = body.innerHTML;
    nav.querySelector<HTMLButtonElement>('.rail__toggle')?.click();

    // A re-render would throw away the scroll position the rail exists to keep.
    expect(body.innerHTML).toBe(before);
  });
});

describe('where the panel covers what it indexes', () => {
  /** Force the narrow width at which the panel floats over the report. */
  function asNarrowViewport(): void {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true, addEventListener() {}, removeEventListener() {} })),
    );
  }

  it('closes when a section is chosen', () => {
    asNarrowViewport();
    const { nav } = build(true);
    nav.querySelector<HTMLAnchorElement>('.rail__link')?.click();
    expect(nav.dataset.open).toBe('false');
  });

  it('closes on Escape', () => {
    asNarrowViewport();
    const { nav } = build(true);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(nav.dataset.open).toBe('false');
  });

  it('closes on the scrim', () => {
    asNarrowViewport();
    const { nav } = build(true);
    nav.querySelector<HTMLElement>('.rail__scrim')?.click();
    expect(nav.dataset.open).toBe('false');
  });

  it('stays open at a width where it pushes the report instead', () => {
    // Wide, the panel hides nothing, and closing it on every jump would make
    // the rail unusable for reading two sections in a row.
    const { nav } = build(true);
    nav.querySelector<HTMLAnchorElement>('.rail__link')?.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(nav.dataset.open).toBe('true');
  });

  it('stops listening for Escape once a later rail replaces it', () => {
    asNarrowViewport();
    const { nav: stale } = build(true);
    const { nav: current } = build(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    // The old rail's document listener would otherwise survive every render.
    expect(current.dataset.open).toBe('false');
    expect(stale.dataset.open).toBe('true');
  });
});

/**
 * Which link is marked, and why.
 *
 * jsdom lays nothing out, so every section reports a zero box and the rule
 * would be untestable read off the real DOM. The boxes are therefore dictated:
 * a made-up page whose sections sit where the test says they sit is exactly
 * enough to pin the rule, and the geometry of the real one is pinned in
 * `e2e/rail.spec.ts` where a browser computes it.
 */
describe('the mark that follows the reader', () => {
  /** Put each section's top edge where the test wants it. */
  function layout(body: HTMLElement, tops: Record<string, number>): void {
    for (const section of body.querySelectorAll<HTMLElement>('.section')) {
      const top = tops[section.id] ?? 10_000;
      section.getBoundingClientRect = () => ({ top }) as unknown as DOMRect;
    }
  }

  /** Let the scroll handler's frame run: the mark is never set mid-scroll. */
  async function settle(): Promise<void> {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }

  function marked(nav: HTMLElement): string | null {
    return nav.querySelector('.rail__link[aria-current="true"]')?.getAttribute('href') ?? null;
  }

  function idsOf(body: HTMLElement): string[] {
    return [...body.querySelectorAll<HTMLElement>('.section')].map((section) => section.id);
  }

  it('marks the first section on a page nobody has scrolled yet', async () => {
    // `build()` mirrors what the app does: the rail is made from a body that is
    // still detached, and only then is the pair put in the document. A box read
    // before that is all zeros, and a rule looking for the last box above the
    // line reads zero as "above" for every section at once, so the mark lands
    // on the foot of the report while the reader is at the top of it. Nothing
    // corrects it either, because a page nobody has scrolled fires no scroll.
    const { nav, body } = build();
    const ids = idsOf(body);
    layout(body, Object.fromEntries(ids.map((id, index) => [id, 200 + index * 400])));
    await settle();

    expect(marked(nav)).toBe(`#${ids[0]}`);
  });

  it('marks the section whose heading owns the top of the reading area', async () => {
    const { nav, body } = build();
    const [first, second, third] = idsOf(body);

    // The second has scrolled under the bar; the third is still below the line.
    layout(body, { [first]: -900, [second]: 40, [third]: 500 });
    window.dispatchEvent(new Event('scroll'));
    await settle();

    expect(marked(nav)).toBe(`#${second}`);
  });

  it('marks a section the reader jumped to, however short it is', async () => {
    const { nav, body } = build();
    const [first, second, third] = idsOf(body);

    // A section shorter than the reading area: the jump parks it under the bar
    // and the *next* one covers everything below. Read off any line further
    // down the viewport, the mark would land on the section below the one the
    // reader asked for — which is the bug this pins.
    layout(body, { [first]: -96, [second]: 96, [third]: 300 });
    nav.querySelector<HTMLAnchorElement>(`.rail__link[href="#${second}"]`)?.click();
    window.dispatchEvent(new Event('scroll'));
    await settle();

    expect(marked(nav)).toBe(`#${second}`);
  });

  it('marks the last section even though the page cannot scroll it up', async () => {
    const { nav, body } = build();
    const ids = idsOf(body);
    const last = ids[ids.length - 1];

    // At the foot of the document every remaining section shares one scroll
    // position, so where the reader is says nothing about what they asked for:
    // the last section never reaches the line, and only the jump names it.
    layout(body, Object.fromEntries(ids.map((id, index) => [id, index === 0 ? -900 : 400 + index])));
    nav.querySelector<HTMLAnchorElement>(`.rail__link[href="#${last}"]`)?.click();
    window.dispatchEvent(new Event('scroll'));
    await settle();

    expect(marked(nav)).toBe(`#${last}`);
  });

  it('hands the mark back to the page once the reader scrolls on', async () => {
    const { nav, body } = build();
    const [first, second, third] = idsOf(body);

    layout(body, { [first]: -96, [second]: 96, [third]: 300 });
    nav.querySelector<HTMLAnchorElement>(`.rail__link[href="#${second}"]`)?.click();
    await settle();

    // The reader carries on reading. Holding the jump any longer would freeze
    // the rail on a section that has left the screen.
    layout(body, { [first]: -700, [second]: -500, [third]: 20 });
    window.dispatchEvent(new Event('scroll'));
    await settle();

    expect(marked(nav)).toBe(`#${third}`);
  });

  it('stops marking once a later rail replaces it', async () => {
    const { nav: stale, body: staleBody } = build();
    const { nav: current, body } = build();
    const [first, second, third] = idsOf(body);

    const before = marked(stale);
    layout(staleBody, { [first]: -900, [second]: 40, [third]: 500 });
    layout(body, { [first]: -900, [second]: 40, [third]: 500 });
    window.dispatchEvent(new Event('scroll'));
    await settle();

    expect(marked(current)).toBe(`#${second}`);
    // One scroll listener per render would otherwise pile up with the renders,
    // and the old rail — laid out identically — would follow the reader too.
    expect(marked(stale), 'the replaced rail is still listening').toBe(before);
  });
});
