/*
 * Calendar-day arithmetic. Both the holding-duration statistic and the
 * per-sale one need the same answer to "how many days apart are these two
 * days", and two copies of that question drift.
 *
 * The day strings are parsed as UTC midnight on purpose: subtracting local
 * times makes a day that crosses a daylight-saving change 23 or 25 hours
 * long, which rounds to the wrong number of days.
 */

export const MS_PER_DAY = 86_400_000;

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / MS_PER_DAY);
}

function toIso(year: number, month: number, day: number): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${String(year).padStart(4, '0')}-${pad(month)}-${pad(day)}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Step a YYYY-MM-DD date back, clamping to the last day of a shorter month.
 *
 * Qui e non in `analytics.ts` perché due sezioni che calcolano «tre mesi fa»
 * per conto proprio sono due sezioni che prima o poi non concordano.
 */
export function minusPeriod(iso: string, period: { days?: number; months?: number }): string {
  const [year, month, day] = iso.split('-').map(Number) as [number, number, number];
  if (period.days !== undefined) {
    const shifted = new Date(Date.UTC(year, month - 1, day) - period.days * MS_PER_DAY);
    return toIso(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
  }
  const total = year * 12 + (month - 1) - (period.months ?? 0);
  const targetYear = Math.floor(total / 12);
  const targetMonth = (total % 12) + 1;
  return toIso(targetYear, targetMonth, Math.min(day, daysInMonth(targetYear, targetMonth)));
}

export function plusOneDay(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number) as [number, number, number];
  const shifted = new Date(Date.UTC(year, month - 1, day) + MS_PER_DAY);
  return toIso(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
}
