import CustomSelect from '../components/ui/CustomSelect'
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
import CsvPreview from '../features/csv/components/CsvPreview'

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
      <header className="page-heading flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="page-description">
            {pagination ? `${pagination.total} transaction(s)` : 'Loading…'}
          </p>
        </div>
      </header>

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

        {isFetching && !isLoading && (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        )}
      </section>

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
            <span className="mt-1 block text-xs">
              Creating one needs a category, which arrives in Phase 5.
            </span>
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
                      {new Date(transaction.date).toLocaleDateString()}
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
                    {/* No category names yet: show the id tail until Phase 5. */}
                    <td
                      className="font-mono text-xs text-muted-foreground"
                      title={transaction.category}
                    >
                      #{transaction.category.slice(-6)}
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
                    <td className="text-right">
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
