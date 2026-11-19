// ============================================================================
// CSV import service
//
// utils/csvParser.ts only knows CSV *syntax* (quotes, commas, newlines).
// This file decides what the cells *mean*:
//
//   1. find the header the user mapped to each field
//   2. read each row into a plain object
//   3. validate that object with the SAME schema POST /api/transactions uses
//   4. drop duplicates (optionally) and insert the rest
//
// One bad row never aborts the file. It comes back in `errors` with its real
// line number, so the user can fix the sheet and upload again. Only a broken
// file (bad header, >5,000 rows) throws.
// ============================================================================

import { Types } from 'mongoose';

import { CategoryRepository } from '../repositories/category.repository.js';
import {
  TransactionRepository,
  type TransactionFingerprintRow,
} from '../repositories/transaction.repository.js';
import { AppError } from '../utils/AppError.js';
import { normaliseHeader, parseCsv, type CsvRow } from '../utils/csvParser.js';
import { createTransactionSchema } from '../validators/transaction.validator.js';
import type { ImportCsvInput } from '../validators/csv.validator.js';
import type { TransactionType } from '../models/Transaction.model.js';

const PREVIEW_ROWS = 10;

// A file with 4,000 bad rows must not send 4,000 messages to the browser.
const MAX_REPORTED_ERRORS = 50;

const categoryRepository = new CategoryRepository();
const transactionRepository = new TransactionRepository();

export interface CsvRowError {
  line: number;
  message: string;
}

export interface CsvImportResult {
  imported: number;
  skipped: number;
  failed: number;
  errors: CsvRowError[];
  /** true when `failed` is bigger than the 50 messages returned. */
  errorsTruncated: boolean;
}

export interface SuggestedColumns {
  dateColumn?: string;
  amountColumn?: string;
  descriptionColumn?: string;
  typeColumn?: string;
  categoryColumn?: string;
}

export interface CsvPreviewResult {
  headers: string[];
  totalRows: number;
  rows: Array<{ line: number; values: Record<string, string> }>;
  suggestedColumns: SuggestedColumns;
}

// What the schema-approved row looks like after step 3.
interface Candidate {
  line: number;
  data: {
    type: TransactionType;
    amount: number;
    currency?: string;
    category: Types.ObjectId;
    description?: string;
    date: Date;
  };
}

// --- dates ------------------------------------------------------------------

const DATE_PATTERNS: Record<ImportCsvInput['dateFormat'], RegExp> = {
  'YYYY-MM-DD': /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
  'DD/MM/YYYY': /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
  'MM/DD/YYYY': /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
};

