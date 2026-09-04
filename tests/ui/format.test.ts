import { describe, expect, it } from 'vitest';
import { Decimal } from '../../src/core/money';
import {
  formatCurrency,
  formatDate,
  formatInteger,
  formatMonth,
  formatPercent,
  formatQuantity,
  formatSignedCurrency,
  formatCompactCurrency,
  formatDeduction,
  formatSignedPercent,
} from '../../src/ui/format';
import { LANGUAGES } from '../../src/ui/i18n';

/** Non-breaking and narrow no-break spaces, which Intl inserts around units. */
const normalize = (value: string): string => value.replace(/[\u00a0\u202f]/g, ' ');

describe('formatCurrency', () => {
  it('uses the Italian convention for Italian', () => {
    // Italian groups only from five digits up (CLDR minimumGroupingDigits=2),
    // so 1234,50 carries no separator and 12.345,50 does. Both are correct.
    expect(normalize(formatCurrency('it', new Decimal('1234.5')))).toBe('1234,50 €');
    expect(normalize(formatCurrency('it', new Decimal('12345.5')))).toBe('12.345,50 €');
  });

  it('uses a native euro format for English', () => {
    expect(normalize(formatCurrency('en', new Decimal('1234.5')))).toBe('€1,234.50');
  });

  it('accepts a plain number, which is what the charts plot', () => {
    expect(normalize(formatCurrency('en', 12))).toBe('€12.00');
  });
});

describe('formatSignedCurrency', () => {
  it('marks a gain explicitly so it cannot be mistaken for a loss', () => {
    expect(normalize(formatSignedCurrency('en', new Decimal('12')))).toBe('+€12.00');
    expect(normalize(formatSignedCurrency('en', new Decimal('-12')))).toBe('-€12.00');
  });

  it('leaves zero unsigned', () => {
    expect(normalize(formatSignedCurrency('en', new Decimal('0')))).toBe('€0.00');
  });
});

describe('formatCompactCurrency', () => {
  it('abbreviates thousands and millions so a grid cell can hold the figure', () => {
    expect(normalize(formatCompactCurrency('it', new Decimal('22375.31')))).toBe('+22,4K €');
    expect(normalize(formatCompactCurrency('it', new Decimal('-19368.28')))).toBe('-19,4K €');
    expect(normalize(formatCompactCurrency('it', new Decimal('1234567')))).toBe('+1,2 Mln €');
  });

  it('follows the locale, which puts the symbol first and says M in English', () => {
    expect(normalize(formatCompactCurrency('en', new Decimal('22375.31')))).toBe('+€22.4K');
    expect(normalize(formatCompactCurrency('en', new Decimal('1234567')))).toBe('+€1.2M');
  });

  it('keeps the explicit sign of the full figure, and leaves zero unsigned', () => {
    expect(normalize(formatCompactCurrency('it', new Decimal('0')))).toBe('0 €');
  });

  it('abbreviates nothing below a thousand, but still rounds to one decimal', () => {
    expect(normalize(formatCompactCurrency('it', new Decimal('350.34')))).toBe('+350,3 €');
    expect(normalize(formatCompactCurrency('it', new Decimal('5.1')))).toBe('+5,1 €');
  });
});

describe('formatDeduction', () => {
  it('writes the positive magnitude the core stores as the subtraction it is', () => {
    // `report.fees` is a size, not a result: the engine keeps 8.00, and the
    // reader is being shown how the net profit was reached.
    expect(normalize(formatDeduction('en', new Decimal('8')))).toBe('-€8.00');
    expect(normalize(formatDeduction('it', new Decimal('13')))).toBe('-13,00 €');
  });

  it('leaves nothing taken away unsigned, never "-0.00"', () => {
    expect(normalize(formatDeduction('en', new Decimal('0')))).toBe('€0.00');
  });

  it('does not alter the magnitude it was given', () => {
    expect(normalize(formatDeduction('en', new Decimal('1234.56')))).toBe('-€1,234.56');
  });
});

describe('formatPercent', () => {
  it('renders a 0-100 figure without re-scaling it', () => {
    // The core already scaled to 0-100. Re-scaling here would be arithmetic in
    // the presentation layer, and would silently divide every rate by 100.
    expect(normalize(formatPercent('en', new Decimal('42.5')))).toBe('42.50%');
  });
});

describe('formatQuantity', () => {
  it('keeps the fractional shares a savings plan produces', () => {
    expect(formatQuantity('en', new Decimal('0.123456'))).toBe('0.123456');
  });
});

describe('formatInteger', () => {
  it('groups thousands', () => {
    expect(formatInteger('en', 12345)).toBe('12,345');
  });
});

describe('dates', () => {
  it('formats an ISO date in the reader language', () => {
    expect(formatDate('en', '2024-03-07')).toContain('2024');
    expect(formatDate('it', '2024-03-07')).toContain('2024');
  });

  it('does not shift the day across timezones', () => {
    // Parsed as UTC: a naive local parse turns 2024-03-07 into the 6th west of
    // Greenwich, which would misdate every row in the report.
    expect(formatDate('en', '2024-03-07')).toContain('7');
  });

  it('formats a month key', () => {
    expect(formatMonth('en', '2024-03')).toContain('2024');
  });

  it('returns the input unchanged when it is not a date', () => {
    expect(formatDate('en', 'not-a-date')).toBe('not-a-date');
  });
});

describe('formatSignedPercent', () => {
  it('puts a plus in front of a rise', () => {
    expect(normalize(formatSignedPercent('en', 50))).toBe('+50.00%');
  });

  it('keeps the minus on a fall', () => {
    expect(normalize(formatSignedPercent('en', -12.5))).toBe('-12.50%');
  });

  it('leaves an unchanged month unsigned', () => {
    // `exceptZero`, not `always`: a repeat of the previous month is not a rise.
    expect(normalize(formatSignedPercent('en', 0))).toBe('0.00%');
  });

  it('uses the Italian decimal comma', () => {
    expect(normalize(formatSignedPercent('it', 12.5))).toBe('+12,50%');
  });

  it('narrows to one decimal on request', () => {
    // The width a heatmap cell has room for; Tasks 4 and 6 pass this.
    expect(normalize(formatSignedPercent('en', 50, 1))).toBe('+50.0%');
  });
});

describe('the locale behind every shipped language', () => {
  it('treats the euro as the local currency, not a foreign one', () => {
    // The account is denominated in euro. A non-euro locale would mark it as
    // foreign — `en-US` prints "€12,345.50" only because the symbol is known,
    // and any locale with its own currency risks "EUR" in front of the figure.
    for (const language of LANGUAGES) {
      const formatted = normalize(formatCurrency(language, new Decimal('12345.5')));
      expect(formatted, language).toContain('€');
      expect(formatted, language).not.toContain('EUR');
    }
  });

  it('uses European Portuguese, where the euro sign follows the amount', () => {
    // `pt-BR` would put the sign first, as it does for the real, and group with
    // a full stop. This is the assertion that pins the choice of `pt-PT`.
    expect(normalize(formatCurrency('pt', new Decimal('12345.5')))).toBe('12 345,50 €');
  });

  it('names the month in the language it was asked for', () => {
    // Not spelled out for all seven: ICU wording moves between releases, and
    // these two differ from English by a whole word rather than an accent.
    expect(formatMonth('de', '2024-03')).toContain('März');
    expect(formatMonth('nl', '2024-03')).toContain('mrt');
  });
});
