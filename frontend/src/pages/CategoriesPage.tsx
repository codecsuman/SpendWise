// ============================================================================
// CategoriesPage.tsx — manage the labels transactions are filed under.
//
// Create, rename, recolour and delete custom categories. The 11 default
// categories seeded at registration can be recoloured, but the server blocks
// renaming and deleting them (the UI disables those actions too).
//
// Subcategories (Food -> Grocery) are supported by the API but not shown here
// yet; the parent field stays null for categories created on this page.
// ============================================================================

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type { FormEvent } from 'react'
import { z } from 'zod'

import {
  useCreateCategoryMutation,
  useDeleteCategoryMutation,
  useListCategoriesQuery,
  useUpdateCategoryMutation,
  type Category,
  type CategoryType,
} from '../features/categories/services/categoryApi'

// Same helper shape as the other pages.
function getErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = (error as { data?: { message?: string } }).data
    if (data && typeof data.message === 'string') return data.message
  }
  return 'Something went wrong. Please try again.'
}

const typeLabels: Record<CategoryType, string> = {
  income: 'Income',
  expense: 'Expense',
  both: 'Both',
}

const typeClasses: Record<CategoryType, string> = {
  income: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  expense: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  both: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
}

const inputClass =
  'h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50 disabled:opacity-50'

// --- FORM ------------------------------------------------------------------

const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(40, 'Name cannot exceed 40 characters'),
  type: z.enum(['income', 'expense', 'both']),
  icon: z.string().trim().max(50, 'Icon name cannot exceed 50 characters'),
  color: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i, 'Use a hex value like #22c55e'),
  description: z
    .string()
    .trim()
    .max(200, 'Description cannot exceed 200 characters'),
})

type CategoryFormValues = z.infer<typeof categorySchema>

interface CategoryFormProps {
  category: Category | null
  onDone: () => void
}

