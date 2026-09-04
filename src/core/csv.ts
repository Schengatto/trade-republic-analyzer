import Papa from 'papaparse';
import type { Operation } from './operation';

/** Export columns the engine reads. A file without them is not an export. */
const REQUIRED_COLUMNS = [
  'datetime',
  'date',
  'category',
  'type',
  'asset_class',
  'name',
  'symbol',
  'shares',
  'price',
  'amount',
  'fee',
  'tax',
] as const;

export type CsvErrorCode = 'MISSING_COLUMNS' | 'MALFORMED_ROW' | 'NO_ROWS';

/**
 * A parse failure described by position and kind only.
 *
 * The message never carries field values: a row of this export can hold the
 * account holder's name, an IBAN or a counterparty.
 */
export class CsvError extends Error {
  constructor(
    readonly code: CsvErrorCode,
    message: string,
    readonly line?: number,
    readonly missingColumns: string[] = [],
  ) {
    super(message);
    this.name = 'CsvError';
  }
}

/** Parse a Trade Republic transaction export into operations. */
export function parseOperations(text: string): Operation[] {
  const parsed = Papa.parse<Record<string, string>>(text.trim(), {
    header: true,
    skipEmptyLines: true,
  });

  const fields = parsed.meta.fields ?? [];
  const missing = REQUIRED_COLUMNS.filter((column) => !fields.includes(column));
  if (missing.length > 0) {
    throw new CsvError(
      'MISSING_COLUMNS',
      `The file is missing ${missing.length} required column(s): ${missing.join(', ')}`,
      undefined,
      missing,
    );
  }

  const failure = parsed.errors[0];
  if (failure) {
    // Papaparse row indexes are zero-based over data rows; the header is line 1.
    const line = (failure.row ?? 0) + 2;
    throw new CsvError('MALFORMED_ROW', `Row ${line} of the file could not be read`, line);
  }

  if (parsed.data.length === 0) {
    throw new CsvError('NO_ROWS', 'The file contains no operations');
  }

  return parsed.data.map(toOperation);
}

function toOperation(row: Record<string, string>): Operation {
  return {
    datetime: row['datetime'] ?? '',
    date: row['date'] ?? '',
    category: row['category'] ?? '',
    type: row['type'] ?? '',
    assetClass: row['asset_class'] ?? '',
    name: row['name'] ?? '',
    symbol: row['symbol'] ?? '',
    shares: row['shares'] ?? '',
    price: row['price'] ?? '',
    amount: row['amount'] ?? '',
    fee: row['fee'] ?? '',
    tax: row['tax'] ?? '',
  };
}
