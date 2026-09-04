import { describe, expect, it } from 'vitest';
import { ZERO, dec } from '../../src/core/money';

describe('dec', () => {
  it('parses a decimal string without binary floating point error', () => {
    expect(dec('0.1').plus(dec('0.2')).equals(dec('0.3'))).toBe(true);
  });

  it('treats an empty or blank field as zero', () => {
    expect(dec('').equals(ZERO)).toBe(true);
    expect(dec('   ').equals(ZERO)).toBe(true);
    expect(dec(undefined).equals(ZERO)).toBe(true);
  });

  it('divides with 28 significant digits, like the Python decimal default context', () => {
    // The reference engine runs on Python's default context (prec=28). Unit
    // cost is computed by division, so a narrower precision silently shifts
    // cents on the ~2000 row reference file.
    expect(dec('-100').div(dec('3')).toString()).toBe('-33.33333333333333333333333333');
  });
});
