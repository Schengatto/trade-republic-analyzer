/**
 * The report fits on the paper it is printed on.
 *
 * "Print or save as PDF" is the only way a reader takes this report out of the
 * browser, and paper has no scrollbar: whatever sticks out past the page box is
 * gone, silently. Two different failures produce that, and they need separate
 * assertions because each one hides the other's symptom.
 *
 *   - An element wider than the page pushes past the edge and is cut by the
 *     paper. The document reports the overflow, so measuring the report's own
 *     boxes against the printable width finds it.
 *   - An element inside a *scroller* never widens the document at all: the
 *     scroller clips it and the page measures clean. On screen that is correct
 *     and deliberate — the month grid is meant to scroll inside its own box —
 *     but on paper a scroller is just a mask, and the columns behind it do not
 *     exist. `.table-scroll` is unwrapped for print; `.heatmap-scroll` was not,
 *     so the grid printed cut at "Sept": the year-totals column and the grand
 *     total were missing, and a year whose months all fall after September —
 *     the 2024 half of turn-of-year.csv — printed as an entirely empty row.
 *
 * Why a viewport rather than `page.pdf()`: the PDF is a container format, and
 * asserting that a number is absent from it means parsing it. Chrome lays print
 * media out against the page box, so a viewport set to the printable width and
 * `emulateMedia({ media: 'print' })` puts the same boxes in the same places, and
 * the failure names the element instead of a missing string.
 *
 * The details are opened by hand because `emulateMedia` does not fire
 * `beforeprint`, and it is that listener which opens them for a real print. A
 * closed `<details>` renders no contents and would take every table out of
 * scope — the widest things in the report.
 */
import { expect, test, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const FIXTURE = fileURLToPath(new URL('../tests/fixtures/full-coverage.csv', import.meta.url));
const TURN_OF_YEAR = fileURLToPath(new URL('../tests/fixtures/turn-of-year.csv', import.meta.url));

/**
 * A4 is 210mm wide and print.css asks for a 14mm side margin, leaving 182mm.
 * CSS resolves physical units at 96dpi regardless of the printer.
 */
const PRINTABLE = Math.floor((182 / 25.4) * 96);

async function loadForPrint(
  page: Page,
  fixture: string,
  // Ciò che il lettore fa a schermo prima di stampare. Va eseguito qui, prima
  // di `emulateMedia`: i controlli su carta non hanno un box e non si possono
  // più cliccare.
  prepare?: (page: Page) => Promise<void>,
): Promise<void> {
  await page.setViewportSize({ width: PRINTABLE, height: 1000 });
  await page.goto('/');
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /csv/i }).click();
  await (await chooser).setFiles(fixture);
  await expect(page.locator('#report')).toBeVisible();
  await page.evaluate(() => {
    for (const details of document.querySelectorAll('details')) details.open = true;
  });
  if (prepare) await prepare(page);
  await page.emulateMedia({ media: 'print' });
}

/**
 * Every `#report table` measured against the box it prints in, named with the
 * overshoot so a failure is a fix rather than an investigation.
 */
async function tablesWiderThanTheirFrame(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll('#report table')]
      .map((table) => {
        const frame = table.parentElement;
        if (!frame) return null;
        const width = table.getBoundingClientRect().width;
        // `clientWidth` is the frame's content box: what the table is
        // actually offered, once any border and padding are paid for.
        const offered = frame.clientWidth;
        if (width <= offered + 0.5) return null;
        const first = table.className.toString().trim().split(/\s+/)[0] ?? '';
        return `table.${first} is ${Math.round(width - offered)}px wider than its frame`;
      })
      .filter((entry) => entry !== null),
  );
}

