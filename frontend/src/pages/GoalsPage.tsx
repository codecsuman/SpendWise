// ============================================================================
// GoalsPage.tsx — savings goals with a target amount and a target date.
//
// The server owns the rules: it rounds money, rejects bad dates, and marks a
// goal "completed" automatically when savedAmount reaches targetAmount.
// This page only collects input, calls the API, and draws the result.
//
// Adding money has its own endpoint (POST /api/goals/:id/contribute), so the
// form below stays read-only about the rest of the goal.
// ============================================================================

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import GoalProgressChart from '../components/charts/GoalProgressChart'
import {
  useContributeToGoalMutation,
  useCreateGoalMutation,
  useDeleteGoalMutation,
  useListGoalsQuery,
  useUpdateGoalMutation,
  type CreateGoalInput,
  type Currency,
  type Goal,
  type GoalSort,
  type GoalStatus,
} from '../features/goals/services/goalApi'

// Same helper shape as the other pages.
function getErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = (error as { data?: { message?: string } }).data
    if (data && typeof data.message === 'string') return data.message
  }
  return 'Something went wrong. Please try again.'
}

function formatMoney(amount: number, currency: Currency): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
  }).format(amount)
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

// Saved / target, capped at 100 so the ring and bar never overflow.
function percentOf(goal: Goal): number {
  if (goal.targetAmount <= 0) return 0
  return Math.min(100, (goal.savedAmount / goal.targetAmount) * 100)
}

// Captured once at module load. "Overdue" is a day-level fact, and reading
// the clock during render makes the component impure (React Compiler rule).
const TODAY_MS = Date.now()

const statusLabels: Record<GoalStatus, string> = {
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const statusClasses: Record<GoalStatus, string> = {
  active: 'bg-primary/10 text-primary',
  completed: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  cancelled: 'bg-muted text-muted-foreground',
}

// Keep this list identical to Currency in goalApi.ts.
const currencies = ['INR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD'] as const

const inputClass =
  'h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50 disabled:opacity-50'

// --- FORM ------------------------------------------------------------------

const goalSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(80, 'Name must be at most 80 characters'),
  targetAmount: z
    .string()
    .trim()
    .min(1, 'Target amount is required')
    .refine((value) => Number(value) > 0, 'Target must be greater than 0')
    .refine(
      (value) => Number(value) <= 1_000_000_000,
      'Amount is too large'
    ),
  savedAmount: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || Number(value) >= 0,
      'Saved amount cannot be negative'
    )
    .refine(
      (value) => value === '' || Number(value) <= 1_000_000_000,
      'Amount is too large'
    ),
  currency: z.enum(currencies),
  targetDate: z
    .string()
    .min(1, 'Pick a target date')
    .refine(
      (value) => !Number.isNaN(Date.parse(value)),
      'Pick a valid date'
    ),
  note: z.string().trim().max(300, 'Note cannot exceed 300 characters'),
  status: z.enum(['active', 'completed', 'cancelled']),
})

type GoalFormValues = z.infer<typeof goalSchema>

interface GoalFormProps {
  goal: Goal | null
  onDone: () => void
}

