// ============================================================================
// NoteEditor.tsx — the right-hand writing panel.
//
// There is no Save button. Every change waits 800 ms, then sends a PATCH.
// Switching notes before the timer fires cancels the pending save.
// ============================================================================

import { X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import {
  getApiErrorMessage,
  useDeleteNoteMutation,
  useUpdateNoteMutation,
} from '../services/workspaceApi'
import {
  NOTE_COLOR_CLASSES,
  type Note,
  type NoteColor,
  type NoteLink,
} from '../types/workspace.types'
import LinkedNotes from './LinkedNotes'
import NoteToolbar, { type SaveState } from './NoteToolbar'

interface NoteEditorProps {
  note: Note
  folders: string[]
  onClose: () => void
  onDeleted: () => void
}

export default function NoteEditor({
  note,
  folders,
  onClose,
  onDeleted,
}: NoteEditorProps) {
  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.content)
  const [tags, setTags] = useState<string[]>(note.tags)
  const [tagInput, setTagInput] = useState('')
  const [folder, setFolder] = useState(note.folder ?? '')
  const [color, setColor] = useState<NoteColor>(note.color)
  const [pinned, setPinned] = useState(note.pinned)
  const [archived, setArchived] = useState(note.archived)
  const [links, setLinks] = useState<NoteLink[]>(note.links)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [error, setError] = useState('')

  const [updateNote] = useUpdateNoteMutation()
  const [deleteNote, { isLoading: isDeleting }] = useDeleteNoteMutation()

  // The first effect run happens right after mount. Saving there would send
  // an unnecessary PATCH every time the user opens a note.
  const firstRender = useRef(true)

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }

    const timer = window.setTimeout(async () => {
      setSaveState('saving')
      setError('')

      try {
        await updateNote({
          id: note._id,
          data: {
            title,
            content,
            tags,
            folder: folder.trim() || null,
            color,
            pinned,
            archived,
            links,
          },
        }).unwrap()

        setSaveState('saved')
      } catch (err) {
        setSaveState('error')
        setError(getApiErrorMessage(err))
      }
    }, 800)

    return () => window.clearTimeout(timer)
  }, [
    title,
    content,
    tags,
    folder,
    color,
    pinned,
    archived,
    links,
    note._id,
    updateNote,
  ])

  const addTag = () => {
    const value = tagInput.trim().replace(/^#/, '').slice(0, 24)

    if (!value) return

    if (tags.length >= 10) {
      setError('A note can have at most 10 tags')
      return
    }

    if (!tags.includes(value)) setTags([...tags, value])

    setTagInput('')
  }

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${note.title || 'Untitled note'}"?`)) return

    setError('')

    try {
      await deleteNote(note._id).unwrap()
      onDeleted()
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <NoteToolbar
        pinned={pinned}
        archived={archived}
        color={color}
        folder={folder}
        folders={folders}
        saveState={saveState}
        isDeleting={isDeleting}
        onTogglePin={() => setPinned((value) => !value)}
        onToggleArchive={() => setArchived((value) => !value)}
        onColorChange={setColor}
        onFolderChange={setFolder}
        onDelete={handleDelete}
        onClose={onClose}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Untitled note"
          maxLength={120}
          aria-label="Note title"
          className="w-full bg-transparent text-2xl font-bold tracking-tight outline-none placeholder:text-muted-foreground"
        />

        {/* Tag editor */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-background px-2 py-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${NOTE_COLOR_CLASSES[color].soft}`}
            >
              {tag}
              <button
                type="button"
                onClick={() => setTags(tags.filter((item) => item !== tag))}
                aria-label={`Remove tag ${tag}`}
                className="rounded-full p-0.5 transition hover:bg-foreground/10"
              >
                <X className="size-2.5" />
              </button>
            </span>
          ))}

          <input
            type="text"
            value={tagInput}
            onChange={(event) => setTagInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ',') {
                event.preventDefault()
                addTag()
              }

              if (
                event.key === 'Backspace' &&
                tagInput === '' &&
                tags.length > 0
              ) {
                setTags(tags.slice(0, -1))
              }
            }}
            onBlur={addTag}
            placeholder={tags.length === 0 ? 'Add a tag and press Enter' : 'Add tag…'}
            maxLength={24}
            className="h-7 min-w-24 flex-1 bg-transparent text-xs outline-none"
          />

          <span className="text-[10px] text-muted-foreground">
            {tags.length}/10
          </span>
        </div>

        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Start writing…"
          maxLength={50_000}
          aria-label="Note content"
          className="min-h-64 flex-1 resize-none rounded-xl border border-border bg-background p-4 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-ring/50"
        />

        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        )}

        <LinkedNotes links={links} onChange={setLinks} />

        <p className="text-[10px] text-muted-foreground">
          Auto-saves 800 ms after you stop typing. Plain text only for now.
        </p>
      </div>
    </div>
  )
}
