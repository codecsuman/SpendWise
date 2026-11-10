// ============================================================================
// WorkspacePage.tsx — notes, folders, tags, linked records and a calculator.
//
// Layout:
//   xl: sidebar | notes list | editor
//   lg: notes list | editor
//   mobile: one panel at a time
//
// The shell (MainLayout) already supplies page-workspace and the background.
// This page returns content only, never another page-wrap.
// ============================================================================

import { Plus, StickyNote } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import CalculatorPanel from '../features/workspace/components/CalculatorPanel'
import NoteEditor from '../features/workspace/components/NoteEditor'
import NoteFilters from '../features/workspace/components/NoteFilters'
import NoteSearch from '../features/workspace/components/NoteSearch'
import NotesGrid from '../features/workspace/components/NotesGrid'
import QuickNoteDialog from '../features/workspace/components/QuickNoteDialog'
import WorkspaceHeader from '../features/workspace/components/WorkspaceHeader'
import WorkspaceSidebar from '../features/workspace/components/WorkspaceSidebar'
import { useDebouncedValue } from '../features/workspace/hooks/useWorkspace'
import {
  getApiErrorMessage,
  useCreateNoteMutation,
  useGetNoteQuery,
  useListNotesQuery,
  useUpdateNoteMutation,
} from '../features/workspace/services/workspaceApi'
import type {
  Note,
  NoteListQuery,
  NoteSort,
} from '../features/workspace/types/workspace.types'