for (const [name, fixture] of [
  ['a full year', FIXTURE],
  ['two partial years', TURN_OF_YEAR],
] as const) {
  test(`nothing runs off the page when printing ${name}`, async ({ page }) => {
    await loadForPrint(page, fixture);

    const offenders = await page.evaluate((limit) => {
      // Deduplicated by tag and first class: one wide table reports itself
      // once instead of once per row, so the failure names the fix.
      const seen: string[] = [];
      for (const node of document.querySelectorAll('#report *')) {
        const box = node.getBoundingClientRect();
        if (box.width === 0 || box.right <= limit + 0.5) continue;
        const first = node.className.toString().trim().split(/\s+/)[0] ?? '';
        const label = `${node.tagName.toLowerCase()}${first ? `.${first}` : ''}`;
        if (!seen.includes(label)) seen.push(label);
      }
      return seen.slice(0, 8);
    }, PRINTABLE);

    expect(offenders, `elements wider than the ${PRINTABLE}px printable width`).toEqual([]);
  });

  /**
   * The page-width assertion above is the last line, not the first: a table
   * overflows the frame it sits in long before it reaches the paper's edge, and
   * in between it is already eating the margin. The closed-positions table
   * cleared the page by 0.4px while standing 16.6px outside its own frame —
   * close enough that CI's wider fallback monospace, which has no ui-monospace
   * to pick, pushed it over and the same build failed on Linux and passed on
   * Windows. A table is `width: 100%`; one wider than its box is a bug whatever
   * the font, so measure it there, where the slack is honest.
   */
  test(`no table outgrows its own frame when printing ${name}`, async ({ page }) => {
    await loadForPrint(page, fixture);

    expect(
      await tablesWiderThanTheirFrame(page),
      'tables wider than the box they print in',
    ).toEqual([]);
  });

  /**
   * The same measurement under a font the reader might actually be given.
   *
   * The check above runs in whatever face this machine resolves `ui-monospace`
   * to, and that is exactly how the Linux/Windows split happened: the widths
   * here are font-metric dependent, so a table can sit comfortably inside its
   * frame on the developer's box and outside it on CI's. Forcing a known-wide
   * face makes the platform irrelevant — if the layout survives Courier New it
   * survives whatever fallback the printer's machine reaches for.
   *
   * This is the assertion form of a claim that was previously only checked by
   * hand and written into a commit message. It is a stress test, not a
   * prediction: no reader prints in Courier, and the headroom it proves is the
   * margin the real faces are drawing on.
   */
  test(`no table outgrows its own frame in forced monospace when printing ${name}`, async ({
    page,
  }) => {
    await loadForPrint(page, fixture);
    await page.addStyleTag({
      content: `.data-table, .data-table th, .data-table td {
        font-family: 'Courier New', monospace !important;
      }`,
    });

    expect(
      await tablesWiderThanTheirFrame(page),
      'tables wider than the box they print in, under a forced monospace face',
    ).toEqual([]);
  });
}

/**
 * The clipping half. Written against turn-of-year.csv because that is where a
 * cut grid is worst: 2024 holds only November and December, so everything the
 * row has to say sits in the part that was being masked, and the printed row
 * came out blank rather than obviously truncated.
 */
test('the month grid prints whole, not masked by its scroller', async ({ page }) => {
  await loadForPrint(page, TURN_OF_YEAR);

  const grid = await page.locator('#monthly .heatmap-scroll').first().evaluate((node) => ({
    scrollWidth: node.scrollWidth,
    clientWidth: node.clientWidth,
  }));
  expect(
    grid.scrollWidth,
    'the grid is wider than its box on paper, so the columns past the edge are masked away',
  ).toBeLessThanOrEqual(grid.clientWidth);

  // The two figures the mask took first, named so a regression is unambiguous.
  // Measured against the grid itself, not the scroller wrapped around it. The
  // two edges coincide today, which is exactly why the looser one was easy to
  // reach for — but the scroller's *border* box is an outer container, and any
  // padding or border it gained would buy the cell room the grid does not
  // have. The table's content box is where the last column actually has to
  // land, so it is the edge that stays honest.
  const totals = await page.locator('#monthly .heatmap__total--grand').first().evaluate((node) => {
    const table = node.closest('table')!;
    const style = getComputedStyle(table);
    const rect = table.getBoundingClientRect();
    return {
      cellRight: node.getBoundingClientRect().right,
      gridRight:
        rect.right - parseFloat(style.borderRightWidth) - parseFloat(style.paddingRight),
      text: node.textContent ?? '',
    };
  });
  expect(totals.text, 'the grand total must still be printed').not.toBe('');
  expect(totals.cellRight, 'the grand total is outside the printed grid').toBeLessThanOrEqual(
    totals.gridRight + 0.5,
  );

  // The row that went blank: 2024 contributed +€40 in November, and that
  // figure has to survive onto the paper.
  const cells = await page
    .locator('#monthly .heatmap tbody tr')
    .first()
    .evaluate((row) =>
      [...row.querySelectorAll('td')]
        .map((cell) => cell.textContent?.trim() ?? '')
        .filter((text) => text !== ''),
    );
  expect(cells.join(' '), 'the 2024 row printed empty').toContain('40');
});

