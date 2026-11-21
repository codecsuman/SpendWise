import CustomSelect from '../components/ui/CustomSelect'
import DateField from '../components/DateField'
// ============================================================================
// TransactionsPage.tsx — the user's money in and out.
//
// The shared form creates and edits transactions using existing category IDs.
//
// The backend already scopes every row to the logged-in user, so this page
// never sends a user id — only filters.
// ============================================================================

import { ArrowLeft, ArrowRight, Loader2, Pencil, Search, Trash2 } from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useListCategoriesQuery } from '../features/categories/services/categoryApi'
import CsvPreview from '../features/csv/components/CsvPreview'
import TransactionForm from '../features/transactions/components/TransactionForm'

import {
  useDeleteTransactionMutation,
  useListTransactionsQuery,
  type Transaction,
  type TransactionSort,
  type TransactionType,
} from '../features/transactions/services/transactionApi'

const limit = 20

// Same helper shape as ProfilePage. Move it to src/lib later if a third page
// needs it.
function getErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = (error as { data?: { message?: string } }).data
    if (data && typeof data.message === 'string') return data.message
  }
  return 'Something went wrong. Please try again.'
}

// One transaction's amount in its own currency, e.g. ₹1,250.00
function formatAmount(transaction: Transaction): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: transaction.currency,
  }).format(transaction.amount)
}

