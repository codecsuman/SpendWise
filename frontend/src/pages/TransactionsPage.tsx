// ============================================================================
// TransactionsPage.tsx — the user's money in and out.
//
// This page only READS and DELETES for now. Creating or editing a transaction
// needs a real Category _id, and Categories arrive in Phase 5. Once they
// exist, add the create/edit form here.
//
// The backend already scopes every row to the logged-in user, so this page
// never sends a user id — only filters.
// ============================================================================

import { ArrowLeft, ArrowRight, Loader2, Search, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'

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

const selectClass =
  'h-9 rounded-md border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring/50'

export default function TransactionsPage() {
  const [page, setPage] = useState(1)
  const [type, setType] = useState<TransactionType | ''>('')
  const [sort, setSort] = useState<TransactionSort>('newest')

  // Two states on purpose: typing does not refetch on every keystroke.
  // Submitting the search form copies searchInput into search, which is the
  // only value the query watches.
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  const { data, isLoading, isFetching, error } = useListTransactionsQuery({
    page,
    limit,
    // undefined keys are skipped by fetchBaseQuery, so they never reach the URL.
    type: type || undefined,
    search: search || undefined,
    sort,
  })

  const [deleteTransaction, { isLoading: isDeleting }] =
    useDeleteTransactionMutation()
  const [deleteError, setDeleteError] = useState('')

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
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
          <p className="text-sm text-muted-foreground">
            {pagination ? `${pagination.total} transaction(s)` : 'Loading…'}
          </p>
        </div>
      </header>

      {/* ---------------- FILTERS ---------------- */}
      <section className="flex flex-wrap items-center gap-2">
        <form onSubmit={applySearch} className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search description…"
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
          onChange={(event) => {
            setType(event.target.value as TransactionType | '')
            setPage(1)
          }}
          className={selectClass}
        >
          <option value="">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>

        <select
          value={sort}
          onChange={(event) => {
            setSort(event.target.value as TransactionSort)
            setPage(1)
          }}
          className={selectClass}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="highest">Highest amount</option>
          <option value="lowest">Lowest amount</option>
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
      {deleteError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {deleteError}
        </p>
      )}

      {/* ---------------- TABLE ---------------- */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {isLoading ? (
          <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading transactions…
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            No transactions match these filters.
            <span className="mt-1 block text-xs">
              Creating one needs a category, which arrives in Phase 5.
            </span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr
                    key={transaction._id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {new Date(transaction.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          transaction.type === 'income'
                            ? 'font-medium text-emerald-600 dark:text-emerald-400'
                            : 'font-medium text-rose-600 dark:text-rose-400'
                        }
                      >
                        {transaction.type === 'income' ? 'Income' : 'Expense'}
                      </span>
                    </td>
                    <td className="max-w-60 truncate px-4 py-3">
                      {transaction.description || '—'}
                    </td>
                    {/* No category names yet: show the id tail until Phase 5. */}
                    <td
                      className="px-4 py-3 font-mono text-xs text-muted-foreground"
                      title={transaction.category}
                    >
                      #{transaction.category.slice(-6)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-medium whitespace-nowrap ${
                        transaction.type === 'income'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {transaction.type === 'income' ? '+' : '−'}
                      {formatAmount(transaction)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(transaction._id)}
                        disabled={isDeleting}
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
