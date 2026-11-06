// ============================================================================
// Validation for /api/budgets routes.
//
// Same shape as category.validator.ts: each schema validates the whole
// request ({ body }, { params }, { query }), so the controller can do:
//   const { body } = createBudgetSchema.parse({ body: req.body });
//
// z.strictObject rejects unknown keys instead of silently stripping them.
// Anything that needs the database (category ownership, duplicate month)
// is checked in the service, not here.
// ============================================================================

import { z } from 'zod';

// Keep this list identical to the enum in Budget.model.ts.
const currencyField = z.enum(['INR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD']);

// Mongo ids are 24 hex characters. Validate before querying, never after.
const objectIdField = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Invalid id');

// A budget is monthly, so a plain string is enough: 2026-01 ... 2026-12.
const monthField = z
  .string()
  .trim()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must look like YYYY-MM');

// coerce lets the query string "6000" become the number 6000.
// The transform mirrors the model setter, so validation and storage agree.
const amountField = z.coerce
  .number()
  .positive('Budget amount must be greater than 0')
  .max(1_000_000_000, 'Budget amount is too large')
  .transform((value) => Math.round(value * 100) / 100);

const idParams = z.strictObject({ id: objectIdField });

// --- POST /api/budgets -----------------------------------------------------
export const createBudgetSchema = z.object({
  body: z.strictObject({
    category: objectIdField,
    amount: amountField,
    currency: currencyField.optional(),
    month: monthField,
  }),
});

// --- GET /api/budgets ------------------------------------------------------
// The list is small (one row per category), so there is no pagination.
// When "month" is missing the service uses the current month.
export const listBudgetsSchema = z.object({
  query: z.strictObject({
    month: monthField.optional(),
    category: objectIdField.optional(),
    sort: z.enum(['newest', 'highest']).default('newest'),
  }),
});

// --- GET /api/budgets/:id --------------------------------------------------
export const getBudgetSchema = z.object({
  params: idParams,
});

// --- PATCH /api/budgets/:id ------------------------------------------------
export const updateBudgetSchema = z.object({
  params: idParams,
  body: z
    .strictObject({
      // Changing the category can create a duplicate for that month;
      // the service re-checks and returns 409.
      category: objectIdField.optional(),
      amount: amountField.optional(),
      currency: currencyField.optional(),
      month: monthField.optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: 'Provide at least one field to update',
    }),
});

// --- DELETE /api/budgets/:id -----------------------------------------------
export const deleteBudgetSchema = z.object({
  params: idParams,
});

// --- TYPES -----------------------------------------------------------------
export type CreateBudgetInput = z.infer<typeof createBudgetSchema>['body'];
export type ListBudgetsQuery = z.infer<typeof listBudgetsSchema>['query'];
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>['body'];