function GoalForm({ goal, onDone }: GoalFormProps) {
  const [createGoal, { isLoading: isCreating }] = useCreateGoalMutation()
  const [updateGoal, { isLoading: isUpdating }] = useUpdateGoalMutation()
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      name: goal?.name ?? '',
      targetAmount: goal ? String(goal.targetAmount) : '',
      savedAmount: goal ? String(goal.savedAmount) : '',
      currency: goal?.currency ?? 'INR',
      // input[type=date] needs exactly YYYY-MM-DD.
      targetDate: goal ? goal.targetDate.slice(0, 10) : '',
      note: goal?.note ?? '',
      status: goal?.status ?? 'active',
    },
  })

  const onSubmit = async (values: GoalFormValues) => {
    setServerError('')

    const payload: CreateGoalInput = {
      name: values.name,
      targetAmount: Number(values.targetAmount),
      currency: values.currency,
      targetDate: values.targetDate,
    }

    if (values.savedAmount !== '') {
      payload.savedAmount = Number(values.savedAmount)
    }
    if (values.note) payload.note = values.note

    try {
      if (goal) {
        // status is only editable on an existing goal. A create request must
        // not send it: createGoalSchema rejects unknown keys.
        await updateGoal({
          id: goal._id,
          data: {
            ...payload,
            note: values.note || null,
            status: values.status,
          },
        }).unwrap()
      } else {
        await createGoal(payload).unwrap()
      }
      onDone()
    } catch (error) {
      setServerError(getErrorMessage(error))
    }
  }

  const busy = isCreating || isUpdating || isSubmitting

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      noValidate
    >
      {serverError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="goal-name" className="text-sm font-medium">
          Name
        </label>
        <input
          id="goal-name"
          type="text"
          placeholder="Emergency fund"
          {...register('name')}
          disabled={busy}
          className={inputClass}
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="goal-target" className="text-sm font-medium">
            Target amount
          </label>
          <input
            id="goal-target"
            type="number"
            step="0.01"
            min="0"
            placeholder="100000"
            {...register('targetAmount')}
            disabled={busy}
            className={inputClass}
          />
          {errors.targetAmount && (
            <p className="text-xs text-destructive">
              {errors.targetAmount.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="goal-saved" className="text-sm font-medium">
            Already saved
          </label>
          <input
            id="goal-saved"
            type="number"
            step="0.01"
            min="0"
            placeholder="0"
            {...register('savedAmount')}
            disabled={busy}
            className={inputClass}
          />
          {errors.savedAmount && (
            <p className="text-xs text-destructive">
              {errors.savedAmount.message}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="goal-currency" className="text-sm font-medium">
            Currency
          </label>
          <select
            id="goal-currency"
            {...register('currency')}
            disabled={busy}
            className={inputClass}
          >
            {currencies.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="goal-date" className="text-sm font-medium">
            Target date
          </label>
          <input
            id="goal-date"
            type="date"
            {...register('targetDate')}
            disabled={busy}
            className={inputClass}
          />
          {errors.targetDate && (
            <p className="text-xs text-destructive">
              {errors.targetDate.message}
            </p>
          )}
        </div>
      </div>

      {goal && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="goal-status" className="text-sm font-medium">
            Status
          </label>
          <select
            id="goal-status"
            {...register('status')}
            disabled={busy}
            className={inputClass}
          >
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="goal-note" className="text-sm font-medium">
          Note <span className="text-muted-foreground">(optional)</span>
        </label>
        <textarea
          id="goal-note"
          rows={3}
          placeholder="Why this goal matters"
          {...register('note')}
          disabled={busy}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50 disabled:opacity-50"
        />
        {errors.note && (
          <p className="text-xs text-destructive">{errors.note.message}</p>
        )}
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="btn-3d sm">
          {busy ? 'Saving…' : goal ? 'Save changes' : 'Create goal'}
        </button>
        <button
          type="button"
          onClick={onDone}
          disabled={busy}
          className="h-9 rounded-md border border-border px-4 text-sm font-medium transition hover:bg-muted disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

// --- CONTRIBUTE ------------------------------------------------------------

interface ContributeFormProps {
  goal: Goal
}

function ContributeForm({ goal }: ContributeFormProps) {
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const [contribute, { isLoading }] = useContributeToGoalMutation()

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    const value = Number(amount)

    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter an amount greater than 0')
      return
    }

    try {
      await contribute({ id: goal._id, amount: value }).unwrap()
      setAmount('')
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <input
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder={`Add money (${goal.currency})`}
          disabled={isLoading}
          className={`${inputClass} min-w-0 flex-1`}
        />
        <button type="submit" disabled={isLoading} className="btn-3d sm">
          {isLoading ? 'Adding…' : 'Add'}
        </button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  )
}

// --- CARD ------------------------------------------------------------------

interface GoalCardProps {
  goal: Goal
  isDeleting: boolean
  onEdit: (goal: Goal) => void
  onDelete: (goal: Goal) => void
}

function GoalCard({ goal, isDeleting, onEdit, onDelete }: GoalCardProps) {
  const percent = percentOf(goal)
  const remaining = Math.max(0, goal.targetAmount - goal.savedAmount)
  const overdue =
    goal.status === 'active' &&
    new Date(goal.targetDate).getTime() < TODAY_MS

  return (
    <article className="card-lift flex flex-col gap-4 border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">{goal.name}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${statusClasses[goal.status]}`}
            >
              {statusLabels[goal.status]}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {formatDate(goal.targetDate)}
            </span>
            {overdue && (
              <span className="text-[11px] font-medium text-warning">
                Overdue
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => onEdit(goal)}
            aria-label={`Edit ${goal.name}`}
            className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <Pencil className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(goal)}
            disabled={isDeleting}
            aria-label={`Delete ${goal.name}`}
            className="rounded-md p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div
          className="ring-progress shrink-0"
          style={{ '--target': percent } as CSSProperties}
        >
          <span className="text-sm">{Math.round(percent)}%</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="font-medium">
              {formatMoney(goal.savedAmount, goal.currency)}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              of {formatMoney(goal.targetAmount, goal.currency)}
            </span>
          </div>

          <div className="progress-track mt-2">
            <div
              className={`progress-fill ${
                goal.status === 'completed' ? 'ok' : ''
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>

          <p className="mt-1.5 text-xs text-muted-foreground">
            {goal.status === 'completed'
              ? 'Target reached'
              : goal.status === 'cancelled'
                ? 'Cancelled'
                : `${formatMoney(remaining, goal.currency)} to go`}
          </p>
        </div>
      </div>

      {goal.note && (
        <p className="text-xs text-muted-foreground">{goal.note}</p>
      )}

      {goal.status === 'active' && <ContributeForm goal={goal} />}
    </article>
  )
}

// --- PAGE ------------------------------------------------------------------

export default function GoalsPage() {
  const [status, setStatus] = useState<GoalStatus | 'all'>('all')
  const [sort, setSort] = useState<GoalSort>('target')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Goal | null>(null)

  const { data, isLoading, isFetching, error } = useListGoalsQuery({
    status: status === 'all' ? undefined : status,
    sort,
  })

  const [deleteGoal, { isLoading: isDeleting }] = useDeleteGoalMutation()
  const [actionError, setActionError] = useState('')

  const goals = data?.goals ?? []

  const activeGoals = goals.filter((goal) => goal.status === 'active')
  const completedCount = goals.filter(
    (goal) => goal.status === 'completed'
  ).length
  const averagePercent =
    activeGoals.length === 0
      ? 0
      : Math.round(
          activeGoals.reduce((sum, goal) => sum + percentOf(goal), 0) /
            activeGoals.length
        )

  const chartRows = goals.map((goal) => ({
    name: goal.name,
    percent: percentOf(goal),
    status: goal.status,
  }))

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (goal: Goal) => {
    setEditing(goal)
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditing(null)
  }

  const handleDelete = async (goal: Goal) => {
    if (!window.confirm(`Delete the goal "${goal.name}"?`)) return

    setActionError('')

    try {
      await deleteGoal(goal._id).unwrap()
    } catch (err) {
      setActionError(getErrorMessage(err))
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Goals</h1>
          <p className="text-sm text-muted-foreground">
            {goals.length} goal{goals.length === 1 ? '' : 's'} shown
          </p>
        </div>
        <button type="button" onClick={openCreate} className="btn-3d sm">
          <Plus className="mr-1 inline size-4" />
          New goal
        </button>
      </header>

      {formOpen && (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">
              {editing ? 'Edit goal' : 'New goal'}
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
          <GoalForm
            key={editing?._id ?? 'new'}
            goal={editing}
            onDone={closeForm}
          />
        </section>
      )}

      {/* ---------------- STATS ---------------- */}
      <section className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="stat-card c1">
          <p className="text-xs text-muted-foreground">Goals shown</p>
          <p className="mt-1 text-2xl font-bold">{goals.length}</p>
        </div>
        <div className="stat-card c2">
          <p className="text-xs text-muted-foreground">Active</p>
          <p className="mt-1 text-2xl font-bold">{activeGoals.length}</p>
        </div>
        <div className="stat-card c3">
          <p className="text-xs text-muted-foreground">Completed</p>
          <p className="mt-1 text-2xl font-bold">{completedCount}</p>
        </div>
        <div className="stat-card c4">
          <p className="text-xs text-muted-foreground">Avg. active progress</p>
          <p className="mt-1 text-2xl font-bold">{averagePercent}%</p>
        </div>
      </section>

      {/* ---------------- CHART ---------------- */}
      {goals.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold">Progress by goal</h2>
            <span className="text-xs text-muted-foreground">
              Dashed line = 100%
            </span>
          </div>
          <GoalProgressChart data={chartRows} />
        </section>
      )}

      {/* ---------------- FILTERS ---------------- */}
      <section className="flex flex-wrap items-center gap-2">
        <select
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as GoalStatus | 'all')
          }
          aria-label="Filter by status"
          className={inputClass}
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select
          value={sort}
          onChange={(event) => setSort(event.target.value as GoalSort)}
          aria-label="Sort goals"
          className={inputClass}
        >
          <option value="target">Target date</option>
          <option value="newest">Newest</option>
          <option value="progress">Progress</option>
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
          <div className="skeleton h-56" />
          <div className="skeleton h-56" />
        </div>
      ) : goals.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground shadow-sm">
          No goals match these filters.
          <span className="mt-1 block text-xs">
            Create one with “New goal”. The server completes it automatically
            when you reach the target.
          </span>
        </div>
      ) : (
        <section className="stagger grid gap-4 sm:grid-cols-2">
          {goals.map((goal) => (
            <GoalCard
              key={goal._id}
              goal={goal}
              isDeleting={isDeleting}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </section>
      )}
    </div>
  )
}
