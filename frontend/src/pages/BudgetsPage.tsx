// ============================================================================
// BudgetsPage.tsx — set a monthly spending limit per category.
//
// The server returns `spent`, `remaining`, `percent` and `status` calculated
// from transactions, so this page only displays them. It never sends them back.
//
// One budget per category per month: the server enforces that with a unique
// index and answers 409 on a clash. The form also disables categories that
// already have a budget this month to avoid the error in the first place.
// ============================================================================

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import BudgetChart from '../components/charts/BudgetChart'
import {
  useCreateBudgetMutation,
  useDeleteBudgetMutation,
  useListBudgetsQuery,
  useUpdateBudgetMutation,
  type Budget,
  type BudgetSort,
  type BudgetStatus,
  type Currency,
} from '../features/budgets/services/budgetApi'
import {
  useListCategoriesQuery,
  type Category,
} from '../features/categories/services/categoryApi'

// Same helper shape as the other pages.
function getErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = (error as { data?: { message?: string } }).data
    if (data && typeof data.message === 'string') return data.message
  }
  return 'Something went wrong. Please try again.'
}

// "2026-11" for the current month, matching the server format.
function currentMonth(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${now.getFullYear()}-${month}`
}

function formatMoney(amount: number, currency: Currency): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
  }).format(amount)
}

const statusLabels: Record<BudgetStatus, string> = {
  normal: 'On track',
  warning: 'Close to limit',
  exceeded: 'Over budget',
}

const statusClasses: Record<BudgetStatus, string> = {
  normal: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  exceeded: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
}

const barClasses: Record<BudgetStatus, string> = {
  normal: 'bg-emerald-500',
  warning: 'bg-amber-500',
  exceeded: 'bg-rose-500',
}

const inputClass =
  'h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50 disabled:opacity-50'

// Keep this list identical to Currency in budgetApi.ts.
const currencies = ['INR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD'] as const

// --- FORM ------------------------------------------------------------------

const budgetSchema = z.object({
  category: z.string().regex(/^[a-f\d]{24}$/i, 'Choose a category'),
  amount: z
    .string()
    .trim()
    .min(1, 'Amount is required')
    .refine((value) => Number(value) > 0, 'Amount must be greater than 0')
    .refine(
      (value) => Number(value) <= 1_000_000_000,
      'Amount is too large'
    ),
  currency: z.enum(currencies),
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must look like YYYY-MM'),
})

type BudgetFormValues = z.infer<typeof budgetSchema>

interface BudgetFormProps {
  budget: Budget | null
  categories: Category[]
  usedCategories: string[]
  defaultMonth: string
  onDone: () => void
}

function BudgetForm({
  budget,
  categories,
  usedCategories,
  defaultMonth,
  onDone,
}: BudgetFormProps) {
  const [createBudget, { isLoading: isCreating }] = useCreateBudgetMutation()
  const [updateBudget, { isLoading: isUpdating }] = useUpdateBudgetMutation()
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      category: budget?.category ?? '',
      amount: budget ? String(budget.amount) : '',
      currency: budget?.currency ?? 'INR',
      month: budget?.month ?? defaultMonth,
    },
  })

  // Income categories can never hold a spending budget (the server says 400).
  const expenseCategories = categories.filter(
    (category) => category.type !== 'income'
  )

  const onSubmit = async (values: BudgetFormValues) => {
    setServerError('')

    const payload = {
      category: values.category,
      amount: Number(values.amount),
      currency: values.currency,
      month: values.month,
    }

    try {
      if (budget) {
        await updateBudget({ id: budget.id, data: payload }).unwrap()
      } else {
        await createBudget(payload).unwrap()
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
        <label htmlFor="budget-category" className="text-sm font-medium">
          Category
        </label>
        <select
          id="budget-category"
          {...register('category')}
          disabled={busy}
          className={inputClass}
        >
          <option value="">Choose a category</option>
          {expenseCategories.map((category) => {
            const used =
              usedCategories.includes(category._id) &&
              category._id !== budget?.category

            return (
              <option key={category._id} value={category._id} disabled={used}>
                {category.name}
                {used ? ' (already budgeted)' : ''}
              </option>
            )
          })}
        </select>
        {errors.category && (
          <p className="text-xs text-destructive">{errors.category.message}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="budget-amount" className="text-sm font-medium">
            Amount
          </label>
          <input
            id="budget-amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="5000"
            {...register('amount')}
            disabled={busy}
            className={inputClass}
          />
          {errors.amount && (
            <p className="text-xs text-destructive">{errors.amount.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="budget-currency" className="text-sm font-medium">
            Currency
          </label>
          <select
            id="budget-currency"
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
          <label htmlFor="budget-month" className="text-sm font-medium">
            Month
          </label>
          <input
            id="budget-month"
            type="month"
            {...register('month')}
            disabled={busy}
            className={inputClass}
          />
          {errors.month && (
            <p className="text-xs text-destructive">{errors.month.message}</p>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
        >
          {busy && <Loader2 className="size-4 animate-spin" />}
          {budget ? 'Save changes' : 'Create budget'}
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

// --- PAGE ------------------------------------------------------------------

export default function BudgetsPage() {
  const [month, setMonth] = useState(currentMonth)
  const [sort, setSort] = useState<BudgetSort>('newest')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Budget | null>(null)

  const { data, isLoading, isFetching, error } = useListBudgetsQuery({
    month,
    sort,
  })

  // Needed to turn the ids in budgets into names, colours and types.
  const { data: categoryData } = useListCategoriesQuery({ sort: 'name' })

  const [deleteBudget, { isLoading: isDeleting }] = useDeleteBudgetMutation()
  const [actionError, setActionError] = useState('')

  const budgets = data?.budgets ?? []
  const categories = categoryData?.categories ?? []

  const categoryById = new Map(
    categories.map((category) => [category._id, category])
  )
  const usedCategories = budgets.map((budget) => budget.category)

  const chartRows = budgets
    .map((budget) => ({
      name: categoryById.get(budget.category)?.name ?? 'Unknown',
      percent: budget.percent,
      status: budget.status,
    }))
    .sort((a, b) => b.percent - a.percent)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (budget: Budget) => {
    setEditing(budget)
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditing(null)
  }

  const handleDelete = async (budget: Budget) => {
    const name = categoryById.get(budget.category)?.name ?? 'this budget'
    if (!window.confirm(`Delete the budget for "${name}"?`)) return

    setActionError('')

    try {
      await deleteBudget(budget.id).unwrap()
    } catch (err) {
      setActionError(getErrorMessage(err))
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Budgets</h1>
          <p className="text-sm text-muted-foreground">
            {budgets.length} budget{budgets.length === 1 ? '' : 's'} for {month}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          <Plus className="size-4" />
          New budget
        </button>
      </header>

      {formOpen && (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">
              {editing ? 'Edit budget' : 'New budget'}
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
          <BudgetForm
            key={editing?.id ?? 'new'}
            budget={editing}
            categories={categories}
            usedCategories={usedCategories}
            defaultMonth={month}
            onDone={closeForm}
          />
        </section>
      )}

      {/* ---------------- CHART ---------------- */}
      {budgets.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold">Budget usage</h2>
            <span className="text-xs text-muted-foreground">
              Dashed line = 100%
            </span>
          </div>
          <BudgetChart data={chartRows} />
        </section>
      )}

      {/* ---------------- FILTERS ---------------- */}
      <section className="flex flex-wrap items-center gap-2">
        <label
          htmlFor="budget-filter-month"
          className="text-sm text-muted-foreground"
        >
          Month
        </label>
        <input
          id="budget-filter-month"
          type="month"
          value={month}
          onChange={(event) => {
            // An empty value would be sent to the API and fail its regex.
            if (event.target.value) setMonth(event.target.value)
          }}
          className={inputClass}
        />

        <select
          value={sort}
          onChange={(event) => setSort(event.target.value as BudgetSort)}
          className={inputClass}
        >
          <option value="newest">Newest month</option>
          <option value="highest">Highest amount</option>
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
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading budgets…
        </div>
      ) : budgets.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground shadow-sm">
          No budgets for {month}.
          <span className="mt-1 block text-xs">
            Create one with “New budget”. Spending is calculated from your
            expense transactions in that month.
          </span>
        </div>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2">
          {budgets.map((budget) => {
            const category = categoryById.get(budget.category)
            const name = category?.name ?? 'Unknown category'

            return (
              <article
                key={budget.id}
                className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-semibold">{name}</h2>
                    <span
                      className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${statusClasses[budget.status]}`}
                    >
                      {statusLabels[budget.status]}
                    </span>
                  </div>

                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(budget)}
                      aria-label={`Edit budget for ${name}`}
                      className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(budget)}
                      disabled={isDeleting}
                      aria-label={`Delete budget for ${name}`}
                      className="rounded-md p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-medium">
                      {formatMoney(budget.spent, budget.currency)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      of {formatMoney(budget.amount, budget.currency)}
                    </span>
                  </div>

                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${barClasses[budget.status]}`}
                      style={{ width: `${Math.min(budget.percent, 100)}%` }}
                    />
                  </div>

                  <div className="mt-1.5 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {budget.percent.toFixed(1)}% used
                    </span>
                    <span
                      className={
                        budget.remaining < 0
                          ? 'font-medium text-destructive'
                          : 'text-muted-foreground'
                      }
                    >
                      {budget.remaining < 0
                        ? `${formatMoney(
                            Math.abs(budget.remaining),
                            budget.currency
                          )} over`
                        : `${formatMoney(
                            budget.remaining,
                            budget.currency
                          )} left`}
                    </span>
                  </div>
                </div>
              </article>
            )
          })}
        </section>
      )}
    </div>
  )
}
