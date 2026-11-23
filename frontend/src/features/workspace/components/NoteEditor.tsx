// ============================================================================
// NoteEditor.tsx — the right-hand writing panel.
//
// New notes stay local until saved. Existing notes update on demand.
// ============================================================================

import { Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import {
  getApiErrorMessage,
  useCreateNoteMutation,
  useDeleteNoteMutation,
  useUpdateNoteMutation,
} from '../services/workspaceApi'
import {
  NOTE_COLOR_CLASSES,
  type Note,
  type NoteLink,
} from '../types/workspace.types'
import LinkedNotes from './LinkedNotes'
import NoteToolbar from './NoteToolbar'

interface NoteEditorProps {
  note?: Note
  folders: string[]
  onClose: () => void
  onCreated: (note: Note) => void
  onDeleted: () => void
  onStateChange: (dirty: boolean, busy: boolean) => void
}

function noteFields(note?: Note) {
  return {
    title: note?.title ?? '',
    content: note?.content ?? '',
    tags: note?.tags ?? [],
    folder: note?.folder ?? '',
    color: note?.color ?? 'teal',
    archived: note?.archived ?? false,
    links: note?.links ?? [],
  } as const
}

export default function NoteEditor({
  note,
  folders,
  onClose,
  onCreated,
  onDeleted,
  onStateChange,
}: NoteEditorProps) {
  const [savedFields, setSavedFields] = useState(() => noteFields(note))
  const [fields, setFields] = useState(savedFields)
  const { title, content, tags, folder, color, links } = fields
  const [pendingPin, setPendingPin] = useState<boolean | null>(null)
  const savedPin = note?.pinned ?? false
  const pinned = pendingPin ?? savedPin
  const archived = fields.archived
  const [tagInput, setTagInput] = useState('')
  const [didSave, setDidSave] = useState(false)
  const [error, setError] = useState('')

  const [createNote, { isLoading: isCreating }] = useCreateNoteMutation()
  const [updateNote, { isLoading: isUpdating }] = useUpdateNoteMutation()
  const [deleteNote, { isLoading: isDeleting }] = useDeleteNoteMutation()
  const isSaving = isCreating || isUpdating
  const busy = isSaving || isDeleting
  const dirty =
    JSON.stringify(fields) !== JSON.stringify(savedFields) ||
    pinned !== savedPin ||
    Boolean(tagInput.trim())
  const canSave = note ? dirty : Boolean(title.trim() || content.trim())

  useEffect(() => {
    onStateChange(dirty, busy)
    return () => onStateChange(false, false)
  }, [busy, dirty, onStateChange])

  useEffect(() => {
    if (!dirty) return
    const warnOnExit = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warnOnExit)
    return () => window.removeEventListener('beforeunload', warnOnExit)
  }, [dirty])

  const setField = <Key extends keyof typeof fields>(key: Key, value: (typeof fields)[Key]) => {
    setFields((current) => ({ ...current, [key]: value }))
  }

  const tagsWithInput = () => {
    const value = tagInput.trim().replace(/^#/, '').slice(0, 24)

    if (!value || tags.includes(value)) return tags

    if (tags.length >= 10) {
      setError('A note can have at most 10 tags')
      return
    }

    return [...tags, value]
  }

  const addTag = () => {
    const nextTags = tagsWithInput()
    if (!nextTags) return
    setField('tags', nextTags)
    setTagInput('')
  }

  const handleSave = async () => {
    if (busy || !canSave) return
    setError('')

    const nextTags = tagsWithInput()
    if (!nextTags) return

    const data = {
      title: title.trim(),
      content,
      tags: nextTags,
      folder: folder.trim() || null,
      color,
      links,
    }

    try {
      if (!note) {
        const result = await createNote({ ...data, pinned }).unwrap()
        onCreated(result.note)
        return
      }

      const result = await updateNote({
        id: note._id,
        data: {
          ...data,
          ...(pinned !== savedPin ? { pinned } : {}),
          ...(archived !== savedFields.archived ? { archived } : {}),
        },
      }).unwrap()
      const nextFields = noteFields(result.note)
      setSavedFields(nextFields)
      setFields(nextFields)
      setPendingPin(null)
      setTagInput('')
      setDidSave(true)
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  const handleDelete = async () => {
    if (!note || busy) return
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
    <div className="flex h-full min-h-0 flex-col surface-card overflow-hidden" aria-busy={busy}>
      <div inert={busy}>
        <NoteToolbar
          pinned={pinned}
          archived={archived}
          color={color}
          folder={folder}
          folders={folders}
          onTogglePin={() => setPendingPin(pinned === savedPin ? !savedPin : null)}
          onToggleArchive={note ? () => setField('archived', !archived) : undefined}
          onColorChange={(value) => setField('color', value)}
          onFolderChange={(value) => setField('folder', value)}
          onClose={onClose}
        />
      </div>

      <div inert={busy} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        <input
          type="text"
          value={title}
          onChange={(event) => setField('title', event.target.value)}
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
                onClick={() => setField('tags', tags.filter((item) => item !== tag))}
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
                setField('tags', tags.slice(0, -1))
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
          onChange={(event) => setField('content', event.target.value)}
          placeholder="Start writing…"
          maxLength={50_000}
          aria-label="Note content"
          className="min-h-64 flex-1 resize-none rounded-xl border border-border bg-background p-4 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-ring/50"
        />

        <LinkedNotes links={links} onChange={(value: NoteLink[]) => setField('links', value)} />
      </div>

      <footer className="space-y-2 border-t border-border p-3">
        {error && <p role="alert" className="form-error">{error}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <span role="status" className="mr-auto text-xs text-muted-foreground">
            {isSaving ? 'Saving…' : dirty ? 'Unsaved changes' : didSave ? 'Updated' : ''}
          </span>
          {note && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className="button-secondary gap-2 text-destructive disabled:opacity-50"
            >
              <Trash2 className="size-4" aria-hidden="true" />
              {isDeleting ? 'Deleting…' : 'Delete'}
            </button>
          )}
          <button type="button" onClick={handleSave} disabled={busy || !canSave} className="button-primary">
            {note ? 'Update' : 'Save'}
          </button>
        </div>
      </footer>
    </div>
  )
}
