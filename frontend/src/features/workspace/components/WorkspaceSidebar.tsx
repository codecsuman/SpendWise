// ============================================================================
// WorkspaceSidebar.tsx — the folder / tag filter column.
//
// Purely presentational: it receives the active filters and calls the
// handlers the page gives it.
// ============================================================================

import { Archive, Folder, Pin, StickyNote, Tags, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface WorkspaceSidebarProps {
  folders: string[]
  tags: string[]
  noteCount: number
  activeFolder: string | null
  activeTag: string | null
  pinnedOnly: boolean
  showArchived: boolean
  onFolder: (folder: string | null) => void
  onTag: (tag: string | null) => void
  onPinned: (value: boolean) => void
  onArchived: (value: boolean) => void
  onClose?: () => void
}

interface LibraryButtonProps {
  icon: LucideIcon
  label: string
  count?: number
  active: boolean
  onClick: () => void
}

function LibraryButton({
  icon: Icon,
  label,
  count,
  active,
  onClick,
}: LibraryButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium transition ${
        active
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-foreground hover:bg-muted'
      }`}
    >
      <Icon className="size-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {typeof count === 'number' && (
        <span
          className={`text-xs ${
            active ? 'text-primary-foreground/80' : 'text-muted-foreground'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  )
}

export default function WorkspaceSidebar({
  folders,
  tags,
  noteCount,
  activeFolder,
  activeTag,
  pinnedOnly,
  showArchived,
  onFolder,
  onTag,
  onPinned,
  onArchived,
  onClose,
}: WorkspaceSidebarProps) {
  const allActive =
    !activeFolder && !activeTag && !pinnedOnly && !showArchived

  return (
    <aside className="flex h-full flex-col gap-5 overflow-y-auto rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Library
        </h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground xl:hidden"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <nav className="flex flex-col gap-1">
        <LibraryButton
          icon={StickyNote}
          label="All notes"
          count={noteCount}
          active={allActive}
          onClick={() => {
            onFolder(null)
            onTag(null)
            onPinned(false)
            onArchived(false)
          }}
        />
        <LibraryButton
          icon={Pin}
          label="Pinned"
          active={pinnedOnly}
          onClick={() => onPinned(!pinnedOnly)}
        />
        <LibraryButton
          icon={Archive}
          label="Archived"
          active={showArchived}
          onClick={() => onArchived(!showArchived)}
        />
      </nav>

      <section>
        <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Folder className="size-3.5" />
          Folders
        </h3>

        {folders.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Folders appear when you add one to a note.
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            {folders.map((folder) => (
              <button
                key={folder}
                type="button"
                onClick={() => onFolder(activeFolder === folder ? null : folder)}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm transition ${
                  activeFolder === folder
                    ? 'bg-p1/10 font-medium text-p1'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Folder className="size-3.5 shrink-0" />
                <span className="truncate">{folder}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Tags className="size-3.5" />
          Tags
        </h3>

        {tags.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Add tags in the editor to group notes.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, index) => (
              <button
                key={tag}
                type="button"
                onClick={() => onTag(activeTag === tag ? null : tag)}
                className={`chip chip-${(index % 5) + 1} ${
                  activeTag === tag ? 'ring-2 ring-ring' : ''
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </section>

      <p className="mt-auto text-[11px] leading-relaxed text-muted-foreground">
        Tip: press <kbd className="font-semibold">N</kbd> for a quick note and{' '}
        <kbd className="font-semibold">Ctrl K</kbd> to search.
      </p>
    </aside>
  )
}
