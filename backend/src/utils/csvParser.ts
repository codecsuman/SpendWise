// ============================================================================
// CSV parser
//
// A CSV file is not "split by comma and newline". A quoted cell may contain
// both characters, so we walk the text one character at a time and keep a
// small state machine:
//
//   - inside quotes  -> every character except "" is literal text
//   - ""             -> one literal double quote
//   - outside quotes -> comma ends a cell, \r\n or \n ends a row
//
// The parser only understands the format. It does not know about money,
// categories or transactions — that is the service's job.
// ============================================================================

import { AppError } from './AppError.js';

// AGENTS.md §5.8: a single import may not exceed 5,000 rows.
export const MAX_CSV_ROWS = 5000;

// A transactions CSV needs a handful of columns. This stops a hostile file
// from creating a header row with thousands of cells.
const MAX_CSV_COLUMNS = 50;

export interface CsvRow {
  /** 1-based line in the original file, so errors can point at the real row. */
  line: number;
  /** Cell values in the same order as `headers`. */
  values: string[];
}

export interface ParsedCsv {
  headers: string[];
  rows: CsvRow[];
}

// "  Amount " and "amount" are the same column to a human. One normaliser is
// used by the parser (duplicate check) and later by the service (lookup).
export function normaliseHeader(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function validateHeaders(cells: string[]): void {
  if (cells.length > MAX_CSV_COLUMNS) {
    throw new AppError(
      `The CSV file has more than ${MAX_CSV_COLUMNS} columns`,
      400
    );
  }

  const seen = new Set<string>();

  cells.forEach((cell, index) => {
    const name = normaliseHeader(cell);

    if (!name) {
      throw new AppError(`Column ${index + 1} has an empty header`, 400);
    }

    if (seen.has(name)) {
      throw new AppError(
        `Duplicate column "${cell.trim()}" in the header row`,
        400
      );
    }

    seen.add(name);
  });
}

export function parseCsv(input: string): ParsedCsv {
  // Excel writes a UTF-8 BOM (\uFEFF) before the first header. If it stays,
  // the first header becomes "\uFEFFDate" and never matches "date".
  const text = input.replace(/^\uFEFF/, '');

  if (!text.trim()) {
    throw new AppError('The CSV file is empty', 400);
  }

  const headers: string[] = [];
  const rows: CsvRow[] = [];

  let field = '';
  let record: string[] = [];
  let inQuotes = false;
  let recordLine = 1;
  let currentLine = 1;

  const finishField = (): void => {
    record.push(field);
    field = '';
  };

  const finishRecord = (): void => {
    finishField();

    // Blank lines (trailing newline, empty block in the middle) are noise.
    const isBlank = record.length === 1 && record[0].trim() === '';

    if (!isBlank) {
      if (headers.length === 0) {
        validateHeaders(record);
        headers.push(...record.map((cell) => cell.trim()));
      } else {
        if (rows.length >= MAX_CSV_ROWS) {
          throw new AppError(
            `The CSV file has more than ${MAX_CSV_ROWS} rows`,
            400
          );
        }

        rows.push({ line: recordLine, values: record });
      }
    }

    record = [];
  };

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        // Two quotes in a row are an escaped quote, still inside the cell.
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
        continue;
      }

      // A newline inside quotes is part of the cell, but it still moves the
      // physical line counter so later errors report the right number.
      if (char === '\n') {
        currentLine += 1;
      }

      field += char;
      continue;
    }

    if (char === '"') {
      if (field.length === 0) {
        inQuotes = true;
      } else {
        // Lenient: a stray quote inside an unquoted cell is kept as text.
        field += char;
      }
      continue;
    }

    if (char === ',') {
      finishField();
      continue;
    }

    if (char === '\r' || char === '\n') {
      // Windows files end a row with \r\n; treat it as one terminator.
      if (char === '\r' && text[i + 1] === '\n') {
        i += 1;
      }

      finishRecord();
      currentLine += 1;
      recordLine = currentLine;
      continue;
    }

    field += char;
  }

  if (inQuotes) {
    throw new AppError(`Unclosed quote starting on line ${recordLine}`, 400);
  }

  // The last row has no terminator when the file does not end with a newline.
  if (field.length > 0 || record.length > 0) {
    finishRecord();
  }

  if (headers.length === 0) {
    throw new AppError('The CSV file has no header row', 400);
  }

  if (rows.length === 0) {
    throw new AppError('The CSV file has no data rows', 400);
  }

  return { headers, rows };
}
