// ============================================================================
// Validation for /api/csv routes.
//
// The import request is multipart/form-data, so multer puts every text field
// into req.body as a STRING. That is why:
//   - booleans are an enum of "true" / "false" (z.coerce.boolean() would turn
//     the string "false" into true, because a non-empty string is truthy)
//   - the controller must read req.body only AFTER uploadCsvMiddleware runs
//
// Column fields hold header NAMES ("Date", "Amount"), not positions, so the
// user can reorder columns freely. The service matches them with
// normaliseHeader() from csvParser.ts.
// ============================================================================

import { z } from 'zod';

// Keep these lists identical to the enums in Transaction.model.ts.
const typeField = z.enum(['income', 'expense']);
const currencyField = z.enum(['INR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD']);

const objectIdField = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

const columnField = z
  .string()
  .trim()
  .min(1, 'Column name cannot be empty')
  .max(64, 'Column name is too long');

// Multipart sends "false" as text. The default runs on the string, then the
// transform turns it into a real boolean.
const booleanField = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

// Only three shapes are accepted. No "auto" mode: guessing between 03/04 and
// 04/03 is how silent, wrong imports happen. A wrong choice is reported per
// row instead.
const dateFormatField = z
  .enum(['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY'])
  .default('YYYY-MM-DD');

// --- POST /api/csv/import ---------------------------------------------------
export const importCsvSchema = z.object({
  body: z
    .strictObject({
      dateColumn: columnField,
      amountColumn: columnField,
      descriptionColumn: columnField.optional(),
      typeColumn: columnField.optional(),
      categoryColumn: columnField.optional(),
      defaultCategory: objectIdField.optional(),
      type: typeField.optional(),
      currency: currencyField.optional(),
      dateFormat: dateFormatField,
      skipDuplicates: booleanField,
    })
    .refine((body) => Boolean(body.categoryColumn || body.defaultCategory), {
      message: 'Provide categoryColumn or defaultCategory',
      path: ['categoryColumn'],
    }),
});

// --- POST /api/csv/preview --------------------------------------------------
// No body fields needed: the file alone reveals the header row and the first
// rows. The controller only has to check that req.file exists.

export type ImportCsvInput = z.infer<typeof importCsvSchema>['body'];
