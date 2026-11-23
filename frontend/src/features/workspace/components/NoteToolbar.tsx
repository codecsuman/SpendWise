// ============================================================================
// NoteToolbar.tsx — the small action strip above the note editor.
//
// It handles note organization and returning to the list.
// The editor owns the values and passes them down.
// ============================================================================

import {
  Archive,
  ArchiveRestore,
  ChevronLeft,
  Pin,
  PinOff,
} from 'lucide-react'

import {
  NOTE_COLORS,
  NOTE_COLOR_CLASSES,
  NOTE_COLOR_LABELS,
  type NoteColor,
} from '../types/workspace.types'

interface NoteToolbarProps {
  pinned: boolean
  archived: boolean
  color: NoteColor
  folder: string
  folders: string[]
  onTogglePin: () => void
  onToggleArchive?: () => void
  onColorChange: (color: NoteColor) => void
  onFolderChange: (folder: string) => void
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
  onTogglePin,
  onToggleArchive,
  onColorChange,
  onFolderChange,
  onClose,
}: NoteToolbarProps) {
  return (
    <div className="flex flex-col gap-2 border-b border-border bg-card/80 p-3">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onClose}
          className={iconButton}
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

        {onToggleArchive && (
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
        )}
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
          className="control-height min-w-0 flex-1 form-control px-3"
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
