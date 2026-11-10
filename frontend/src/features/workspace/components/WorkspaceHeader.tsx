// ============================================================================
// WorkspaceHeader.tsx — title row and the main Workspace actions.
// It only draws buttons; the page owns the state they change.
// ============================================================================

import {
  Calculator,
  Loader2,
  Plus,
  SlidersHorizontal,
  Zap,
} from 'lucide-react'

interface WorkspaceHeaderProps {
  noteCount: number
  isFetching: boolean
  isCreating: boolean
  onNew: () => void
  onQuickNote: () => void
  onCalculator: () => void
  onOpenFilters: () => void
}

const secondaryButton =
  'inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium transition hover:bg-muted disabled:opacity-60'

export default function WorkspaceHeader({
  noteCount,
  isFetching,
  isCreating,
  onNew,
  onQuickNote,
  onCalculator,
  onOpenFilters,
}: WorkspaceHeaderProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Workspace</h1>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          {noteCount} note{noteCount === 1 ? '' : 's'} shown
          {isFetching && <Loader2 className="size-3.5 animate-spin" />}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onOpenFilters}
          className={`${secondaryButton} xl:hidden`}
        >
          <SlidersHorizontal className="size-4" />
          Filters
        </button>

        <button
          type="button"
          onClick={onCalculator}
          className={secondaryButton}
        >
          <Calculator className="size-4" />
          Calculator
        </button>

        <button type="button" onClick={onQuickNote} className={secondaryButton}>
          <Zap className="size-4" />
          Quick note
        </button>

        <button
          type="button"
          onClick={onNew}
          disabled={isCreating}
          className="btn-3d sm"
        >
          <Plus className="mr-1 inline size-4" />
          {isCreating ? 'Creating…' : 'New note'}
        </button>
      </div>

      {/* Screen-reader hint for the two global shortcuts. */}
      <p className="sr-only">
        Press N for a new quick note and Control K to search your notes.
      </p>
    </header>
  )
}
