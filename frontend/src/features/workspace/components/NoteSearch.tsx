// ============================================================================
// NoteSearch.tsx — the search field above the notes list.
// The page passes a ref so Ctrl+K can focus it from anywhere.
// ============================================================================

import { Search, X } from 'lucide-react'
import type { RefObject } from 'react'

interface NoteSearchProps {
  value: string
  onChange: (value: string) => void
  inputRef?: RefObject<HTMLInputElement | null>
}

export default function NoteSearch({
  value,
  onChange,
  inputRef,
}: NoteSearchProps) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search notes…"
        aria-label="Search notes"
        className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-9 text-sm outline-none transition focus:ring-2 focus:ring-ring/50"
      />

      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  )
}
