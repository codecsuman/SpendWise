// ============================================================================
// LinkedNotes.tsx — connect a note to a transaction, budget, goal or category
// without copying the record into the note.
//
// The picker is only mounted when the user opens it, so the extra list
// requests do not run on every note.
// ============================================================================

import { Link2, Plus, X } from 'lucide-react'
import { useState } from 'react'

import { useListBudgetsQuery } from '../../budgets/services/budgetApi'
import { useListCategoriesQuery } from '../../categories/services/categoryApi'
import { useListGoalsQuery } from '../../goals/services/goalApi'
import { useListTransactionsQuery } from '../../transactions/services/transactionApi'
import {
  RESOURCE_LABELS,
  type NoteLink,
  type NoteResourceType,
} from '../types/workspace.types'

interface LinkedNotesProps {
  links: NoteLink[]
  onChange: (links: NoteLink[]) => void
}

interface ResourceOption {
  id: string
  label: string
}

interface ResourcePickerProps {
  onAdd: (link: NoteLink) => void
}

const selectClass =
  'h-9 min-w-0 rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring/50'

function ResourcePicker({ onAdd }: ResourcePickerProps) {
  const [type, setType] = useState<NoteResourceType>('goal')
  const [resourceId, setResourceId] = useState('')

  // Each list loads only when its tab is selected. RTK Query caches the
  // result, so opening the picker again is instant.
  const { data: goalsData } = useListGoalsQuery(undefined, {
    skip: type !== 'goal',
  })
  const { data: budgetsData } = useListBudgetsQuery(undefined, {
    skip: type !== 'budget',
  })
  const { data: categoriesData } = useListCategoriesQuery(undefined, {
    skip: type !== 'budget' && type !== 'category',
  })
  const { data: transactionsData } = useListTransactionsQuery(
    { limit: 20, sort: 'newest' },
    { skip: type !== 'transaction' }
  )

  const categoryNames = new Map(
    (categoriesData?.categories ?? []).map((category) => [
      category._id,
      category.name,
    ])
  )

  let options: ResourceOption[] = []

  if (type === 'goal') {
    options = (goalsData?.goals ?? []).map((goal) => ({
      id: goal._id,
      label: goal.name,
    }))
  } else if (type === 'budget') {
    options = (budgetsData?.budgets ?? []).map((budget) => ({
      id: budget.id,
      label: `${categoryNames.get(budget.category) ?? 'Budget'} · ${budget.month}`,
    }))
  } else if (type === 'category') {
    options = (categoriesData?.categories ?? []).map((category) => ({
      id: category._id,
      label: category.name,
    }))
  } else {
    options = (transactionsData?.transactions ?? []).map((transaction) => ({
      id: transaction._id,
      label: `${
        transaction.description ||
        (transaction.type === 'income' ? 'Income' : 'Expense')
      } · ${transaction.amount} ${transaction.currency}`,
    }))
  }

  const selected = options.find((option) => option.id === resourceId)

  return (
    <div className="mt-3 flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <select
          value={type}
          onChange={(event) => {
            setType(event.target.value as NoteResourceType)
            setResourceId('')
          }}
          aria-label="Resource type"
          className={selectClass}
        >
          {Object.entries(RESOURCE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <select
          value={resourceId}
          onChange={(event) => setResourceId(event.target.value)}
          aria-label="Resource"
          className={selectClass}
        >
          <option value="">Choose a {RESOURCE_LABELS[type].toLowerCase()}…</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {options.length === 0 && (
        <p className="text-[11px] text-muted-foreground">
          No {RESOURCE_LABELS[type].toLowerCase()} records yet.
        </p>
      )}

      <button
        type="button"
        disabled={!selected}
        onClick={() => {
          if (!selected) return
          onAdd({ type, id: selected.id, label: selected.label })
        }}
        className="btn-3d sm self-start"
      >
        <Plus className="mr-1 inline size-3.5" />
        Link
      </button>
    </div>
  )
}

export default function LinkedNotes({ links, onChange }: LinkedNotesProps) {
  const [open, setOpen] = useState(false)

  const handleAdd = (link: NoteLink) => {
    // Do not add the same record twice.
    const exists = links.some(
      (item) => item.type === link.type && item.id === link.id
    )

    if (!exists) onChange([...links, link])

    setOpen(false)
  }

  return (
    <section className="rounded-xl border border-border bg-background/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold">
          <Link2 className="size-3.5" />
          Linked resources
        </h3>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          {open ? 'Cancel' : 'Add link'}
        </button>
      </div>

      {open && <ResourcePicker onAdd={handleAdd} />}

      {links.length === 0 ? (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Link a transaction, budget, goal or category to keep context in one
          place.
        </p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1.5">
          {links.map((link) => (
            <li
              key={`${link.type}-${link.id}`}
              className="flex items-center gap-2 rounded-lg bg-card px-2.5 py-1.5 text-xs"
            >
              <span className="rounded-full bg-p1/10 px-2 py-0.5 text-[10px] font-medium text-p1">
                {RESOURCE_LABELS[link.type]}
              </span>
              <span className="min-w-0 flex-1 truncate">{link.label}</span>
              <button
                type="button"
                onClick={() =>
                  onChange(
                    links.filter(
                      (item) =>
                        !(item.type === link.type && item.id === link.id)
                    )
                  )
                }
                aria-label={`Remove link to ${link.label}`}
                className="rounded-md p-0.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