function parseDateCell(
  value: string,
  format: ImportCsvInput['dateFormat']
): Date | null {
  const match = DATE_PATTERNS[format].exec(value.trim());

  if (!match) return null;

  let year: number;
  let month: number;
  let day: number;

  if (format === 'YYYY-MM-DD') {
    year = Number(match[1]);
    month = Number(match[2]);
    day = Number(match[3]);
  } else if (format === 'DD/MM/YYYY') {
    day = Number(match[1]);
    month = Number(match[2]);
    year = Number(match[3]);
  } else {
    month = Number(match[1]);
    day = Number(match[2]);
    year = Number(match[3]);
  }

  const date = new Date(Date.UTC(year, month - 1, day));

  // 30 Feb rolls over to 2 March. If any part moved, the file is wrong.
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

// --- amounts ----------------------------------------------------------------

// "₹1,250.00" and "$ 42" are what real bank exports look like.
const MONEY_NOISE = /[₹$€£,\s]/g;

function parseAmountCell(value: string): number | null {
  const cleaned = value.trim().replace(MONEY_NOISE, '');

  if (!cleaned) return null;

  // Some exports write money out as (1,250.00).
  const normalised = cleaned.replace(/^\((.*)\)$/, '-$1');
  const amount = Number(normalised);

  if (!Number.isFinite(amount)) return null;

  // Bank files use "-" for expenses. The type already says that, so the sign
  // here is redundant and only gets in the way.
  return Math.abs(amount);
}

// --- types ------------------------------------------------------------------

const INCOME_WORDS = new Set(['income', 'credit', 'cr', 'in', '+']);
const EXPENSE_WORDS = new Set(['expense', 'debit', 'dr', 'out', '-']);

function parseTypeCell(value: string): TransactionType | null {
  const word = normaliseHeader(value);

  if (INCOME_WORDS.has(word)) return 'income';
  if (EXPENSE_WORDS.has(word)) return 'expense';

  return null;
}

// --- header helpers ---------------------------------------------------------

function buildHeaderIndex(headers: string[]): Map<string, number> {
  const index = new Map<string, number>();

  headers.forEach((header, position) => {
    index.set(normaliseHeader(header), position);
  });

  return index;
}

function readCell(
  row: CsvRow,
  index: Map<string, number>,
  column?: string
): string {
  if (!column) return '';

  const position = index.get(normaliseHeader(column));

  if (position === undefined) return '';

  return (row.values[position] ?? '').trim();
}

function assertColumnsExist(
  index: Map<string, number>,
  input: ImportCsvInput,
  headers: string[]
): void {
  const mapped = [
    input.dateColumn,
    input.amountColumn,
    input.descriptionColumn,
    input.typeColumn,
    input.categoryColumn,
  ].filter((column): column is string => Boolean(column));

  for (const column of mapped) {
    if (index.has(normaliseHeader(column))) continue;

    const found = headers.slice(0, 10).join(', ');

    throw new AppError(
      `Column "${column}" was not found in the file. Found: ${found}`,
      400
    );
  }
}

// --- preview suggestions ----------------------------------------------------

const COLUMN_KEYWORDS: Array<[keyof SuggestedColumns, string[]]> = [
  ['dateColumn', ['date', 'posted', 'day']],
  ['amountColumn', ['amount', 'value', 'sum', 'money', 'total']],
  [
    'descriptionColumn',
    ['description', 'narration', 'details', 'memo', 'note', 'remark', 'particular'],
  ],
  ['typeColumn', ['type', 'direction', 'kind']],
  ['categoryColumn', ['category', 'tag', 'label', 'group']],
];

function suggestColumns(headers: string[]): SuggestedColumns {
  const suggestion: SuggestedColumns = {};

  for (const [field, keywords] of COLUMN_KEYWORDS) {
    const match = headers.find((header) => {
      const name = normaliseHeader(header);

      return keywords.some((keyword) => name.includes(keyword));
    });

    if (match) suggestion[field] = match;
  }

  return suggestion;
}

// --- duplicate fingerprint --------------------------------------------------

// Two rows are "the same transaction" when direction, amount, category, day
// and description all match. The time of day is ignored because a date-only
// cell has no time.
function fingerprint(row: TransactionFingerprintRow): string {
  return [
    row.type,
    row.amount.toFixed(2),
    String(row.category),
    row.date.toISOString().slice(0, 10),
    normaliseHeader(row.description ?? ''),
  ].join('|');
}

// ============================================================================

export class CsvService {
  // POST /api/csv/preview — no write, just "what does this file look like?"
  preview(buffer: Buffer): CsvPreviewResult {
    const { headers, rows } = parseCsv(buffer.toString('utf8'));

    return {
      headers,
      totalRows: rows.length,
      rows: rows.slice(0, PREVIEW_ROWS).map((row) => ({
        line: row.line,
        values: Object.fromEntries(
          headers.map((header, position) => [header, row.values[position] ?? ''])
        ),
      })),
      suggestedColumns: suggestColumns(headers),
    };
  }

  // POST /api/csv/import
  async import(
    userId: string,
    buffer: Buffer,
    input: ImportCsvInput
  ): Promise<CsvImportResult> {
    // The validator allows both to be missing (it only checks category), so
    // the service refuses instead of guessing a direction for the money.
    if (!input.type && !input.typeColumn) {
      throw new AppError(
        'Provide a type or a typeColumn so every row has a direction',
        400
      );
    }

    const { headers, rows } = parseCsv(buffer.toString('utf8'));
    const index = buildHeaderIndex(headers);

    assertColumnsExist(index, input, headers);

    const categories = await this.loadCategoryIndex(userId);

    const errors: CsvRowError[] = [];
    const candidates: Candidate[] = [];
    let failed = 0;

    const reportError = (line: number, message: string): void => {
      failed += 1;

      if (errors.length < MAX_REPORTED_ERRORS) {
        errors.push({ line, message });
      }
    };

    for (const row of rows) {
      // 1. date
      const dateCell = readCell(row, index, input.dateColumn);

      if (!dateCell) {
        reportError(row.line, 'Date is empty');
        continue;
      }

      const date = parseDateCell(dateCell, input.dateFormat);

      if (!date) {
        reportError(row.line, `"${dateCell}" is not a ${input.dateFormat} date`);
        continue;
      }

      // 2. amount
      const amountCell = readCell(row, index, input.amountColumn);

      if (!amountCell) {
        reportError(row.line, 'Amount is empty');
        continue;
      }

      const amount = parseAmountCell(amountCell);

      if (amount === null) {
        reportError(row.line, `"${amountCell}" is not an amount`);
        continue;
      }

      // 3. direction
      let type: TransactionType | undefined = input.type;

      if (input.typeColumn) {
        const typeCell = readCell(row, index, input.typeColumn);
        const parsedType = typeCell ? parseTypeCell(typeCell) : null;

        if (!parsedType) {
          reportError(
            row.line,
            typeCell
              ? `Unknown type "${typeCell}". Use income/credit or expense/debit`
              : 'Type is empty'
          );
          continue;
        }

        type = parsedType;
      }

      if (!type) {
        reportError(row.line, 'Type is missing');
        continue;
      }

      // 4. category name -> id
      const categoryCell = readCell(row, index, input.categoryColumn);
      const matched = categoryCell
        ? categories.get(normaliseHeader(categoryCell))
        : undefined;

      let category = matched;

      if (!category) {
        if (input.defaultCategory) {
          category = new Types.ObjectId(input.defaultCategory);
        } else {
          reportError(
            row.line,
            categoryCell
              ? `Unknown category "${categoryCell}". Create it first or send defaultCategory`
              : 'Category is empty'
          );
          continue;
        }
      }

      // 5. the exact schema POST /api/transactions uses
      const parsed = createTransactionSchema.safeParse({
        body: {
          type,
          amount,
          currency: input.currency,
          category: String(category),
          description: readCell(row, index, input.descriptionColumn) || undefined,
          date: date.toISOString(),
        },
      });

      if (!parsed.success) {
        reportError(row.line, parsed.error.issues[0]?.message ?? 'Row is invalid');
        continue;
      }

      candidates.push({
        line: row.line,
        // `date` is optional in the create schema, so the parsed body types it
        // as `Date | undefined`. We always sent it, so use ours.
        data: { ...parsed.data.body, date, category },
      });
    }

    // 6. duplicates
    const seen = input.skipDuplicates
      ? await this.loadFingerprints(userId, candidates)
      : null;

    const rowsToInsert: Candidate['data'][] = [];
    let skipped = 0;

    for (const candidate of candidates) {
      if (seen) {
        const key = fingerprint(candidate.data);

        if (seen.has(key)) {
          skipped += 1;
          continue;
        }

        // Adding the key also blocks the same row appearing twice in one file.
        seen.add(key);
      }

      rowsToInsert.push(candidate.data);
    }

    // 7. write
    if (rowsToInsert.length === 0) {
      return {
        imported: 0,
        skipped,
        failed,
        errors,
        errorsTruncated: failed > errors.length,
      };
    }

    let imported: number;

    try {
      imported = await transactionRepository.insertManyForUser(
        userId,
        rowsToInsert
      );
    } catch {
      // Every row passed validation, so this is infrastructure (disk, index),
      // not user input — hence 500, not 400.
      throw new AppError(
        'The import stopped because of a database error. Some rows may already be saved.',
        500
      );
    }

    return {
      imported,
      skipped,
      failed,
      errors,
      errorsTruncated: failed > errors.length,
    };
  }

  private async loadCategoryIndex(
    userId: string
  ): Promise<Map<string, Types.ObjectId>> {
    const categories = await categoryRepository.findManyForUser(userId, {
      sort: 'name',
    });

    return new Map(
      categories.map((category) => [
        normaliseHeader(category.name),
        new Types.ObjectId(String(category._id)),
      ])
    );
  }

  private async loadFingerprints(
    userId: string,
    candidates: Candidate[]
  ): Promise<Set<string>> {
    if (candidates.length === 0) return new Set();

    const times = candidates.map((candidate) => candidate.data.date.getTime());
    const from = new Date(Math.min.apply(null, times));
    const to = new Date(Math.max.apply(null, times));

    const existing = await transactionRepository.findFingerprintsInRange(
      userId,
      from,
      to
    );

    return new Set(existing.map(fingerprint));
  }
}

export const csvService = new CsvService();
