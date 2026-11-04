// ============================================================================
// Validation for /api/transactions routes.
//
// Same shape as user.validator.ts: each schema validates the whole request
// ({ body }, { params }, { query }), so the controller can do:
//   const { body } = createTransactionSchema.parse({ body: req.body });
//
// z.strictObject rejects unknown keys instead of silently stripping them.
// ============================================================================

import { z } from 'zod';

// Keep these lists identical to the enums in Transaction.model.ts.
const typeField = z.enum(['income', 'expense']);
const currencyField = z.enum(['INR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD']);

// Mongo ids are 24 hex characters. Validate before querying, never after.
const objectIdField = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Invalid id');

// coerce lets the query string "10" become the number 10.
// The transform mirrors the model setter, so validation and storage agree.
const amountField = z.coerce
  .number()
  .positive('Amount must be greater than 0')
  .max(1_000_000_000, 'Amount is too large')
  .transform((value) => Math.round(value * 100) / 100);

const descriptionField = z
  .string()
  .trim()
  .max(500, 'Description cannot exceed 500 characters');

// Accepts "2026-10-05" and full ISO strings, rejects impossible dates.
const dateField = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Provide a valid date')
  .transform((value) => new Date(value));

const idParams = z.strictObject({ id: objectIdField });

// --- POST /api/transactions ------------------------------------------------
export const createTransactionSchema = z.object({
  body: z.strictObject({
    type: typeField,
    amount: amountField,
    currency: currencyField.optional(),
    category: objectIdField,
    description: descriptionField.optional(),
    date: dateField.optional(),
  }),
});

// --- GET /api/transactions -------------------------------------------------
export const listTransactionsSchema = z
  .object({
    query: z.strictObject({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      type: typeField.optional(),
      category: objectIdField.optional(),
      from: dateField.optional(),
      to: dateField.optional(),
      search: z.string().trim().max(100).optional(),
      sort: z.enum(['newest', 'oldest', 'highest', 'lowest']).default('newest'),
    }),
  })
  .refine(({ query }) => !query.from || !query.to || query.from <= query.to, {
    message: '"from" must be before or equal to "to"',
    path: ['query', 'to'],
  });

// --- GET /api/transactions/:id ---------------------------------------------
export const getTransactionSchema = z.object({
  params: idParams,
});

// --- PATCH /api/transactions/:id -------------------------------------------
export const updateTransactionSchema = z.object({
  params: idParams,
  body: z
    .strictObject({
      type: typeField.optional(),
      amount: amountField.optional(),
      currency: currencyField.optional(),
      category: objectIdField.optional(),
      description: descriptionField.nullable().optional(),
      date: dateField.optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: 'Provide at least one field to update',
    }),
});

// --- DELETE /api/transactions/:id ------------------------------------------
export const deleteTransactionSchema = z.object({
  params: idParams,
});

// --- TYPES -----------------------------------------------------------------
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>['body'];
export type ListTransactionsQuery = z.infer<typeof listTransactionsSchema>['query'];
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>['body'];
