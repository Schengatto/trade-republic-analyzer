/**
 * End-to-end configuration.
 *
 * There is exactly one thing worth driving a real browser for in this project:
 * the promise that the built page never calls out. `vite preview` serves the
 * same `dist/` that GitHub Pages does, so what the test observes is what a
 * reader would see in their own Network tab.
 *
 * `dist/` must exist first — `npm run build` before `npm run test:e2e`.
 */

import { defineConfig, devices } from '@playwright/test';

// Not Vite's default 4173: reusing a stranger's server that happens to hold
// that port would turn this suite into a green test of somebody else's app.
// Overridable because this machine runs several checkouts at once, and a busy
// port is a hard failure by design (`--strictPort`) rather than a silent reuse.
const PORT = Number(process.env.E2E_PORT ?? 4188);
const BASE_URL = `http://localhost:${PORT}/`;

export default defineConfig({
  testDir: 'e2e',
  // The request counting is global to the page: a second worker racing on the
  // same preview server would not corrupt it, but a flake here must mean a
  // real request, so nothing runs concurrently.
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  // A retry would hide exactly the intermittent third-party call this suite
  // exists to catch.
  retries: 0,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npx vite preview --port ${PORT} --strictPort`,
    url: BASE_URL,
    // Never reuse: the one thing this suite must be certain of is which build
    // it is looking at. `--strictPort` turns a busy port into a loud failure.
    reuseExistingServer: false,
    stdout: 'ignore',
  },
});
