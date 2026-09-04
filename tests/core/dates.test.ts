import { describe, expect, it } from 'vitest';

import { MS_PER_DAY, daysBetween, minusPeriod, plusOneDay } from '../../src/core/dates';

describe('daysBetween', () => {
  it('counts whole calendar days', () => {
    expect(daysBetween('2024-01-01', '2024-01-31')).toBe(30);
  });

  it('is zero for the same day', () => {
    expect(daysBetween('2024-03-15', '2024-03-15')).toBe(0);
  });

  it('crosses a leap day', () => {
    expect(daysBetween('2024-02-28', '2024-03-01')).toBe(2);
  });

  it('goes negative when the order is reversed', () => {
    expect(daysBetween('2024-05-10', '2024-05-01')).toBe(-9);
  });

  it('is not thrown off by a daylight-saving change', () => {
    // Europe/Rome springs forward on 2024-03-31: a local-time subtraction
    // would give 30.958 days and round to 31.
    expect(daysBetween('2024-03-01', '2024-04-01')).toBe(31);
  });

  it('exports the length of a day in milliseconds', () => {
    expect(MS_PER_DAY).toBe(86_400_000);
  });
});

describe('minusPeriod', () => {
  it('steps back whole months', () => {
    expect(minusPeriod('2024-06-15', { months: 3 })).toBe('2024-03-15');
  });

  it('clamps to the last day of a shorter month', () => {
    // Non esiste il 31 febbraio: un mese prima del 31 marzo è il 29.
    expect(minusPeriod('2024-03-31', { months: 1 })).toBe('2024-02-29');
  });

  it('steps back whole days across a year boundary', () => {
    expect(minusPeriod('2024-01-03', { days: 7 })).toBe('2023-12-27');
  });
});

describe('plusOneDay', () => {
  it('crosses the end of a month', () => {
    expect(plusOneDay('2024-02-29')).toBe('2024-03-01');
  });
});
