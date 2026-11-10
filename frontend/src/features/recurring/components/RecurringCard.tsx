// ============================================================================
// RecurringCard.tsx — one recurring rule.
//
// Shows what fires, how often, and when next. Pause/resume is a one-field
// PATCH, so the card owns that button instead of the form.
// ============================================================================

import { CalendarClock, Pause, Pencil, Play, Trash2 } from 'lucide-react'

import type { Category } from '../../categories/services/categoryApi'
import type {
  Currency,
  RecurrenceFrequency,
  RecurringTransaction,
} from '../services/recurringApi'

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

const unitLabels: Record<RecurrenceFrequency, string> = {
  daily: 'day',
  weekly: 'week',
  monthly: 'month',
  yearly: 'year',
}

// "Every month" for interval 1, "Every 3 months" otherwise.
function describeSchedule(
  frequency: RecurrenceFrequency,
  interval: number
): string {
  const unit = unitLabels[frequency]
  return interval === 1 ? `Every ${unit}` : `Every ${interval} ${unit}s`
}

// Captured once at module load. Deadlines are a day-level fact, and reading
// the clock during render makes the component impure (React Compiler rule).
const NOW_MS = Date.now()
const SOON_MS = 7 * 24 * 60 * 60 * 1000

interface RecurringCardProps {
  rule: RecurringTransaction
  category?: Category
  isBusy: boolean
  onEdit: (rule: RecurringTransaction) => void
  onDelete: (rule: RecurringTransaction) => void
  onToggle: (rule: RecurringTransaction) => void
}

export default function RecurringCard({
  rule,
  category,
  isBusy,
  onEdit,
  onDelete,
  onToggle,
}: RecurringCardProps) {
  const nextMs = new Date(rule.nextRunAt).getTime()
  const overdue = rule.isActive && nextMs < NOW_MS
  const dueSoon = rule.isActive && !overdue && nextMs - NOW_MS <= SOON_MS
  const isIncome = rule.type === 'income'

  return (
    <article className="card-lift flex flex-col gap-4 border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {/* Category badge. The color comes from the database, not a fixed hex. */}
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold"
            style={{
              backgroundColor: category ? `${category.color}22` : undefined,
              color: category?.color,
            }}
            aria-hidden
          >
            {category?.icon ?? (isIncome ? '↓' : '↑')}
          </span>

          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold">
              {rule.description || category?.name || 'Recurring rule'}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <span
                className={`inline-block rounded-full px-2 py-0.5 font-medium ${
                  isIncome
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-destructive/10 text-destructive'
                }`}
              >
                {isIncome ? 'Income' : 'Expense'}
              </span>
              <span>{describeSchedule(rule.frequency, rule.interval)}</span>
              {category && <span>{category.name}</span>}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => onToggle(rule)}
            disabled={isBusy}
            aria-label={
              rule.isActive
                ? `Pause ${rule.description ?? 'rule'}`
                : `Resume ${rule.description ?? 'rule'}`
            }
            className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            {rule.isActive ? (
              <Pause className="size-4" />
            ) : (
              <Play className="size-4" />
            )}
          </button>
          <button
            type="button"
            onClick={() => onEdit(rule)}
            aria-label={`Edit ${rule.description ?? 'rule'}`}
            className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <Pencil className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(rule)}
            disabled={isBusy}
            aria-label={`Delete ${rule.description ?? 'rule'}`}
            className="rounded-md p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex items-end justify-between gap-3">
        <p
          className={`text-xl font-bold ${
            isIncome ? 'amount-income' : 'amount-expense'
          }`}
        >
          {isIncome ? '+' : '−'}
          {formatMoney(rule.amount, rule.currency)}
        </p>

        <div className="text-right">
          <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
            <CalendarClock className="size-3.5" />
            {rule.isActive ? 'Next' : 'Paused until'} {formatDate(rule.nextRunAt)}
          </p>
          {overdue && (
            <span className="mt-1 inline-block text-[11px] font-medium text-warning">
              Overdue
            </span>
          )}
          {dueSoon && (
            <span className="mt-1 inline-block text-[11px] font-medium text-p1">
              Due within a week
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-3 text-[11px] text-muted-foreground">
        <span>Started {formatDate(rule.startDate)}</span>
        {rule.endDate && <span>Ends {formatDate(rule.endDate)}</span>}
        <span>
          {rule.lastRunAt
            ? `Last run ${formatDate(rule.lastRunAt)}`
            : 'Never run yet'}
        </span>
      </div>
    </article>
  )
}
