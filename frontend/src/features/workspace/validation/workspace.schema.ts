// ============================================================================
// workspace.schema.ts — client-side validation for the note forms.
//
// The server validates again with Zod. This copy exists so the user sees a
// useful message before a request is sent, and so the Quick Note form cannot
// submit an empty note.
// ============================================================================

import { z } from 'zod'

import { NOTE_COLORS } from '../types/workspace.types'

// A linked record id is a Mongo ObjectId (24 hex characters).
export const noteLinkSchema = z.object({
  type: z.enum(['transaction', 'budget', 'goal', 'category']),
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid resource id'),
  label: z.string().trim().min(1, 'Label is required').max(120),
})

const titleField = z
  .string()
  .trim()
  .max(120, 'Title must be at most 120 characters')

const contentField = z
  .string()
  .max(50_000, 'This note is too long')

const tagsField = z
  .array(z.string().trim().min(1).max(24))
  .max(10, 'A note can have at most 10 tags')

const folderField = z
  .string()
  .trim()
  .max(40, 'Folder name must be at most 40 characters')
  .nullable()

export const noteDraftSchema = z.object({
  title: titleField,
  content: contentField,
  tags: tagsField,
  folder: folderField,
  color: z.enum(NOTE_COLORS),
  pinned: z.boolean(),
  links: z.array(noteLinkSchema).max(20, 'A note can link at most 20 records'),
})

// Quick Note only asks for a title and content. At least one must be filled.
export const quickNoteSchema = noteDraftSchema
  .pick({ title: true, content: true })
  .refine((value) => value.title.length > 0 || value.content.trim().length > 0, {
    message: 'Write a title or some content first',
    path: ['content'],
  })

export type NoteDraft = z.infer<typeof noteDraftSchema>
export type QuickNoteValues = z.infer<typeof quickNoteSchema>