function CategoryForm({ category, onDone }: CategoryFormProps) {
  const [createCategory, { isLoading: isCreating }] = useCreateCategoryMutation()
  const [updateCategory, { isLoading: isUpdating }] = useUpdateCategoryMutation()
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name ?? '',
      type: category?.type ?? 'expense',
      icon: category?.icon ?? 'Tag',
      color: category?.color ?? '#6b7280',
      description: category?.description ?? '',
    },
  })

  const onSubmit = async (values: CategoryFormValues) => {
    setServerError('')

    // Empty strings are not useful to the API: skip description, and let
    // icon fall back to the model default.
    const payload = {
      name: values.name,
      type: values.type,
      icon: values.icon || 'Tag',
      color: values.color,
      description: values.description || undefined,
    }

    try {
      if (category) {
        await updateCategory({ id: category._id, data: payload }).unwrap()
      } else {
        await createCategory(payload).unwrap()
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
        <label htmlFor="category-name" className="text-sm font-medium">
          Name
        </label>
        <input
          id="category-name"
          type="text"
          {...register('name')}
          disabled={busy || category?.isDefault}
          className={inputClass}
        />
        {category?.isDefault ? (
          <p className="text-xs text-muted-foreground">
            Default categories cannot be renamed.
          </p>
        ) : (
          errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="category-type" className="text-sm font-medium">
            Type
          </label>
          <select
            id="category-type"
            {...register('type')}
            disabled={busy}
            className={inputClass}
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
            <option value="both">Both</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="category-color" className="text-sm font-medium">
            Colour
          </label>
          <div className="flex items-center gap-2">
            <input
              id="category-color"
              type="color"
              {...register('color')}
              disabled={busy}
              className="h-9 w-12 cursor-pointer rounded-md border border-input bg-background p-1"
            />
            <input
              type="text"
              {...register('color')}
              disabled={busy}
              className={`${inputClass} flex-1 font-mono`}
            />
          </div>
          {errors.color && (
            <p className="text-xs text-destructive">{errors.color.message}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="category-icon" className="text-sm font-medium">
          Lucide icon name
        </label>
        <input
          id="category-icon"
          type="text"
          placeholder="Tag"
          {...register('icon')}
          disabled={busy}
          className={inputClass}
        />
        {errors.icon && (
          <p className="text-xs text-destructive">{errors.icon.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="category-description" className="text-sm font-medium">
          Description <span className="text-muted-foreground">(optional)</span>
        </label>
        <input
          id="category-description"
          type="text"
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

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy || category?.isDefault}
          className="flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
        >
          {busy && <Loader2 className="size-4 animate-spin" />}
          {category ? 'Save changes' : 'Create category'}
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

export default function CategoriesPage() {
  const [type, setType] = useState<CategoryType | ''>('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)

  const { data, isLoading, isFetching, error } = useListCategoriesQuery({
    type: type || undefined,
    search: search || undefined,
    sort: 'name',
  })

  const [deleteCategory, { isLoading: isDeleting }] = useDeleteCategoryMutation()
  const [actionError, setActionError] = useState('')

  const categories = data?.categories ?? []

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (category: Category) => {
    setEditing(category)
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditing(null)
  }

  const applySearch = (event: FormEvent) => {
    event.preventDefault()
    setSearch(searchInput.trim())
  }

  const handleDelete = async (category: Category) => {
    if (!window.confirm(`Delete "${category.name}"?`)) return

    setActionError('')

    try {
      await deleteCategory(category._id).unwrap()
    } catch (error) {
      setActionError(getErrorMessage(error))
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
          <p className="text-sm text-muted-foreground">
            {categories.length} categor{categories.length === 1 ? 'y' : 'ies'}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          <Plus className="size-4" />
          New category
        </button>
      </header>

      {formOpen && (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">
              {editing ? `Edit ${editing.name}` : 'New category'}
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
          <CategoryForm
            key={editing?._id ?? 'new'}
            category={editing}
            onDone={closeForm}
          />
        </section>
      )}

      {/* ---------------- FILTERS ---------------- */}
      <section className="flex flex-wrap items-center gap-2">
        <form onSubmit={applySearch} className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search categories…"
              className="h-9 w-56 rounded-md border border-input bg-background pr-3 pl-8 text-sm outline-none focus:ring-2 focus:ring-ring/50"
            />
          </div>
          <button
            type="submit"
            className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            Search
          </button>
        </form>

        <select
          value={type}
          onChange={(event) => setType(event.target.value as CategoryType | '')}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring/50"
        >
          <option value="">All types</option>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
          <option value="both">Both</option>
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

      {/* ---------------- GRID ---------------- */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading categories…
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground shadow-sm">
          No categories match these filters.
          <span className="mt-1 block text-xs">
            Create one with “New category”, or add the defaults by re-running
            the seed step after registration.
          </span>
        </div>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => (
            <article
              key={category._id}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                  style={{ backgroundColor: category.color }}
                  aria-hidden="true"
                >
                  {category.name.charAt(0).toUpperCase()}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h2 className="truncate text-sm font-semibold">
                      {category.name}
                    </h2>
                    {category.isDefault && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        Default
                      </span>
                    )}
                  </div>
                  <span
                    className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${typeClasses[category.type]}`}
                  >
                    {typeLabels[category.type]}
                  </span>
                </div>

                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(category)}
                    aria-label={`Edit ${category.name}`}
                    className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(category)}
                    disabled={category.isDefault || isDeleting}
                    aria-label={`Delete ${category.name}`}
                    title={
                      category.isDefault
                        ? 'Default categories cannot be deleted'
                        : 'Delete category'
                    }
                    className="rounded-md p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>

              {category.description && (
                <p className="text-xs text-muted-foreground">
                  {category.description}
                </p>
              )}

              <p className="mt-auto text-[10px] text-muted-foreground">
                Icon: <span className="font-mono">{category.icon}</span>
              </p>
            </article>
          ))}
        </section>
      )}
    </div>
  )
}
