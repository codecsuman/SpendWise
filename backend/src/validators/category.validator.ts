// ============================================================================
// Validation for /api/categories routes.
//
// Same shape as transaction.validator.ts: each schema validates the whole
// request ({ body }, { params }, { query }), so the controller can do:
//   const { body } = createCategorySchema.parse({ body: req.body });
//
// z.strictObject rejects unknown keys instead of silently stripping them.
// Anything that needs the database (parent ownership, cycles) is checked in
// the service, not here.
// ============================================================================

import { z } from 'zod';

// Keep this list identical to the enum in Category.model.ts.
const typeField = z.enum(['income', 'expense', 'both']);

// Mongo ids are 24 hex characters. Validate before querying, never after.
const objectIdField = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Invalid id');

const nameField = z
  .string()
  .trim()
  .min(1, 'Category name is required')
  .max(40, 'Category name cannot exceed 40 characters');

const iconField = z
  .string()
  .trim()
  .min(1, 'Icon name is required')
  .max(50, 'Icon name cannot exceed 50 characters');

const colorField = z
  .string()
  .trim()
  .regex(/^#[0-9a-f]{6}$/i, 'Color must be a hex value like #22c55e');

const descriptionField = z
  .string()
  .trim()
  .max(200, 'Description cannot exceed 200 characters');

const idParams = z.strictObject({ id: objectIdField });

// --- POST /api/categories ------------------------------------------------
export const createCategorySchema = z.object({
  body: z.strictObject({
    name: nameField,
    // Optional: the model's defaults apply when these are missing.
    type: typeField.optional(),
    icon: iconField.optional(),
    color: colorField.optional(),
    description: descriptionField.optional(),
    // null and omitted both mean "top-level category".
    parent: objectIdField.nullable().optional(),
  }),
});

// --- GET /api/categories -------------------------------------------------
// Categories are few (a user has tens, not thousands), so there is no
// pagination here. The picker loads the whole list once.
export const listCategoriesSchema = z.object({
  query: z.strictObject({
    type: typeField.optional(),
    search: z.string().trim().max(40).optional(),
    sort: z.enum(['name', 'newest']).default('name'),
  }),
});

// --- GET /api/categories/:id ---------------------------------------------
export const getCategorySchema = z.object({
  params: idParams,
});

// --- PATCH /api/categories/:id -------------------------------------------
export const updateCategorySchema = z.object({
  params: idParams,
  body: z
    .strictObject({
      name: nameField.optional(),
      type: typeField.optional(),
      icon: iconField.optional(),
      color: colorField.optional(),
      // null clears the description.
      description: descriptionField.nullable().optional(),
      // null moves the category back to the top level.
      parent: objectIdField.nullable().optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: 'Provide at least one field to update',
    }),
});

// --- DELETE /api/categories/:id ------------------------------------------
export const deleteCategorySchema = z.object({
  params: idParams,
});

// --- TYPES ---------------------------------------------------------------
export type CreateCategoryInput = z.infer<typeof createCategorySchema>['body'];
export type ListCategoriesQuery = z.infer<typeof listCategoriesSchema>['query'];
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>['body'];
