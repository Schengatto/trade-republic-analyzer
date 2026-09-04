/**
 * The section index, as a rail down the side of the report.
 *
 * It is built by reading the sections that actually rendered, exactly as the
 * horizontal outline it replaces did: a section may decline to render, and a
 * hand-kept list would then point at an anchor that is not there.
 *
 * Collapsed it is a column of glyphs, and each label is one hover away. The
 * label is not a second copy of the title for the tooltip to show — it is the
 * same `.rail__text` node, moved by CSS. One string, so they cannot disagree,
 * and a screen reader reads the section's name in either state.
 *
 * Toggling never re-renders the report. Rebuilding would throw away the
 * reader's scroll position, which is the one thing an index exists to protect.
 */

import { el } from './dom';
import { chevronIcon, sectionIcon } from './icons';
import type { translatorFor } from './i18n';

type Translate = ReturnType<typeof translatorFor>;

/** Below this width the rail floats over the report instead of pushing it. */
const OVERLAY_QUERY = '(max-width: 700px)';

export interface RailOptions {
  /** The remembered state; the rail opens in it rather than animating into it. */
  open: boolean;
  /** Called when the reader toggles, so the choice can be persisted. */
  onToggle(open: boolean): void;
}

/**
 * Listeners and observers from the rail built last.
 *
 * A render replaces the whole tree, so anything bound to `document` or
 * observing the old sections would otherwise pile up one copy per render.
 */
let teardown: (() => void)[] = [];

export function rail(body: HTMLElement, t: Translate, options: RailOptions): HTMLElement | false {
  for (const undo of teardown) undo();
  teardown = [];

  const sections = [...body.querySelectorAll<HTMLElement>('.section')].filter(
    (section) => section.id !== '',
  );
  if (sections.length === 0) return false;

  let open = options.open;

  const toggle = el(
    'button',
    { type: 'button', class: 'rail__toggle', 'aria-expanded': String(open) },
    // A button named "Sezioni" carrying aria-expanded is the whole disclosure
    // pattern: the state is announced, so no label has to describe it in words
    // that then have to be translated and kept in step.
    [chevronIcon(), el('span', { class: 'rail__text' }, [t('nav.outline')])],
  );

  const links = new Map<string, HTMLAnchorElement>();
  const list = el('ul', { class: 'rail__list' });

  for (const section of sections) {
    const title = section.querySelector('.section__title')?.textContent ?? section.id;
    const link = el('a', { class: 'rail__link', href: `#${section.id}` }, [
      sectionIcon(section.id),
      el('span', { class: 'rail__text' }, [title]),
    ]);
    links.set(section.id, link);
    trackTip(link);
    list.append(el('li', { class: 'rail__item' }, [link]));
  }

  trackTip(toggle);

  const scrim = el('div', { class: 'rail__scrim' });
  const nav = el(
    'nav',
    { class: 'rail no-print', 'aria-label': t('nav.outline.label'), 'data-open': String(open) },
    [scrim, el('div', { class: 'rail__panel' }, [toggle, list])],
  );

  const media = typeof window.matchMedia === 'function' ? window.matchMedia(OVERLAY_QUERY) : null;
  const isOverlay = (): boolean => media?.matches ?? false;

  function setOpen(next: boolean): void {
    if (next === open) return;
    open = next;
    nav.dataset.open = String(open);
    toggle.setAttribute('aria-expanded', String(open));
    options.onToggle(open);
  }

  toggle.addEventListener('click', () => setOpen(!open));

  // Dismissal, for the width where the panel covers what it is an index to.
  scrim.addEventListener('click', () => setOpen(false));
  list.addEventListener('click', (event) => {
    if (isOverlay() && (event.target as Element).closest('.rail__link')) setOpen(false);
  });

  const onKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || !open || !isOverlay()) return;
    setOpen(false);
    toggle.focus();
  };
  document.addEventListener('keydown', onKeydown);
  teardown.push(() => document.removeEventListener('keydown', onKeydown));

  markActive(sections, links);

  return nav;
}