export default function WorkspacePage() {
  const { noteId } = useParams()
  const navigate = useNavigate()

  // Filters
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [folder, setFolder] = useState<string | null>(null)
  const [tag, setTag] = useState<string | null>(null)
  const [pinnedOnly, setPinnedOnly] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [sort, setSort] = useState<NoteSort>('updated')

  // Panels
  const [quickOpen, setQuickOpen] = useState(false)
  const [calcOpen, setCalcOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [actionError, setActionError] = useState('')

  const searchRef = useRef<HTMLInputElement>(null)

  // The URL is the source of truth for the open note, so a deep link works
  // and the browser Back button returns to the list.
  const selectedId = noteId ?? null

  const listQuery = useMemo<NoteListQuery>(
    () => ({
      search: debouncedSearch.trim() || undefined,
      folder: folder ?? undefined,
      tag: tag ?? undefined,
      pinned: pinnedOnly ? true : undefined,
      archived: showArchived ? true : undefined,
      sort,
      limit: 50,
    }),
    [debouncedSearch, folder, tag, pinnedOnly, showArchived, sort]
  )

  const {
    data: listData,
    isLoading,
    isFetching,
    error: listError,
  } = useListNotesQuery(listQuery)

  const {
    data: selectedData,
    isLoading: isNoteLoading,
    error: noteError,
  } = useGetNoteQuery(selectedId ?? '', { skip: !selectedId })

  const [createNote, { isLoading: isCreating }] = useCreateNoteMutation()
  const [updateNote] = useUpdateNoteMutation()

  const notes = useMemo(() => listData?.notes ?? [], [listData])
  const total = listData?.pagination.total ?? 0
  const selectedNote = selectedData?.note

  const folders = useMemo(
    () =>
      Array.from(
        new Set(
          notes
            .map((note) => note.folder)
            .filter((value): value is string => Boolean(value))
        )
      ).sort((a, b) => a.localeCompare(b)),
    [notes]
  )

  const tags = useMemo(
    () =>
      Array.from(new Set(notes.flatMap((note) => note.tags))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [notes]
  )

  const openNote = useCallback(
    (note: Note) => {
      navigate(`/workspace/${note._id}`)
    },
    [navigate]
  )

  const handleNew = useCallback(async () => {
    setActionError('')

    try {
      const result = await createNote({
        title: '',
        content: '',
        color: 'teal',
      }).unwrap()

      navigate(`/workspace/${result.note._id}`)
    } catch (err) {
      setActionError(getApiErrorMessage(err))
    }
  }, [createNote, navigate])

  const handleTogglePin = async (note: Note) => {
    setActionError('')

    try {
      await updateNote({
        id: note._id,
        data: { pinned: !note.pinned },
      }).unwrap()
    } catch (err) {
      setActionError(getApiErrorMessage(err))
    }
  }

  const clearFilters = () => {
    setFolder(null)
    setTag(null)
    setPinnedOnly(false)
    setShowArchived(false)
  }

  const closeEditor = () => {
    navigate('/workspace')
  }

  // N = new note, Ctrl/Cmd + K = focus search. Ignored while typing so the
  // shortcuts never steal a normal character.
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (quickOpen || calcOpen || event.repeat) return

      const target = event.target as HTMLElement | null
      const typing = target?.closest(
        'input, textarea, select, [contenteditable="true"]'
      )

      if (typing) return

      if (
        event.key.toLowerCase() === 'n' &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        event.preventDefault()
        void handleNew()
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleNew, quickOpen, calcOpen])

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <WorkspaceHeader
        noteCount={total}
        isFetching={isFetching}
        isCreating={isCreating}
        onNew={() => void handleNew()}
        onQuickNote={() => setQuickOpen(true)}
        onCalculator={() => setCalcOpen(true)}
        onOpenFilters={() => setSidebarOpen(true)}
      />

      {actionError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {actionError}
        </p>
      )}

      {listError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {getApiErrorMessage(listError)}
        </p>
      )}

      <div className="grid min-h-0 gap-4 lg:h-[calc(100vh-12rem)] lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[220px_300px_minmax(0,1fr)]">
        {/* Mobile backdrop for the filter drawer */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-black/40 xl:hidden"
          />
        )}

        {/* Sidebar: fixed drawer on mobile, first grid column on xl */}
        <div
          className={`fixed inset-y-0 left-0 z-40 w-72 p-3 transition-transform xl:static xl:z-auto xl:min-h-0 xl:w-auto xl:translate-x-0 xl:p-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <WorkspaceSidebar
            folders={folders}
            tags={tags}
            noteCount={total}
            activeFolder={folder}
            activeTag={tag}
            pinnedOnly={pinnedOnly}
            showArchived={showArchived}
            onFolder={setFolder}
            onTag={setTag}
            onPinned={(value) => {
              setPinnedOnly(value)
              if (value) setShowArchived(false)
            }}
            onArchived={(value) => {
              setShowArchived(value)
              if (value) setPinnedOnly(false)
            }}
            onClose={() => setSidebarOpen(false)}
          />
        </div>

        {/* Notes list */}
        <section
          className={`${
            selectedId ? 'hidden lg:flex' : 'flex'
          } min-h-0 flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm`}
        >
          <NoteSearch
            value={search}
            onChange={setSearch}
            inputRef={searchRef}
          />

          <NoteFilters
            sort={sort}
            onSort={setSort}
            activeFolder={folder}
            activeTag={tag}
            pinnedOnly={pinnedOnly}
            showArchived={showArchived}
            onFolder={setFolder}
            onTag={setTag}
            onPinned={setPinnedOnly}
            onArchived={setShowArchived}
            onClear={clearFilters}
          />

          <NotesGrid
            notes={notes}
            selectedId={selectedId}
            isLoading={isLoading}
            isFetching={isFetching}
            onSelect={openNote}
            onTogglePin={(note) => void handleTogglePin(note)}
            onNew={() => void handleNew()}
          />
        </section>

        {/* Editor */}
        <section
          className={`${
            selectedId ? 'flex' : 'hidden lg:flex'
          } min-h-0 flex-col`}
        >
          {isNoteLoading ? (
            <div className="skeleton h-full min-h-80" />
          ) : selectedNote ? (
            <NoteEditor
              key={selectedNote._id}
              note={selectedNote}
              folders={folders}
              onClose={closeEditor}
              onDeleted={closeEditor}
            />
          ) : selectedId && noteError ? (
            <div className="flex h-full min-h-80 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center">
              <p className="text-sm font-semibold">This note could not load</p>
              <p className="max-w-64 text-xs text-muted-foreground">
                {getApiErrorMessage(noteError)}
              </p>
              <button type="button" onClick={closeEditor} className="btn-3d sm">
                Back to all notes
              </button>
            </div>
          ) : (
            <div className="flex h-full min-h-80 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center">
              <div className="grid size-14 place-items-center rounded-2xl bg-p1/10 text-p1">
                <StickyNote className="size-7" />
              </div>
              <div>
                <p className="text-sm font-semibold">Select a note</p>
                <p className="mt-1 max-w-64 text-xs leading-relaxed text-muted-foreground">
                  Pick a card from the list, or write a quick note without
                  leaving the page.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQuickOpen(true)}
                className="btn-3d sm"
              >
                <Plus className="mr-1 inline size-4" />
                Quick note
              </button>
            </div>
          )}
        </section>
      </div>

      <QuickNoteDialog
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        onCreated={(note) => {
          setQuickOpen(false)
          openNote(note)
        }}
      />

      <CalculatorPanel open={calcOpen} onClose={() => setCalcOpen(false)} />
    </div>
  )
}