export default function TransactionsPage() {
  const [page, setPage] = useState(1)
  const [type, setType] = useState<TransactionType | ''>('')
  const [category, setCategory] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [dateRange, setDateRange] = useState({ from: '', to: '' })
  const [dateFieldKey, setDateFieldKey] = useState(0)
  const [sort, setSort] = useState<TransactionSort>('newest')
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const editTrigger = useRef<HTMLButtonElement | null>(null)

  useLayoutEffect(() => {
    if (editingTransaction || !editTrigger.current) return
    editTrigger.current.focus()
    editTrigger.current = null
  }, [editingTransaction])

  const closeEditor = () => setEditingTransaction(null)

  // Two states on purpose: typing does not refetch on every keystroke.
  // Submitting the search form copies searchInput into search, which is the
  // only value the query watches.
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const invalidRange = Boolean(fromDate && toDate && fromDate > toDate)

  const { data, isLoading, isFetching, error } = useListTransactionsQuery({
    page,
    limit,
    // undefined keys are skipped by fetchBaseQuery, so they never reach the URL.
    type: type || undefined,
    category: category || undefined,
    from: dateRange.from || undefined,
    to: dateRange.to || undefined,
    search: search || undefined,
    sort,
  })

  const [deleteTransaction, { isLoading: isDeleting }] =
    useDeleteTransactionMutation()
  const [deleteError, setDeleteError] = useState('')
  const { data: categoryData, isLoading: loadingCategories } = useListCategoriesQuery()
  const categoryNames = new Map(categoryData?.categories.map(({ _id, name }) => [_id, name]))

  function clearDates() {
    setFromDate('')
    setToDate('')
    setDateRange({ from: '', to: '' })
    setDateFieldKey((key) => key + 1)
    setPage(1)
  }

  function resetFilters() {
    setSearchInput('')
    setSearch('')
    setType('')
    setCategory('')
    setSort('newest')
    clearDates()
  }

  const applySearch = (event: FormEvent) => {
    event.preventDefault()
    setPage(1)
    setSearch(searchInput.trim())
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this transaction?')) return

    setDeleteError('')

    try {
      await deleteTransaction(id).unwrap()

      // If the last row on this page was deleted, step back instead of
      // showing an empty page.
      if (data && data.transactions.length === 1 && page > 1) {
        setPage(page - 1)
      }
    } catch (err) {
      setDeleteError(getErrorMessage(err))
    }
  }

  const pagination = data?.pagination
  const transactions = data?.transactions ?? []

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="page-heading flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="page-description">
            {pagination ? `${pagination.total} transaction(s)` : 'Loading…'}
          </p>
        </div>
      </header>

      {editingTransaction ? (
        <TransactionForm key={editingTransaction._id} transaction={editingTransaction}
          onUpdated={closeEditor} onCancel={closeEditor} />
      ) : (
        <TransactionForm key="new" onCreated={() => setPage(1)} />
      )}

      {/* Show the headers and sample rows before the user maps any columns. */}
      <CsvPreview />

      {/* ---------------- FILTERS ---------------- */}
      <section className="filter-bar">
        <form onSubmit={applySearch} className="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:flex-1">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              aria-label="Search transaction descriptions"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search description…"
              className="form-control control-height w-full pr-3 pl-8"
            />
          </div>
          <button
            type="submit"
            className="button-primary control-height"
          >
            Search
          </button>
        </form>

        <CustomSelect
          aria-label="Transaction type"
          value={type}
          onChange={(event) => {
            setType(event.target.value as TransactionType | '')
            setPage(1)
          }}
        >
          <option value="">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </CustomSelect>

        <CustomSelect
          aria-label="Filter transactions by category"
          value={category}
          disabled={loadingCategories}
          onChange={(event) => {
            setCategory(event.target.value)
            setPage(1)
          }}
        >
          <option value="">{loadingCategories ? 'Loading categories…' : 'All categories'}</option>
          {category && !categoryNames.has(category) && (
            <option value={category}>Category unavailable</option>
          )}
          {categoryData?.categories.map(({ _id, name }) => (
            <option key={_id} value={_id}>{name}</option>
          ))}
        </CustomSelect>

        <CustomSelect
          aria-label="Sort transactions"
          value={sort}
          onChange={(event) => {
            setSort(event.target.value as TransactionSort)
            setPage(1)
          }}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="highest">Highest amount</option>
          <option value="lowest">Lowest amount</option>
        </CustomSelect>

        <button type="button" className="button-secondary control-height" onClick={resetFilters}>
          Reset all filters
        </button>

        {isFetching && !isLoading && (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        )}
      </section>

      <form
        aria-label="Filter transactions by date range"
        className="surface-card space-y-3 p-4"
        onSubmit={(event) => {
          event.preventDefault()
          if (invalidRange) return
          setDateRange({ from: fromDate, to: toDate })
          setPage(1)
        }}
      >
        <div className="filter-bar">
          <div className="field-stack">
            <label htmlFor="transactions-from">From</label>
            <DateField key={`from-${dateFieldKey}`} id="transactions-from" value={fromDate}
              onChange={(event) => setFromDate(event.target.value)} />
          </div>
          <div className="field-stack">
            <label htmlFor="transactions-to">To</label>
            <DateField key={`to-${dateFieldKey}`} id="transactions-to" value={toDate}
              onChange={(event) => setToDate(event.target.value)} />
          </div>
          <button type="submit" className="button-primary control-height" disabled={invalidRange}>
            Apply dates
          </button>
          <button type="button" className="button-secondary control-height" onClick={clearDates}>
            Clear dates
          </button>
        </div>
        {invalidRange && (
          <p role="alert" className="form-error">The end date must be on or after the start date.</p>
        )}
      </form>

      {error && (
        <p className="form-error">
          {getErrorMessage(error)}
        </p>
      )}
      {deleteError && (
        <p className="form-error">
          {deleteError}
        </p>
      )}

      {/* ---------------- TABLE ---------------- */}
      <section className="surface-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading transactions…
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            No transactions match these filters.
          </div>
        ) : (
          <div className="relative overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Type</th>
                  <th scope="col">Description</th>
                  <th scope="col">Category</th>
                  <th scope="col" className="text-right">Amount</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr
                    key={transaction._id}
                  >
                    <td className="whitespace-nowrap text-muted-foreground">
                      {new Date(transaction.date).toLocaleDateString(undefined, { timeZone: 'UTC' })}
                    </td>
                    <td>
                      <span
                        className={
                          transaction.type === 'income'
                            ? 'status-badge status-success'
                            : 'status-badge status-danger'
                        }
                      >
                        {transaction.type === 'income' ? 'Income' : 'Expense'}
                      </span>
                    </td>
                    <td className="max-w-60 truncate px-4 py-3">
                      {transaction.description || '—'}
                    </td>
                    <td className="text-muted-foreground">
                      {categoryNames.get(transaction.category)
                        ?? (loadingCategories ? 'Loading category…' : 'Category unavailable')}
                    </td>
                    <td
                      className={`text-right font-medium whitespace-nowrap ${
                        transaction.type === 'income'
                          ? 'text-income'
                          : 'text-expense'
                      }`}
                    >
                      {transaction.type === 'income' ? '+' : '−'}
                      {formatAmount(transaction)}
                    </td>
                    <td className="text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(event) => {
                          editTrigger.current = event.currentTarget
                          setEditingTransaction(transaction)
                        }}
                        disabled={isDeleting || editingTransaction !== null}
                        aria-label="Edit transaction"
                        className="rounded-md p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-50"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(transaction._id)}
                        disabled={isDeleting || editingTransaction?._id === transaction._id}
                        aria-label="Delete transaction"
                        className="rounded-md p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ---------------- PAGINATION ---------------- */}
      {pagination && pagination.totalPages > 1 && (
        <footer className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage(page - 1)}
              disabled={page <= 1 || isFetching}
              className="flex h-9 items-center gap-1 rounded-md border border-border px-3 transition hover:bg-muted disabled:opacity-50"
            >
              <ArrowLeft className="size-4" />
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage(page + 1)}
              disabled={page >= pagination.totalPages || isFetching}
              className="flex h-9 items-center gap-1 rounded-md border border-border px-3 transition hover:bg-muted disabled:opacity-50"
            >
              Next
              <ArrowRight className="size-4" />
            </button>
          </div>
        </footer>
      )}
    </div>
  )
}
