// ============================================================================
// NoteFilters.tsx — sort control and the removable active-filter chips.
// ============================================================================

import { X } from 'lucide-react'

import type { NoteSort } from '../types/workspace.types'

interface NoteFiltersProps {
  sort: NoteSort
  onSort: (sort: NoteSort) => void
  activeFolder: string | null
  activeTag: string | null
  pinnedOnly: boolean
  showArchived: boolean
  onFolder: (folder: string | null) => void
  onTag: (tag: string | null) => void
  onPinned: (value: boolean) => void
  onArchived: (value: boolean) => void
  onClear: () => void
}

const selectClass =
  'h-9 rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50'

interface FilterChipProps {
  label: string
  onRemove: () => void
}

function FilterChip({ label, onRemove }: FilterChipProps) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        className="rounded-full p-0.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
      >
        <X className="size-3" />
      </button>
    </span>
  )
}

export default function NoteFilters({
  sort,
  onSort,
  activeFolder,
  activeTag,
  pinnedOnly,
  showArchived,
  onFolder,
  onTag,
  onPinned,
  onArchived,
  onClear,
}: NoteFiltersProps) {
  const hasFilters =
    Boolean(activeFolder) || Boolean(activeTag) || pinnedOnly || showArchived

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={sort}
        onChange={(event) => onSort(event.target.value as NoteSort)}
        aria-label="Sort notes"
        className={selectClass}
      >
        <option value="updated">Last updated</option>
        <option value="created">Newest first</option>
        <option value="title">Title A–Z</option>
      </select>

      {activeFolder && (
        <FilterChip
          label={`Folder: ${activeFolder}`}
          onRemove={() => onFolder(null)}
        />
      )}
      {activeTag && (
        <FilterChip
          label={`Tag: ${activeTag}`}
          onRemove={() => onTag(null)}
        />
      )}
      {pinnedOnly && (
        <FilterChip label="Pinned" onRemove={() => onPinned(false)} />
      )}
      {showArchived && (
        <FilterChip label="Archived" onRemove={() => onArchived(false)} />
      )}

      {hasFilters && (
        <button
          type="button"
          onClick={onClear}
          className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Clear all
        </button>
      )}
    </div>
  )
}
