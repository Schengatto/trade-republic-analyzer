import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', '.local/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    // The calculation core must stay free of DOM and browser globals.
    files: ['src/core/**/*.ts'],
    languageOptions: {
      globals: {},
    },
  },
  {
    // Build scripts are plain Node, so `no-undef` is live for them where the
    // TypeScript config switches it off.
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
      },
    },
  },
  {
    // The capture script is Node, but it hands closures to Playwright, which
    // serializes them and runs them inside the page. Those bodies are browser
    // code sitting in a Node file, and the globals they reach for exist there
    // and nowhere else in `scripts/`, which is why this override is one file
    // wide rather than folded into the one above.
    files: ['scripts/capture-demo.mjs'],
    languageOptions: {
      globals: { document: 'readonly', window: 'readonly' },
    },
  },
);