/**
 * Keep a collapsed row's tooltip level with the row.
 *
 * The tooltip is positioned from script rather than laid out beside its row
 * because the panel scrolls once the viewport is shorter than fifteen rows, and
 * a scroll container clips anything that reaches past its edge. Measuring on
 * hover rather than up front is what keeps it correct after that scroll.
 */
function trackTip(row: HTMLElement): void {
  const tip = row.querySelector<HTMLElement>('.rail__text');
  if (!tip) return;

  const place = (): void => {
    const box = row.getBoundingClientRect();
    tip.style.top = `${box.top + box.height / 2}px`;
  };

  row.addEventListener('pointerenter', place);
  row.addEventListener('focus', place);
}

/**
 * Where the reading area starts, and so where the mark is read off.
 *
 * `.section` carries `scroll-margin-top: 96px`, which is what an anchor jump
 * clears the sticky bar with. The mark has to be taken from that same line or
 * the two disagree: read off a band further down the viewport, a section
 * shorter than the distance to it never covers the line it was just scrolled
 * to, and the mark lands on the section below the one the reader asked for.
 * The extra pixel absorbs a fractional scroll offset.
 */
const PROBE = 97;

/**
 * Mark the section the reader is looking at, or asked to be taken to.
 *
 * Two things can say which section that is, and they are not the same thing.
 * Scrolling is answered by position: the section whose heading last passed
 * under the bar is the one being read. A jump is answered by the jump — and it
 * has to be, because at the foot of the document every remaining section shares
 * one scroll position, so the last few sections are indistinguishable by
 * position however the line is drawn. The jump is therefore held until the
 * reader moves the page themselves, and position takes over from there.
 */
function markActive(sections: HTMLElement[], links: Map<string, HTMLAnchorElement>): void {
  /** The section a jump was asked for, and where the jump left it. */
  let jumped: { section: HTMLElement; top: number | null } | null = null;
  let frame = 0;

  const mark = (id: string): void => {
    for (const [other, link] of links) {
      if (other === id) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
  };

  /** The last section whose heading has reached the top of the reading area. */
  const underProbe = (): HTMLElement => {
    let owner = sections[0];
    for (const section of sections) {
      if (section.getBoundingClientRect().top > PROBE) break;
      owner = section;
    }
    return owner;
  };

  const update = (): void => {
    if (jumped) {
      // `null` while the browser has yet to perform the jump; once it has, the
      // page standing still means the reader is still where they asked to be.
      const settled = jumped.top;
      if (settled === null || Math.abs(jumped.section.getBoundingClientRect().top - settled) <= 1) {
        mark(jumped.section.id);
        return;
      }
      jumped = null;
    }
    mark(underProbe().id);
  };

  for (const section of sections) {
    links.get(section.id)?.addEventListener('click', () => {
      jumped = { section, top: null };
      mark(section.id);
      // The browser scrolls after this handler returns, so where the jump
      // actually landed can only be measured on the next frame — and for a
      // section at the end of the document that is nowhere near the line.
      requestAnimationFrame(() => {
        if (jumped?.section === section) jumped.top = section.getBoundingClientRect().top;
      });
    });
  }

  // One measurement per frame at most: a scroll fires far faster than the mark
  // can meaningfully change, and reading a box forces layout.
  const onScroll = (): void => {
    if (frame !== 0) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      update();
    });
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  teardown.push(() => {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onScroll);
    if (frame !== 0) cancelAnimationFrame(frame);
  });

  // The first mark waits a frame, and has to. The rail is built from a body
  // that is not in the document yet, where every box reads zero, and zero is
  // above the line: measured there, every section looks scrolled past and the
  // last one wins the mark while the reader is looking at the first. Deferring
  // through the scroll scheduler puts the measurement after the append, and
  // borrows its teardown, so a rail thrown away in the same frame never marks.
  onScroll();
}
