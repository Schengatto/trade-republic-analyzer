/**
 * Regenerates the images in `docs/screenshots/` from `tests/fixtures/demo-account.csv`.
 *
 * The README shows a report, so the README can go stale in a way no test would
 * notice: a restyled chart or a renamed heading leaves the old picture sitting
 * there looking authoritative. Running this script is how the pictures are
 * brought back in line, and it is the only way they are ever produced. Nothing
 * here is hand-edited afterwards.
 *
 *   npm run build && node scripts/capture-demo.mjs
 *
 * `dist/` has to exist first, because this drives the built site through `vite
 * preview` rather than the dev server: what a reader sees on GitHub Pages is
 * the build, and a screenshot of the dev server can differ from it.
 *
 * The animation is a plain scroll down the report at a readable speed. GIF is
 * the format because it is the only animated one GitHub renders inline in a
 * README; a .webm would degrade to a link.
 *
 * That format is also why the file is as big as it is. Every frame is written
 * in full, so the size is close to frame count times frame area, and the
 * current settings land at about 1.9 MB. Frame count is the knob to reach for
 * first: dropping it costs smoothness in a scroll, which is the least of what
 * this animation has to convey. Shrinking the viewport is the knob to reach
 * for last, because the layout the reader sees is the point of the picture.
 */

import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
// gifenc ships as CommonJS, so its exports arrive on the default binding.
import gifenc from 'gifenc';
import { PNG } from 'pngjs';

const { GIFEncoder, applyPalette, quantize } = gifenc;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs', 'screenshots');
const FIXTURE = join(ROOT, 'tests', 'fixtures', 'demo-account.csv');
/**
 * A port the operating system says is free, asked for at the moment of use.
 *
 * This machine runs several checkouts of this project at once, so a fixed
 * number is a coin toss: it is either free or it belongs to a sibling session,
 * and `--strictPort` (kept, deliberately) turns the second case into a crash.
 */
async function freePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.on('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

let BASE = '';

/** Still screenshots: wide enough for the desktop layout the README shows. */
const STILL = { width: 1280, height: 1080 };

/**
 * The animation is deliberately smaller than the stills. Every pixel of it is
 * paid for 150 times over, once per frame, and a README image is displayed at
 * about 900px wide anyway.
 */
const FILM = { width: 900, height: 600 };
const FRAMES = 80;
const FRAME_MS = 135;
/** Frames held still at the top and at the bottom, so the loop is readable. */
const HOLD = 8;
/** GIF palettes are powers of two. The UI is flat colour, so 64 is plenty. */
const PALETTE_SIZE = 64;

async function main() {
  mkdirSync(OUT, { recursive: true });
  const port = await freePort();
  BASE = `http://localhost:${port}/`;
  const server = await startPreview(port);
  const browser = await chromium.launch();
  try {
    await still(browser, 'light');
    await still(browser, 'dark');
    await film(browser);
  } finally {
    await browser.close();
    server.kill();
  }
}

/**
 * Serve the build the same way the e2e suite does, on its own port.
 *
 * Vite's own entry point rather than `npx`: Node refuses to spawn a `.cmd`
 * without a shell on Windows, and going through a shell to reach a script that
 * is already sitting in `node_modules` buys nothing.
 */
function startPreview(port) {
  const server = spawn(
    process.execPath,
    [join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js'), 'preview', '--port', String(port), '--strictPort'],
    { cwd: ROOT, stdio: ['ignore', 'pipe', 'inherit'] },
  );
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`vite preview did not start on ${port}`)), 30_000);
    server.stdout.on('data', (chunk) => {
      if (String(chunk).includes(String(port))) {
        clearTimeout(timer);
        resolve(server);
      }
    });
    server.on('exit', (code) => reject(new Error(`vite preview exited with ${code}`)));
  });
}

/**
 * Open the report with the demo file loaded.
 *
 * Language and theme are seeded into storage before the first script runs,
 * rather than clicked afterwards: clicking rebuilds the report, and a capture
 * that starts mid-rebuild catches a half-drawn page.
 */
async function openReport(browser, { theme, width, height }) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    // The report prints dates and amounts through Intl, so the locale is part
    // of what the picture shows.
    locale: 'en-IE',
    timezoneId: 'Europe/Rome',
    reducedMotion: 'reduce',
  });
  await context.addInitScript(
    ([chosen]) => {
      window.localStorage.setItem('tra.language', 'en');
      window.localStorage.setItem('tra.theme', chosen);
      window.localStorage.setItem('tra.rail', 'closed');
    },
    [theme],
  );
  const page = await context.newPage();
  await page.goto(BASE);

  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /csv/i }).click();
  await (await chooser).setFiles(FIXTURE);
  await page.locator('#summary').waitFor();
  await page.locator('#limits').waitFor();
  // The charts draw from a rAF; without this the first frames catch bare axes.
  await page.waitForTimeout(600);
  return { context, page };
}

async function still(browser, theme) {
  const { context, page } = await openReport(browser, { theme, ...STILL });
  await page.screenshot({ path: join(OUT, `report-${theme}.png`) });
  await context.close();
  console.log(`docs/screenshots/report-${theme}.png`);
}

async function film(browser) {
  const { context, page } = await openReport(browser, { theme: 'light', ...FILM });

  const distance = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight,
  );
  const moving = FRAMES - HOLD * 2;
  const encoder = GIFEncoder();

  for (let i = 0; i < FRAMES; i += 1) {
    const step = Math.min(Math.max(i - HOLD, 0), moving);
    await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), (distance * step) / moving);
    const { data, width, height } = PNG.sync.read(await page.screenshot({ type: 'png' }));
    // quantize() wants one palette for the whole animation to stay small, but a
    // per-frame palette costs 3 bytes a colour and keeps the gradients honest.
    const palette = quantize(data, PALETTE_SIZE, { format: 'rgb565' });
    encoder.writeFrame(applyPalette(data, palette, 'rgb565'), width, height, {
      palette,
      delay: FRAME_MS,
    });
    if (i % 25 === 0) process.stdout.write(`  frame ${i}/${FRAMES}\r`);
  }

  encoder.finish();
  writeFileSync(join(OUT, 'report.gif'), encoder.bytes());
  await context.close();
  console.log(`docs/screenshots/report.gif (${FRAMES} frames)`);
}

await main();
