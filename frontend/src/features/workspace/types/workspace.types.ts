// ============================================================================
// workspace.types.ts — shared shapes for notes, linked resources and the
// calculator history.
//
// These mirror the JSON the backend will send. Keep them in sync with
// backend/src/models/Note.model.ts and backend/src/validators/workspace.validator.ts.
// ============================================================================

// Keep this list identical to the enum in Note.model.ts.
export const NOTE_COLORS = [
  'teal',
  'indigo',
  'amber',
  'rose',
  'green',
  'slate',
] as const

export type NoteColor = (typeof NOTE_COLORS)[number]

export type NoteSort = 'updated' | 'created' | 'title'

// A note can point at any finance record without copying its content.
export type NoteResourceType =
  | 'transaction'
  | 'budget'
  | 'goal'
  | 'category'

export interface NoteLink {
  type: NoteResourceType
  id: string
  // Captured at link time so the note still reads well if the record changes.
  label: string
}

// Mirrors the JSON Mongoose sends for one Note document.
export interface Note {
  _id: string
  user: string
  title: string
  content: string
  tags: string[]
  folder: string | null
  color: NoteColor
  pinned: boolean
  archived: boolean
  links: NoteLink[]
  createdAt: string
  updatedAt: string
}

// GET filters. fetchBaseQuery skips keys whose value is undefined.
export interface NoteListQuery {
  search?: string
  tag?: string
  folder?: string
  pinned?: boolean
  archived?: boolean
  sort?: NoteSort
  page?: number
  limit?: number
}

export interface NotePagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

// { success: true, notes, pagination } — list
export interface NoteListResponse {
  success: boolean
  notes: Note[]
  pagination: NotePagination
}

// { success: true, note } — create / get / update
export interface NoteResponse {
  success: boolean
  note: Note
}

export interface DeleteNoteResponse {
  success: boolean
  message: string
}

// POST body. The server fills in defaults for anything missing.
export interface CreateNoteInput {
  title?: string
  content?: string
  tags?: string[]
  folder?: string | null
  color?: NoteColor
  pinned?: boolean
  links?: NoteLink[]
}

// PATCH sends only the fields that changed.
export type UpdateNoteInput = Partial<CreateNoteInput> & {
  archived?: boolean
}

// --- CALCULATOR ------------------------------------------------------------

export type CalculatorOperator = '+' | '-' | '*' | '/'

// History is frontend-only for now. It lives in localStorage, so it never
// leaves the device and needs no backend endpoint.
export interface CalculationEntry {
  id: string
  expression: string
  result: string
  createdAt: string
}

// Tailwind classes for the note color labels. They use page tokens (p1..p5)
// instead of hex values, so dark mode and the Workspace theme both work.
export const NOTE_COLOR_LABELS: Record<NoteColor, string> = {
  teal: 'Teal',
  indigo: 'Indigo',
  amber: 'Amber',
  rose: 'Rose',
  green: 'Green',
  slate: 'Slate',
}

export const NOTE_COLOR_CLASSES: Record<
  NoteColor,
  { bar: string; dot: string; soft: string }
> = {
  teal: { bar: 'bg-p1', dot: 'bg-p1', soft: 'bg-p1/10 text-p1' },
  indigo: { bar: 'bg-p2', dot: 'bg-p2', soft: 'bg-p2/10 text-p2' },
  amber: { bar: 'bg-p3', dot: 'bg-p3', soft: 'bg-p3/10 text-p3' },
  rose: { bar: 'bg-p4', dot: 'bg-p4', soft: 'bg-p4/10 text-p4' },
  green: { bar: 'bg-p5', dot: 'bg-p5', soft: 'bg-p5/10 text-p5' },
  slate: {
    bar: 'bg-muted-foreground',
    dot: 'bg-muted-foreground',
    soft: 'bg-muted text-muted-foreground',
  },
}

export const RESOURCE_LABELS: Record<NoteResourceType, string> = {
  transaction: 'Transaction',
  budget: 'Budget',
  goal: 'Goal',
  category: 'Category',
}
