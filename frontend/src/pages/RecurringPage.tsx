// ============================================================================
// RecurringPage.tsx — bills and income that repeat on a schedule.
//
// A recurring rule is a template, not money: it stores "999, Entertainment,
// every month, from 20 Nov". The backend scheduler turns it into a real
// Transaction when nextRunAt is due.
//
// This page only lists, creates, edits, pauses and deletes rules. It never
// creates transactions itself, and it never sends nextRunAt — the server owns
// the schedule.
// ============================================================================

import { Loader2, Plus, Repeat, X } from 'lucide-react'
import { useState } from 'react'

import RecurringCard from '../features/recurring/components/RecurringCard'
import RecurringForm from '../features/recurring/components/RecurringForm'
import {
  useDeleteRecurringMutation,
  useListRecurringQuery,
  useSetRecurringActiveMutation,
  type RecurrenceFrequency,
  type RecurringSort,
  type RecurringTransaction,
} from '../features/recurring/services/recurringApi'
import { useListCategoriesQuery } from '../features/categories/services/categoryApi'

// Same helper shape as the other pages.
function getErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = (error as { data?: { message?: string } }).data
    if (data && typeof data.message === 'string') return data.message
  }
  return 'Something went wrong. Please try again.'
}

// Captured once at module load so the "due soon" count does not change on a
// re-render (React Compiler purity rule).
const NOW_MS = Date.now()
const SOON_MS = 7 * 24 * 60 * 60 * 1000

const inputClass =
  'h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50'

const frequencyOptions: { value: RecurrenceFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
]

export default function RecurringPage() {
  const [status, setStatus] = useState<'all' | 'active' | 'paused'>('all')
  const [frequency, setFrequency] = useState<RecurrenceFrequency | 'all'>('all')
  const [sort, setSort] = useState<RecurringSort>('nextRun')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<RecurringTransaction | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')

  const { data, isLoading, isFetching, error } = useListRecurringQuery({
    // The backend expects text: 'true' / 'false'.
    isActive:
      status === 'all' ? undefined : status === 'active' ? 'true' : 'false',
    frequency: frequency === 'all' ? undefined : frequency,
    sort,
  })

  const { data: categoryData } = useListCategoriesQuery({ sort: 'name' })
  const [deleteRecurring] = useDeleteRecurringMutation()
  const [setActive] = useSetRecurringActiveMutation()

  const rules = data?.recurring ?? []
  const categories = categoryData?.categories ?? []

  const categoryById = new Map(
    categories.map((category) => [category._id, category])
  )

  const activeCount = rules.filter((rule) => rule.isActive).length
  const pausedCount = rules.length - activeCount
  const dueSoonCount = rules.filter(
    (rule) =>
      rule.isActive &&
      new Date(rule.nextRunAt).getTime() - NOW_MS <= SOON_MS
  ).length

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (rule: RecurringTransaction) => {
    setEditing(rule)
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditing(null)
  }

  const handleDelete = async (rule: RecurringTransaction) => {
    const label = rule.description || 'this rule'
    if (!window.confirm(`Delete ${label}?`)) return

    setActionError('')
    setBusyId(rule._id)

    try {
      await deleteRecurring(rule._id).unwrap()
    } catch (err) {
      setActionError(getErrorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  const handleToggle = async (rule: RecurringTransaction) => {
    setActionError('')
    setBusyId(rule._id)

    try {
      await setActive({ id: rule._id, isActive: !rule.isActive }).unwrap()
    } catch (err) {
      setActionError(getErrorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Repeat className="size-5 text-p1" />
            Recurring
          </h1>
          <p className="text-sm text-muted-foreground">
            {rules.length} rule{rules.length === 1 ? '' : 's'} shown
          </p>
        </div>
        <button type="button" onClick={openCreate} className="btn-3d sm">
          <Plus className="mr-1 inline size-4" />
          New rule
        </button>
      </header>

      {formOpen && (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">
              {editing ? 'Edit rule' : 'New rule'}
            </h2>
            <button
              type="button"
              onClick={closeForm}
              aria-label="Close form"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
          <RecurringForm
            key={editing?._id ?? 'new'}
            rule={editing}
            onDone={closeForm}
          />
        </section>
      )}

      {/* ---------------- STATS ---------------- */}
      <section className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="stat-card c1">
          <p className="text-xs text-muted-foreground">Rules shown</p>
          <p className="mt-1 text-2xl font-bold">{rules.length}</p>
        </div>
        <div className="stat-card c2">
          <p className="text-xs text-muted-foreground">Active</p>
          <p className="mt-1 text-2xl font-bold">{activeCount}</p>
        </div>
        <div className="stat-card c3">
          <p className="text-xs text-muted-foreground">Paused</p>
          <p className="mt-1 text-2xl font-bold">{pausedCount}</p>
        </div>
        <div className="stat-card c4">
          <p className="text-xs text-muted-foreground">Due within 7 days</p>
          <p className="mt-1 text-2xl font-bold">{dueSoonCount}</p>
        </div>
      </section>

      {/* ---------------- FILTERS ---------------- */}
      <section className="flex flex-wrap items-center gap-2">
        <select
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as 'all' | 'active' | 'paused')
          }
          aria-label="Filter by state"
          className={inputClass}
        >
          <option value="all">All states</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
        </select>

        <select
          value={frequency}
          onChange={(event) =>
            setFrequency(event.target.value as RecurrenceFrequency | 'all')
          }
          aria-label="Filter by frequency"
          className={inputClass}
        >
          <option value="all">All frequencies</option>
          {frequencyOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(event) => setSort(event.target.value as RecurringSort)}
          aria-label="Sort rules"
          className={inputClass}
        >
          <option value="nextRun">Next run</option>
          <option value="newest">Newest</option>
        </select>

        {isFetching && !isLoading && (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        )}
      </section>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {getErrorMessage(error)}
        </p>
      )}
      {actionError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {actionError}
        </p>
      )}

      {/* ---------------- LIST ---------------- */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="skeleton h-44" />
          <div className="skeleton h-44" />
        </div>
      ) : rules.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground shadow-sm">
          No recurring rules match these filters.
          <span className="mt-1 block text-xs">
            Add rent, subscriptions or salary with “New rule”. The server
            recomputes the next run from the start date, so a paused rule keeps
            its schedule.
          </span>
        </div>
      ) : (
        <section className="stagger grid gap-4 sm:grid-cols-2">
          {rules.map((rule) => (
            <RecurringCard
              key={rule._id}
              rule={rule}
              category={categoryById.get(rule.category)}
              isBusy={busyId === rule._id}
              onEdit={openEdit}
              onDelete={handleDelete}
              onToggle={handleToggle}
            />
          ))}
        </section>
      )}
    </div>
  )
}