/**
 * La card Performance è la sola governata da due campi che su carta non
 * esistono: se sparissero senza lasciare la riga che nomina l'intervallo, il
 * gauge e le tre cifre parlerebbero di un periodo che la pagina non dichiara.
 */
test('the printed performance card names its period, without the fields it came from', async ({
  page,
}) => {
  await loadForPrint(page, FIXTURE);

  const fields = page.locator('#performance .control__date');
  await expect(fields).toHaveCount(2);
  await expect(fields.first()).toBeHidden();
  await expect(fields.last()).toBeHidden();
  await expect(page.locator('#performance .performance__range')).toBeVisible();
});

/**
 * Stessa ragione della casella «al netto»: su carta sparisce con gli altri
 * controlli, e con essa l'unica cosa che dice se le cifre sono al lordo o al
 * netto degli oneri. A dichiararlo resta la nota in cima alla card, che copre
 * anche la tabella delle sei finestre — l'unica parte che la stampa porta con
 * sé per intero.
 */
test('the printed performance card declares the basis the reader chose', async ({ page }) => {
  const noteText = page.locator('#performance > .note');
  let net = '';

  await loadForPrint(page, FIXTURE, async (screen) => {
    const gross = await noteText.textContent();
    await screen.locator('#performance-net').check();
    // La nota deve essere davvero cambiata: se la casella non riscrivesse
    // niente, l'assertion di sotto passerebbe sulla frase del lordo.
    await expect(noteText).not.toHaveText(gross ?? '');
    net = (await noteText.textContent()) ?? '';
  });

  await expect(page.locator('#performance-net')).toBeHidden();
  await expect(noteText).toBeVisible();
  await expect(noteText).toHaveText(net);
});

/*
 * E quanto è stato tolto. La nota dice che gli oneri sono stati sottratti; su
 * carta questa riga è la sola che ne dice la cifra, perché il lettore non ha
 * più la casella da spegnere per vedere la differenza.
 */
test('the printed performance card states how much it withheld', async ({ page }) => {
  const withheld = page.locator('#performance .performance__withheld');
  let stated = '';

  await loadForPrint(page, FIXTURE, async (screen) => {
    // Sul lordo non c'è niente da dichiarare, e la riga non deve occupare una
    // carta già stretta: se fosse sempre presente l'assertion di sotto
    // passerebbe su una riga vuota.
    await expect(withheld).toBeHidden();
    await screen.locator('#performance-net').check();
    await expect(withheld).toBeVisible();
    stated = (await withheld.textContent()) ?? '';
  });

  // Che sia una sottrazione lo fissa il test jsdom, sulla stringa intera: qui
  // il simbolo può precedere le cifre e il segno cambia glifo con la lingua,
  // quindi si chiede solo che una cifra ci sia — la riga non è un'etichetta
  // vuota — e che la carta la porti con sé identica.
  expect(stated).toMatch(/\d/);
  await expect(withheld).toBeVisible();
  await expect(withheld).toHaveText(stated);
});
