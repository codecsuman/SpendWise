// ============================================================================
// NoteToolbar.tsx — the small action strip above the note editor.
//
// It handles pin, archive, color, folder, delete and the auto-save status.
// The editor owns the values and passes them down.
// ============================================================================

import {
  Archive,
  ArchiveRestore,
  Check,
  ChevronLeft,
  Loader2,
  Pin,
  PinOff,
  Trash2,
} from 'lucide-react'

import {
  NOTE_COLORS,
  NOTE_COLOR_CLASSES,
  NOTE_COLOR_LABELS,
  type NoteColor,
} from '../types/workspace.types'

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

interface NoteToolbarProps {
  pinned: boolean
  archived: boolean
  color: NoteColor
  folder: string
  folders: string[]
  saveState: SaveState
  isDeleting?: boolean
  onTogglePin: () => void
  onToggleArchive: () => void
  onColorChange: (color: NoteColor) => void
  onFolderChange: (folder: string) => void
  onDelete: () => void
  onClose: () => void
}

const iconButton =
  'rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground'

export default function NoteToolbar({
  pinned,
  archived,
  color,
  folder,
  folders,
  saveState,
  isDeleting = false,
  onTogglePin,
  onToggleArchive,
  onColorChange,
  onFolderChange,
  onDelete,
  onClose,
}: NoteToolbarProps) {
  return (
    <div className="flex flex-col gap-2 border-b border-border bg-card/80 p-3">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onClose}
          className={`${iconButton} lg:hidden`}
          aria-label="Back to notes"
        >
          <ChevronLeft className="size-4" />
        </button>

        <button
          type="button"
          onClick={onTogglePin}
          className={iconButton}
          aria-label={pinned ? 'Unpin note' : 'Pin note'}
          title={pinned ? 'Unpin note' : 'Pin note'}
        >
          {pinned ? (
            <PinOff className="size-4" />
          ) : (
            <Pin className="size-4" />
          )}
        </button>

        <button
          type="button"
          onClick={onToggleArchive}
          className={iconButton}
          aria-label={archived ? 'Restore note' : 'Archive note'}
          title={archived ? 'Restore note' : 'Archive note'}
        >
          {archived ? (
            <ArchiveRestore className="size-4" />
          ) : (
            <Archive className="size-4" />
          )}
        </button>

        <span
          className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground"
          aria-live="polite"
        >
          {saveState === 'saving' && (
            <>
              <Loader2 className="size-3 animate-spin" />
              Saving…
            </>
          )}
          {saveState === 'saved' && (
            <>
              <Check className="size-3 text-income" />
              Saved
            </>
          )}
          {saveState === 'error' && (
            <span className="text-destructive">Not saved</span>
          )}
          {saveState === 'idle' && 'Auto-save on'}
        </span>

        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          className={`${iconButton} hover:bg-destructive/10 hover:text-destructive disabled:opacity-50`}
          aria-label="Delete note"
          title="Delete note"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-medium text-muted-foreground">
          Color
        </span>

        <div className="flex items-center gap-1">
          {NOTE_COLORS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onColorChange(value)}
              aria-label={`Use ${NOTE_COLOR_LABELS[value]} color`}
              title={NOTE_COLOR_LABELS[value]}
              className={`size-4 rounded-full ${NOTE_COLOR_CLASSES[value].dot} ${
                color === value
                  ? 'ring-2 ring-foreground ring-offset-2 ring-offset-card'
                  : ''
              }`}
            />
          ))}
        </div>

        <label htmlFor="note-folder" className="ml-2 text-[11px] font-medium text-muted-foreground">
          Folder
        </label>
        <input
          id="note-folder"
          type="text"
          list="workspace-folder-options"
          value={folder}
          onChange={(event) => onFolderChange(event.target.value)}
          placeholder="No folder"
          maxLength={40}
          className="h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring/50"
        />
        <datalist id="workspace-folder-options">
          {folders.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </div>
    </div>
  )
}
