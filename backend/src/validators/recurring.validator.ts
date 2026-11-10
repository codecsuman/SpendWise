// ============================================================================
// Validation for /api/recurring routes.
//
// Same shape as goal.validator.ts: each schema validates the whole request
// ({ body }, { params }, { query }), so the controller can do:
//   const { body } = createRecurringSchema.parse({ body: req.body });
//
// z.strictObject rejects unknown keys instead of silently stripping them.
// Ownership, category ownership and the "is this date already in the past"
// rule are checked in the service.
// ============================================================================

import { z } from 'zod';

// Keep these lists identical to the enums in RecurringTransaction.model.ts.
const typeField = z.enum(['income', 'expense']);
const currencyField = z.enum(['INR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD']);
const frequencyField = z.enum(['daily', 'weekly', 'monthly', 'yearly']);

// Mongo ids are 24 hex characters. Validate before querying, never after.
const objectIdField = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

// coerce lets "70000" from a form or a query string become the number 70000.
// The transform mirrors the model setter, so validation and storage agree.
const moneyField = z.coerce
  .number()
  .max(1_000_000_000, 'Amount is too large')
  .transform((value) => Math.round(value * 100) / 100);

const amountField = moneyField.refine(
  (value) => value > 0,
  'Amount must be greater than 0'
);

const descriptionField = z
  .string()
  .trim()
  .max(500, 'Description cannot exceed 500 characters');

const intervalField = z.coerce
  .number()
  .int('Interval must be a whole number')
  .min(1, 'Interval must be at least 1')
  .max(12, 'Interval cannot be more than 12');

// Accepts "2027-06-30" and full ISO strings, rejects impossible dates.
const dateField = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Provide a valid date')
  .transform((value) => new Date(value));

// A query string only carries text. z.coerce.boolean() would turn the string
// "false" into true (any non-empty string is truthy), so be explicit.
const isActiveQueryField = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');

const idParams = z.strictObject({ id: objectIdField });

// The end of a schedule cannot come before its start.
// `endDate` may be null (clear it), so the helper accepts that too.
const endAfterStart = (body: {
  startDate?: Date | null;
  endDate?: Date | null;
}) => !body.startDate || !body.endDate || body.endDate > body.startDate;

// --- POST /api/recurring ---------------------------------------------------
export const createRecurringSchema = z.object({
  body: z
    .strictObject({
      type: typeField,
      amount: amountField,
      currency: currencyField.optional(),
      category: objectIdField,
      description: descriptionField.optional(),
      frequency: frequencyField,
      // Optional: the model defaults to 1 (every month, every week, ...).
      interval: intervalField.optional(),
      startDate: dateField,
      endDate: dateField.optional(),
      // Lets a rule be created already paused.
      isActive: z.boolean().optional(),
    })
    .refine(endAfterStart, {
      message: 'End date must be after the start date',
      path: ['endDate'],
    }),
});

// --- GET /api/recurring ----------------------------------------------------
export const listRecurringSchema = z.object({
  query: z.strictObject({
    isActive: isActiveQueryField.optional(),
    frequency: frequencyField.optional(),
    sort: z.enum(['newest', 'nextRun']).default('nextRun'),
  }),
});

// --- GET /api/recurring/:id ------------------------------------------------
export const getRecurringSchema = z.object({
  params: idParams,
});

// --- PATCH /api/recurring/:id ----------------------------------------------
// Also used to pause/resume: PATCH { "isActive": false }.
export const updateRecurringSchema = z.object({
  params: idParams,
  body: z
    .strictObject({
      type: typeField.optional(),
      amount: amountField.optional(),
      currency: currencyField.optional(),
      category: objectIdField.optional(),
      description: descriptionField.nullable().optional(),
      frequency: frequencyField.optional(),
      interval: intervalField.optional(),
      startDate: dateField.optional(),
      endDate: dateField.nullable().optional(),
      isActive: z.boolean().optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: 'Provide at least one field to update',
    })
    // Only compares when both dates are in this request. When the user changes
    // just endDate, the service must compare against the stored startDate.
    .refine(endAfterStart, {
      message: 'End date must be after the start date',
      path: ['endDate'],
    }),
});

// --- DELETE /api/recurring/:id ---------------------------------------------
export const deleteRecurringSchema = z.object({
  params: idParams,
});

// --- TYPES -----------------------------------------------------------------
export type CreateRecurringInput = z.infer<typeof createRecurringSchema>['body'];
export type ListRecurringQuery = z.infer<typeof listRecurringSchema>['query'];
export type UpdateRecurringInput = z.infer<typeof updateRecurringSchema>['body'];
