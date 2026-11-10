// ============================================================================
// RecurringForm.tsx — create / edit one recurring rule.
//
// The server owns the rules: it computes nextRunAt from startDate, clamps
// month-end dates and checks that the category belongs to the user. This form
// only collects input and calls the API.
//
// `nextRunAt` is deliberately absent: sending it is rejected by the validator,
// because a client that controls the schedule could make the worker loop.
// ============================================================================

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { useState } from 'react'
import { z } from 'zod'

import { useListCategoriesQuery } from '../../categories/services/categoryApi'
import {
  useCreateRecurringMutation,
  useUpdateRecurringMutation,
  type CreateRecurringInput,
  type RecurrenceFrequency,
  type RecurringTransaction,
} from '../services/recurringApi'

// Same helper shape as the other pages.
function getErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = (error as { data?: { message?: string } }).data
    if (data && typeof data.message === 'string') return data.message
  }
  return 'Something went wrong. Please try again.'
}

// Keep these lists identical to Currency / RecurrenceFrequency in recurringApi.ts.
const currencies = ['INR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD'] as const
const frequencies = ['daily', 'weekly', 'monthly', 'yearly'] as const

const frequencyLabels: Record<RecurrenceFrequency, string> = {
  daily: 'Day',
  weekly: 'Week',
  monthly: 'Month',
  yearly: 'Year',
}

// Captured once at module load, so the default date does not change on a
// re-render (React Compiler purity rule).
const TODAY = new Date().toISOString().slice(0, 10)

const inputClass =
  'h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50 disabled:opacity-50'

const ruleSchema = z
  .object({
    type: z.enum(['income', 'expense']),
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
    category: z.string().min(1, 'Pick a category'),
    description: z
      .string()
      .trim()
      .max(500, 'Description cannot exceed 500 characters'),
    frequency: z.enum(frequencies),
    // A text field so "every 2 weeks" works without fighting number inputs.
    interval: z
      .string()
      .trim()
      .refine(
        (value) => Number.isInteger(Number(value)),
        'Interval must be a whole number'
      )
      .refine(
        (value) => Number(value) >= 1 && Number(value) <= 12,
        'Interval must be between 1 and 12'
      ),
    startDate: z
      .string()
      .min(1, 'Pick a start date')
      .refine((value) => !Number.isNaN(Date.parse(value)), 'Pick a valid date'),
    endDate: z
      .string()
      .refine(
        (value) => value === '' || !Number.isNaN(Date.parse(value)),
        'Pick a valid date'
      ),
  })
  // The server repeats this check; the form checks first so the user sees the
  // error without a round trip.
  .refine(
    (values) =>
      values.endDate === '' ||
      new Date(values.endDate) > new Date(values.startDate),
    { message: 'End date must be after the start date', path: ['endDate'] }
  )

type RuleFormValues = z.infer<typeof ruleSchema>

interface RecurringFormProps {
  rule: RecurringTransaction | null
  onDone: () => void
}

