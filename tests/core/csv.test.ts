import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CsvError, parseOperations } from '../../src/core/csv';
import { calculate } from '../../src/core/fifo';
import { reconcile } from '../../src/core/reconcile';

const FULL_COVERAGE = readFileSync(
  new URL('../fixtures/full-coverage.csv', import.meta.url),
  'utf8',
);

const HEADER =
  '"datetime","date","account_type","category","type","asset_class","name","symbol",' +
  '"shares","price","amount","fee","tax","currency","original_amount","original_currency",' +
  '"fx_rate","description","transaction_id","counterparty_name","counterparty_iban",' +
  '"payment_reference","mcc_code"';

/**
 * Every operation type present in the real export. The fixture is modelled on
 * that file's structure — the real file itself never enters the repository.
 */
const TYPES_IN_THE_REAL_EXPORT = [
  'BUY',
  'SELL',
  'CARD_TRANSACTION',
  'INTEREST_PAYMENT',
  'MIGRATION',
  'TRANSFER_INSTANT_INBOUND',
  'TAX_OPTIMIZATION',
  'DIVIDEND',
  'CARD_TRANSACTION_INTERNATIONAL',
  'BENEFITS_SAVEBACK',
  'CUSTOMER_INBOUND',
  'CUSTOMER_OUTBOUND_REQUEST',
  'CARD_ORDERING_FEE',
  'BONUS_ISSUE',
  'TRANSFER_INSTANT_OUTBOUND',
  'TRANSFER_INBOUND',
  'BONUS_ISSUE_CANCELLED',
  'TRANSFER_OUTBOUND',
  'MANUAL_CASH_TRANSFER',
];

describe('parseOperations', () => {
  it('normalizes the export columns into operations', () => {
    const operations = parseOperations(FULL_COVERAGE);
    expect(operations).toHaveLength(27);
    expect(operations[1]).toMatchObject({
      datetime: '2024-01-02T10:00:00.000Z',
      date: '2024-01-02',
      category: 'TRADING',
      type: 'BUY',
      assetClass: 'STOCK',
      symbol: 'TT0000000001',
      shares: '10.0000000000',
      amount: '-100.00',
      fee: '-1.00',
      tax: '',
    });
  });

  it('keeps quoted fields that contain commas and quotes intact', () => {
    const operations = parseOperations(FULL_COVERAGE);
    expect(operations[1]!.name).toBe('Alpha Industries, Inc.');
    expect(operations[12]!.name).toBe('Gamma "Growth" Corp');
  });

  it('covers every operation type the real export contains', () => {
    // A type the fixture does not exercise is a type CI cannot protect.
    const types = new Set(parseOperations(FULL_COVERAGE).map((o) => o.type));
    expect([...types].sort()).toEqual([...TYPES_IN_THE_REAL_EXPORT].sort());
  });

  it('carries all three timestamp formats the real export mixes', () => {
    // The engine sorts these as strings, as the reference implementation does.
    // A fixture with one format would never exercise that.
    const operations = parseOperations(FULL_COVERAGE);
    const shapes = new Set(operations.map((o) => o.datetime.replace(/[0-9]/g, '9')));
    expect(shapes).toEqual(
      new Set([
        '9999-99-99T99:99:99.999Z',
        '9999-99-99T99:99:99.999999Z',
        '9999-99-99T99:99:99Z',
      ]),
    );
  });

  it('carries an order split across two rows sharing one timestamp', () => {
    const operations = parseOperations(FULL_COVERAGE);
    const sameStamp = operations.filter((o) => o.datetime === '2024-02-01T11:00:00.000Z');
    expect(sameStamp).toHaveLength(2);
    expect(sameStamp.every((o) => o.type === 'SELL')).toBe(true);
  });

  it('rejects a file that is missing required columns, naming them', () => {
    const text = '"datetime","date","type"\n"2024-01-01T00:00:00Z","2024-01-01","BUY"';
    expect(() => parseOperations(text)).toThrow(CsvError);
    try {
      parseOperations(text);
    } catch (error) {
      expect((error as CsvError).missingColumns).toContain('amount');
      expect((error as CsvError).missingColumns).toContain('asset_class');
    }
  });

  it('reports a malformed row by line number without echoing its content', () => {
    const text = `${HEADER}\n"2024-01-01T00:00:00Z","2024-01-01"`;
    try {
      parseOperations(text);
      expect.unreachable('expected a CsvError');
    } catch (error) {
      expect(error).toBeInstanceOf(CsvError);
      // The row may hold a name or an IBAN: the message must never carry it.
      expect((error as CsvError).line).toBe(2);
      expect((error as CsvError).message).not.toContain('2024-01-01');
    }
  });

  it('rejects a file with no data rows', () => {
    expect(() => parseOperations(HEADER)).toThrow(CsvError);
  });

  it('produces a fixture that reconciles to zero end to end', () => {
    const operations = parseOperations(FULL_COVERAGE);
    const report = calculate(operations);
    expect(report.operationsRead).toBe(27);
    expect(report.unclassified.count).toBe(0);
    expect(reconcile(operations, report).difference.toFixed(2)).toBe('0.00');
  });
});
