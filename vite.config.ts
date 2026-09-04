import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the built site works from a GitHub Pages project subpath.
  base: './',
  build: {
    target: 'es2022',
    // Everything must be inlined or locally served: no runtime network calls.
    assetsInlineLimit: 0,
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