export default function RecurringForm({ rule, onDone }: RecurringFormProps) {
  const [createRecurring, { isLoading: isCreating }] =
    useCreateRecurringMutation()
  const [updateRecurring, { isLoading: isUpdating }] =
    useUpdateRecurringMutation()
  const [serverError, setServerError] = useState('')

  // Only the categories that fit the chosen type are offered. "both" fits all.
  const { data: categoryData, isLoading: isLoadingCategories } =
    useListCategoriesQuery({ sort: 'name' })

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RuleFormValues>({
    resolver: zodResolver(ruleSchema),
    defaultValues: {
      type: rule?.type ?? 'expense',
      amount: rule ? String(rule.amount) : '',
      currency: rule?.currency ?? 'INR',
      category: rule?.category ?? '',
      description: rule?.description ?? '',
      frequency: rule?.frequency ?? 'monthly',
      interval: rule ? String(rule.interval) : '1',
      // input[type=date] needs exactly YYYY-MM-DD.
      startDate: rule ? rule.startDate.slice(0, 10) : TODAY,
      endDate: rule?.endDate ? rule.endDate.slice(0, 10) : '',
    },
  })

  // useWatch returns a value (not a function), so React Compiler can memoize
  // this component safely — `watch()` cannot.
  const selectedType = useWatch({ control, name: 'type' })
  const intervalValue = useWatch({ control, name: 'interval' })

  const categories = (categoryData?.categories ?? []).filter(
    (category) =>
      category.type === selectedType || category.type === 'both'
  )

  const onSubmit = async (values: RuleFormValues) => {
    setServerError('')

    const payload: CreateRecurringInput = {
      type: values.type,
      amount: Number(values.amount),
      currency: values.currency,
      category: values.category,
      frequency: values.frequency,
      interval: Number(values.interval),
      startDate: values.startDate,
    }

    if (values.description) payload.description = values.description
    if (values.endDate) payload.endDate = values.endDate

    try {
      if (rule) {
        // description / endDate are nullable: an empty field must CLEAR the
        // stored value, so it is sent as null, not omitted.
        await updateRecurring({
          id: rule._id,
          data: {
            ...payload,
            description: values.description || null,
            endDate: values.endDate || null,
          },
        }).unwrap()
      } else {
        await createRecurring(payload).unwrap()
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="rule-type" className="text-sm font-medium">
            Type
          </label>
          <select
            id="rule-type"
            {...register('type')}
            disabled={busy}
            className={inputClass}
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="rule-amount" className="text-sm font-medium">
            Amount
          </label>
          <input
            id="rule-amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="999"
            {...register('amount')}
            disabled={busy}
            className={inputClass}
          />
          {errors.amount && (
            <p className="text-xs text-destructive">{errors.amount.message}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="rule-currency" className="text-sm font-medium">
            Currency
          </label>
          <select
            id="rule-currency"
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
          <label htmlFor="rule-category" className="text-sm font-medium">
            Category
          </label>
          <select
            id="rule-category"
            {...register('category')}
            disabled={busy || isLoadingCategories}
            className={inputClass}
          >
            <option value="">
              {isLoadingCategories ? 'Loading…' : 'Pick a category'}
            </option>
            {categories.map((category) => (
              <option key={category._id} value={category._id}>
                {category.name}
              </option>
            ))}
          </select>
          {errors.category && (
            <p className="text-xs text-destructive">
              {errors.category.message}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="rule-description" className="text-sm font-medium">
          Description{' '}
          <span className="text-muted-foreground">(optional)</span>
        </label>
        <input
          id="rule-description"
          type="text"
          placeholder="Netflix subscription"
          {...register('description')}
          disabled={busy}
          className={inputClass}
        />
        {errors.description && (
          <p className="text-xs text-destructive">
            {errors.description.message}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="rule-frequency" className="text-sm font-medium">
            Repeats every
          </label>
          <div className="flex gap-2">
            <input
              id="rule-interval"
              type="number"
              min="1"
              max="12"
              step="1"
              aria-label="Interval"
              {...register('interval')}
              disabled={busy}
              className={`${inputClass} w-20`}
            />
            <select
              id="rule-frequency"
              {...register('frequency')}
              disabled={busy}
              className={`${inputClass} flex-1`}
            >
              {frequencies.map((frequency) => (
                <option key={frequency} value={frequency}>
                  {frequencyLabels[frequency]}
                  {Number(intervalValue) > 1 ? 's' : ''}
                </option>
              ))}
            </select>
          </div>
          {errors.interval && (
            <p className="text-xs text-destructive">
              {errors.interval.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="rule-start" className="text-sm font-medium">
            Starts on
          </label>
          <input
            id="rule-start"
            type="date"
            {...register('startDate')}
            disabled={busy}
            className={inputClass}
          />
          {errors.startDate && (
            <p className="text-xs text-destructive">
              {errors.startDate.message}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="rule-end" className="text-sm font-medium">
          Ends on <span className="text-muted-foreground">(optional)</span>
        </label>
        <input
          id="rule-end"
          type="date"
          {...register('endDate')}
          disabled={busy}
          className={inputClass}
        />
        {errors.endDate && (
          <p className="text-xs text-destructive">{errors.endDate.message}</p>
        )}
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="btn-3d sm">
          {busy ? 'Saving…' : rule ? 'Save changes' : 'Create rule'}
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
