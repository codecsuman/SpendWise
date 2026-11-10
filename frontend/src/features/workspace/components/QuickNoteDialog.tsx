// ============================================================================
// QuickNoteDialog.tsx — write a note without leaving the current page.
//
// Used by the Workspace header and by GlobalQuickActions in MainLayout.
// ============================================================================

import { zodResolver } from '@hookform/resolvers/zod'
import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

import {
  getApiErrorMessage,
  useCreateNoteMutation,
} from '../services/workspaceApi'
import {
  quickNoteSchema,
  type QuickNoteValues,
} from '../validation/workspace.schema'
import type { Note } from '../types/workspace.types'

interface QuickNoteDialogProps {
  open: boolean
  onClose: () => void
  onCreated: (note: Note) => void
}

export default function QuickNoteDialog({
  open,
  onClose,
  onCreated,
}: QuickNoteDialogProps) {
  const [serverError, setServerError] = useState('')
  const [createNote, { isLoading }] = useCreateNoteMutation()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<QuickNoteValues>({
    resolver: zodResolver(quickNoteSchema),
    defaultValues: { title: '', content: '' },
  })

  // Escape closes the dialog, like every other overlay on the site.
  useEffect(() => {
    if (!open) return

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  const close = () => {
    reset()
    setServerError('')
    onClose()
  }

  const onSubmit = async (values: QuickNoteValues) => {
    setServerError('')

    try {
      const result = await createNote({
        title: values.title.trim() || undefined,
        content: values.content.trim(),
      }).unwrap()

      reset()
      onCreated(result.note)
    } catch (err) {
      setServerError(getApiErrorMessage(err))
    }
  }

  const busy = isLoading || isSubmitting

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onMouseDown={close}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-note-title"
        onMouseDown={(event) => event.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-border bg-card p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="quick-note-title" className="text-base font-semibold">
            Quick note
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close quick note"
            className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-3"
          noValidate
        >
          {serverError && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {serverError}
            </p>
          )}

          <input
            type="text"
            placeholder="Title (optional)"
            autoFocus
            maxLength={120}
            {...register('title')}
            disabled={busy}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-ring/50 disabled:opacity-50"
          />
          {errors.title && (
            <p className="text-xs text-destructive">{errors.title.message}</p>
          )}

          <textarea
            rows={6}
            placeholder="Write it down before it disappears…"
            maxLength={50_000}
            {...register('content')}
            onKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                event.preventDefault()
                void handleSubmit(onSubmit)()
              }
            }}
            disabled={busy}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-ring/50 disabled:opacity-50"
          />
          {errors.content && (
            <p className="text-xs text-destructive">{errors.content.message}</p>
          )}

          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-muted-foreground">
              Ctrl + Enter to save
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={close}
                disabled={busy}
                className="h-9 rounded-md border border-border px-4 text-sm font-medium transition hover:bg-muted disabled:opacity-60"
              >
                Cancel
              </button>
              <button type="submit" disabled={busy} className="btn-3d sm">
                {busy ? 'Saving…' : 'Save note'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
