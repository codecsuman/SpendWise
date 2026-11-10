// ============================================================================
// NoteCard.tsx — one row in the notes list.
//
// The whole card is a button, and the pin is a separate button placed on top.
// That keeps the markup valid (a button can never contain another button).
// ============================================================================

import { Link2, Pin } from 'lucide-react'

import {
  NOTE_COLOR_CLASSES,
  type Note,
} from '../types/workspace.types'

interface NoteCardProps {
  note: Note
  selected: boolean
  onSelect: (note: Note) => void
  onTogglePin: (note: Note) => void
}

// Captured once at module load, like GoalsPage does. Relative labels do not
// need to refresh every second.
const NOW_MS = Date.now()

function formatNoteDate(value: string): string {
  const time = new Date(value).getTime()
  const minutes = Math.max(0, Math.floor((NOW_MS - time) / 60_000))

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`

  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
  }).format(new Date(value))
}

function snippetOf(note: Note): string {
  return note.content.replace(/\s+/g, ' ').trim().slice(0, 140)
}

export default function NoteCard({
  note,
  selected,
  onSelect,
  onTogglePin,
}: NoteCardProps) {
  const colors = NOTE_COLOR_CLASSES[note.color]
  const snippet = snippetOf(note)

  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border bg-card shadow-sm transition ${
        selected
          ? 'border-p1 ring-2 ring-p1/25'
          : 'border-border hover:-translate-y-0.5 hover:shadow-md'
      }`}
    >
      {/* Color label across the top */}
      <span className={`absolute inset-x-0 top-0 h-1 ${colors.bar}`} />

      <button
        type="button"
        onClick={() => onSelect(note)}
        className="w-full px-4 pb-3 pt-5 text-left"
      >
        <h3 className="line-clamp-1 pr-7 text-sm font-semibold">
          {note.title || 'Untitled note'}
        </h3>

        <p className="mt-1 line-clamp-2 min-h-8 text-xs leading-relaxed text-muted-foreground">
          {snippet || 'No content yet.'}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {note.folder && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {note.folder}
            </span>
          )}

          {note.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${colors.soft}`}
            >
              {tag}
            </span>
          ))}

          {note.tags.length > 3 && (
            <span className="text-[10px] text-muted-foreground">
              +{note.tags.length - 3}
            </span>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{formatNoteDate(note.updatedAt)}</span>

          {note.links.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <Link2 className="size-3" />
              {note.links.length}
            </span>
          )}
        </div>
      </button>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onTogglePin(note)
        }}
        aria-label={note.pinned ? `Unpin ${note.title}` : `Pin ${note.title}`}
        className={`absolute right-2 top-2 rounded-md p-1 transition hover:bg-muted ${
          note.pinned
            ? 'text-p1'
            : 'text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
        }`}
      >
        <Pin className={`size-3.5 ${note.pinned ? 'fill-current' : ''}`} />
      </button>
    </article>
  )
}
