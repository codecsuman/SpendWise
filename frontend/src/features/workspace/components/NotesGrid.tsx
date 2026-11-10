// ============================================================================
// NotesGrid.tsx — the scrollable list of note cards, plus loading and empty
// states.
// ============================================================================

import { Loader2, Plus, StickyNote } from 'lucide-react'

import type { Note } from '../types/workspace.types'
import NoteCard from './NoteCard'

interface NotesGridProps {
  notes: Note[]
  selectedId: string | null
  isLoading: boolean
  isFetching: boolean
  onSelect: (note: Note) => void
  onTogglePin: (note: Note) => void
  onNew: () => void
}

export default function NotesGrid({
  notes,
  selectedId,
  isLoading,
  isFetching,
  onSelect,
  onTogglePin,
  onNew,
}: NotesGridProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <div className="skeleton h-28" />
        <div className="skeleton h-28" />
        <div className="skeleton h-28" />
      </div>
    )
  }

  if (notes.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center">
        <div className="grid size-12 place-items-center rounded-2xl bg-p1/10 text-p1">
          <StickyNote className="size-6" />
        </div>
        <div>
          <p className="text-sm font-semibold">No notes here yet</p>
          <p className="mt-1 max-w-56 text-xs leading-relaxed text-muted-foreground">
            Write down an idea, a reminder or a link to a transaction.
          </p>
        </div>
        <button type="button" onClick={onNew} className="btn-3d sm">
          <Plus className="mr-1 inline size-4" />
          New note
        </button>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
      {isFetching && (
        <div className="flex items-center gap-2 px-1 text-[11px] text-muted-foreground">
          <Loader2 className="size-3 animate-spin" />
          Updating…
        </div>
      )}

      {notes.map((note) => (
        <NoteCard
          key={note._id}
          note={note}
          selected={selectedId === note._id}
          onSelect={onSelect}
          onTogglePin={onTogglePin}
        />
      ))}
    </div>
  )
}
