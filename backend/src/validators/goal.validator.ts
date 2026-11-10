// ============================================================================
// Validation for /api/goals routes.
//
// Same shape as budget.validator.ts: each schema validates the whole request
// ({ body }, { params }, { query }), so the controller can do:
//   const { body } = createGoalSchema.parse({ body: req.body });
//
// z.strictObject rejects unknown keys instead of silently stripping them.
// Ownership, duplicate names and business rules are checked in the service.
// ============================================================================

import { z } from 'zod';

// Keep these lists identical to the enums in Goal.model.ts.
const currencyField = z.enum(['INR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD']);
const statusField = z.enum(['active', 'completed', 'cancelled']);

// Mongo ids are 24 hex characters. Validate before querying, never after.
const objectIdField = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Invalid id');

// coerce lets "70000" from a form or query string become the number 70000.
// The transform mirrors the model setter, so validation and storage agree.
const moneyField = z.coerce
  .number()
  .max(1_000_000_000, 'Amount is too large')
  .transform((value) => Math.round(value * 100) / 100);

const targetAmountField = moneyField.refine(
  (value) => value > 0,
  'Target amount must be greater than 0'
);

const savedAmountField = moneyField.refine(
  (value) => value >= 0,
  'Saved amount cannot be negative'
);

const nameField = z
  .string()
  .trim()
  .min(2, 'Goal name must be at least 2 characters')
  .max(80, 'Goal name must be at most 80 characters');

const noteField = z
  .string()
  .trim()
  .max(300, 'Note cannot exceed 300 characters');

// Accepts "2027-06-30" and full ISO strings, rejects impossible dates.
const dateField = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Provide a valid date')
  .transform((value) => new Date(value));

// A target date in the past cannot be a goal. Compare at UTC midnight so the
// user's clock timezone cannot flip the answer by a few hours.
const futureDateField = dateField.refine(
  (value) => value.getTime() >= Date.parse(new Date().toISOString().slice(0, 10)),
  'Target date cannot be in the past'
);

const idParams = z.strictObject({ id: objectIdField });

// --- POST /api/goals -------------------------------------------------------
export const createGoalSchema = z.object({
  body: z.strictObject({
    name: nameField,
    targetAmount: targetAmountField,
    // Optional so a user can create the goal first and add money later.
    savedAmount: savedAmountField.optional(),
    currency: currencyField.optional(),
    targetDate: futureDateField,
    note: noteField.optional(),
  }),
});

// --- GET /api/goals --------------------------------------------------------
// Goals per user are few (5-15), so there is no pagination.
export const listGoalsSchema = z.object({
  query: z.strictObject({
    status: statusField.optional(),
    sort: z.enum(['target', 'newest', 'progress']).default('target'),
  }),
});

// --- GET /api/goals/:id ----------------------------------------------------
export const getGoalSchema = z.object({
  params: idParams,
});

// --- PATCH /api/goals/:id --------------------------------------------------
export const updateGoalSchema = z.object({
  params: idParams,
  body: z
    .strictObject({
      name: nameField.optional(),
      targetAmount: targetAmountField.optional(),
      savedAmount: savedAmountField.optional(),
      currency: currencyField.optional(),
      targetDate: dateField.optional(),
      note: noteField.nullable().optional(),
      status: statusField.optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: 'Provide at least one field to update',
    }),
});

// --- DELETE /api/goals/:id -------------------------------------------------
export const deleteGoalSchema = z.object({
  params: idParams,
});

// --- POST /api/goals/:id/contribute ----------------------------------------
// A contribution is its own small endpoint: it only adds money and never
// rewrites the rest of the goal.
export const contributeGoalSchema = z.object({
  params: idParams,
  body: z.strictObject({
    amount: moneyField.refine(
      (value) => value > 0,
      'Contribution must be greater than 0'
    ),
    note: noteField.optional(),
  }),
});

// --- TYPES -----------------------------------------------------------------
export type CreateGoalInput = z.infer<typeof createGoalSchema>['body'];
export type ListGoalsQuery = z.infer<typeof listGoalsSchema>['query'];
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>['body'];
export type ContributeGoalInput = z.infer<typeof contributeGoalSchema>['body'];
