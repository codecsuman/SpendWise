// ============================================================================
// Validation for /api/workspace routes.
//
// Same shape as goal.validator.ts: each schema validates the whole request
// ({ body }, { params }, { query }), so the controller can do:
//   const { body } = createNoteSchema.parse({ body: req.body });
//
// z.strictObject rejects unknown keys instead of silently stripping them.
// Ownership is enforced in every repository filter.
// ============================================================================

import { z } from 'zod';

// Keep this list identical to the enum in Note.model.ts.
const colorField = z.enum([
  'teal',
  'indigo',
  'amber',
  'rose',
  'green',
  'slate',
]);

const resourceTypeField = z.enum([
  'transaction',
  'budget',
  'goal',
  'category',
]);

// Mongo ids are 24 hex characters. Validate before querying, never after.
const objectIdField = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Invalid id');

const linkField = z.strictObject({
  type: resourceTypeField,
  id: objectIdField,
  label: z
    .string()
    .trim()
    .min(1, 'Link label is required')
    .max(120, 'Link label must be at most 120 characters'),
});

const titleField = z
  .string()
  .trim()
  .max(120, 'Title must be at most 120 characters');

const contentField = z
  .string()
  .max(50_000, 'Note content is too long');

const tagsField = z
  .array(z.string().trim().min(1, 'Tag cannot be empty').max(24))
  .max(10, 'A note can have at most 10 tags');

const folderField = z
  .string()
  .trim()
  .max(40, 'Folder name must be at most 40 characters')
  .nullable()
  .transform((value) => (value === '' ? null : value));

const linksField = z
  .array(linkField)
  .max(20, 'A note can link at most 20 records');

const idParams = z.strictObject({ id: objectIdField });

// Query strings arrive as text, so "true"/"false" are converted here.
const booleanQuery = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');

// --- POST /api/workspace/notes --------------------------------------------
export const createNoteSchema = z.object({
  body: z.strictObject({
    title: titleField.optional(),
    content: contentField.optional(),
    tags: tagsField.optional(),
    folder: folderField.optional(),
    color: colorField.optional(),
    pinned: z.boolean().optional(),
    links: linksField.optional(),
  }),
});

// --- GET /api/workspace/notes ---------------------------------------------
export const listNotesSchema = z.object({
  query: z.strictObject({
    search: z.string().trim().max(120).optional(),
    tag: z.string().trim().max(24).optional(),
    folder: z.string().trim().max(40).optional(),
    pinned: booleanQuery.optional(),
    // Default false: archived notes stay out of the normal list.
    archived: booleanQuery.optional(),
    sort: z.enum(['updated', 'created', 'title']).default('updated'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(30),
  }),
});

// --- GET /api/workspace/notes/:id -----------------------------------------
export const getNoteSchema = z.object({
  params: idParams,
});

// --- PATCH /api/workspace/notes/:id ---------------------------------------
export const updateNoteSchema = z.object({
  params: idParams,
  body: z
    .strictObject({
      title: titleField.optional(),
      content: contentField.optional(),
      tags: tagsField.optional(),
      folder: folderField.optional(),
      color: colorField.optional(),
      pinned: z.boolean().optional(),
      archived: z.boolean().optional(),
      links: linksField.optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: 'Provide at least one field to update',
    }),
});

// --- DELETE /api/workspace/notes/:id --------------------------------------
export const deleteNoteSchema = z.object({
  params: idParams,
});

// --- TYPES ----------------------------------------------------------------
export type CreateNoteInput = z.infer<typeof createNoteSchema>['body'];
export type ListNotesQuery = z.infer<typeof listNotesSchema>['query'];
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>['body'];
