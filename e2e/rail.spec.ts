/**
 * The rail marks the section the reader asked for.
 *
 * This needs a browser twice over: the mark is read off a line measured against
 * laid-out boxes, and the sections that break it are the ones whose height the
 * report decides — a short section never reaches a line further down the
 * viewport than the one its anchor lands on, and the last section can never be
 * scrolled up to any line at all. jsdom computes no heights, so the rule can be
 * pinned there but not confronted with the real report.
 *
 * Every link, not a sample: the failure this guards was six links out of
 * fourteen, and which six depends on how tall each section happens to render.
 */
import { expect, test, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const MULTI_YEAR = fileURLToPath(new URL('../tests/fixtures/multi-year.csv', import.meta.url));

async function load(page: Page): Promise<void> {
  await page.goto('/');
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /csv/i }).click();
  await (await chooser).setFiles(MULTI_YEAR);
  await expect(page.locator('#report')).toBeVisible();
}

// Two heights, because the failure this replaces had a threshold that moved
// with the viewport: sections shorter than a fraction of it went unmarked, so a
// single height proves the rule only for the sections that happen to be short
// at that height. The line the mark is read off must not depend on the height
// at all, and a laptop-sized window is where that goes wrong first.
for (const height of [900, 620]) {
  test(`every rail link marks itself when it is chosen, at ${height}px tall`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height });
    await load(page);

    const ids = await page.$$eval('.rail__link', (links) =>
      links.map((link) => (link as HTMLAnchorElement).getAttribute('href')!.slice(1)),
    );
    expect(ids.length, 'the rail rendered no links').toBeGreaterThan(5);

    const wrong: string[] = [];
    for (const id of ids) {
      await page.click(`.rail__link[href="#${id}"]`);
      const marked = await page
        .locator('.rail__link[aria-current="true"]')
        .getAttribute('href')
        .catch(() => null);
      if (marked !== `#${id}`) wrong.push(`#${id} marked ${marked}`);
    }

    expect(wrong, 'links that marked a different section').toEqual([]);
  });
}

test('the mark follows the reader once they scroll on', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await load(page);

  // Jump to the first section, then scroll far enough that a later one owns the
  // top of the reading area. Holding the jumped-to mark past that point would
  // freeze the rail on a section that has left the screen.
  const [first] = await page.$$eval('.rail__link', (links) =>
    links.map((link) => (link as HTMLAnchorElement).getAttribute('href')!),
  );
  await page.click(`.rail__link[href="${first}"]`);
  await expect(page.locator('.rail__link[aria-current="true"]')).toHaveAttribute('href', first);

  // Over the report, not the rail: the panel is its own scroller and holds an
  // `overscroll-behavior: contain`, so a wheel at the default (0,0) is eaten by
  // it and the document never moves — which reads exactly like a stuck mark.
  await page.mouse.move(900, 500);
  await page.mouse.wheel(0, 4000);
  await expect(page.locator('.rail__link[aria-current="true"]')).not.toHaveAttribute('href', first);
});
