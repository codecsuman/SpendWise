// ============================================================================
// DashboardPage.tsx — the first screen after login.
//
// Data comes from one call: GET /api/analytics?month=YYYY-MM&months=6
// The server already did the maths (totals, savings, category split, trend),
// so this file only formats numbers and draws them.
//
// No page-wrap here: MainLayout already supplies page-dashboard + fx.
// ============================================================================

import { useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { useGetMeQuery } from '../features/auth/services/authApi'
import { useGetOverviewQuery } from '../features/analytics/services/analyticsApi'
import type { AnalyticsQuery } from '../features/analytics/services/analyticsApi'

// "2026-11" -> "Nov". Used for the chart labels only.
const monthShort = new Intl.DateTimeFormat(undefined, { month: 'short' })

function shortMonth(month: string) {
  const [year, m] = month.split('-').map(Number)
  if (!year || !m) return month
  return monthShort.format(new Date(Date.UTC(year, m - 1, 1)))
}

// Money as text. The currency comes from the user's profile.
function formatMoney(value: number, currency: string) {
  const safe = Number.isFinite(value) ? value : 0
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(safe)
  } catch {
    // Intl throws on an unknown currency code; never crash the page for it.
    return `${safe.toFixed(2)} ${currency}`
  }
}

// Short axis labels so 12,500 becomes 12.5k.
function compact(value: number) {
  return new Intl.NumberFormat(undefined, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

export default function DashboardPage() {
  // '' means "let the server pick the current month".
  const [month, setMonth] = useState('')

  const { data: me } = useGetMeQuery()
  const currency = me?.user.currency ?? 'USD'

  const query: AnalyticsQuery = { months: 6 }
  if (month) query.month = month

  const { data, isLoading, isFetching, isError, refetch } =
    useGetOverviewQuery(query)

  const overview = data?.overview
  const hasActivity =
    !!overview &&
    (overview.income > 0 ||
      overview.expense > 0 ||
      overview.categories.length > 0)

  // ---------------- loading ----------------
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-10 w-56 rounded-lg" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="skeleton h-28 rounded-2xl" />
          ))}
        </div>
        <div className="skeleton h-80 rounded-2xl" />
      </div>
    )
  }

  // ---------------- error ----------------
  if (isError || !overview) {
    return (
      <div className="card-lift p-6">
        <h2 className="text-lg font-semibold">Could not load your dashboard</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The server did not answer. Check that the backend is running, then try
          again.
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="btn-3d mt-4"
        >
          Try again
        </button>
      </div>
    )
  }

  // Highest category share, used for the "biggest share" hint.
  const topCategory = overview.categories[0]

  return (
    <div className="space-y-6">
      {/* ---------------- header ---------------- */}
      <div className="fade-up flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {overview.month} · income, spending and savings at a glance
          </p>
        </div>

        <div className="flex items-end gap-2">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Month
            <input
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className="field rounded-lg px-3 py-2 text-sm text-foreground"
            />
          </label>

          {month && (
            <button
              type="button"
              onClick={() => setMonth('')}
              className="btn-3d gray sm"
            >
              This month
            </button>
          )}
        </div>
      </div>

      {/* ---------------- stat cards ---------------- */}
      <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="stat-card c1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Income
          </p>
          <p className="amount-income mt-2 text-2xl">
            {formatMoney(overview.income, currency)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Money in for {overview.month}
          </p>
        </article>

        <article className="stat-card c2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Expense
          </p>
          <p className="amount-expense mt-2 text-2xl">
            {formatMoney(overview.expense, currency)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Money out for {overview.month}
          </p>
        </article>

        <article className="stat-card c3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Savings
          </p>
          <p
            className={`mt-2 text-2xl font-bold ${
              overview.savings >= 0 ? 'text-income' : 'text-expense'
            }`}
          >
            {formatMoney(overview.savings, currency)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Income minus expense
          </p>
        </article>

        <article className="stat-card c4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Savings rate
          </p>
          <p className="mt-2 text-2xl font-bold">
            {overview.savingsRate.toFixed(1)}%
          </p>
          <div className="progress-track mt-3">
            <div
              className={`progress-fill ${
                overview.savingsRate < 0
                  ? 'danger'
                  : overview.savingsRate < 20
                    ? 'warn'
                    : 'ok'
              }`}
              style={{
                width: `${Math.min(100, Math.max(0, overview.savingsRate))}%`,
              }}
            />
          </div>
        </article>
      </div>

      {!hasActivity && (
        <p className="card-lift p-4 text-sm text-muted-foreground">
          Nothing recorded for {overview.month} yet. Add a transaction and this
          page fills up on its own.
        </p>
      )}

      {/* ---------------- chart + categories ---------------- */}
      <div className="grid gap-4 xl:grid-cols-3">
        <section className="card-lift p-5 xl:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Last 6 months</h2>
            {isFetching && <span className="pulse-dot" aria-hidden="true" />}
          </div>

          <div className="mt-4">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={overview.trend}
                margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="month"
                  tickFormatter={(value: string) => shortMonth(value)}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  tickFormatter={(value: number) => compact(value)}
                  tick={{ fontSize: 12 }}
                  width={56}
                />
                <Tooltip
                  formatter={(value) => formatMoney(Number(value), currency)}
                  cursor={{ fill: 'rgba(0, 0, 0, 0.04)' }}
                />
                <Legend />
                <Bar
                  dataKey="income"
                  name="Income"
                  fill="var(--income)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="expense"
                  name="Expense"
                  fill="var(--expense)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card-lift p-5">
          <h2 className="font-semibold">Where the money went</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Top categories in {overview.month}
          </p>

          {overview.categories.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">
              No expenses this month.
            </p>
          ) : (
            <ul className="mt-4 space-y-4">
              {overview.categories.slice(0, 6).map((row) => (
                <li key={row.categoryId}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="size-3 shrink-0 rounded-full"
                        style={{ background: row.color }}
                        aria-hidden="true"
                      />
                      <span className="truncate">{row.name}</span>
                    </span>
                    <span className="shrink-0 text-muted-foreground">
                      {formatMoney(row.amount, currency)}
                    </span>
                  </div>
                  <div className="progress-track mt-2 h-2">
                    <div
                      className="progress-fill"
                      style={{ width: `${Math.min(100, row.percent)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}

          {topCategory && (
            <p className="mt-4 text-xs text-muted-foreground">
              Biggest share: {topCategory.name} ·{' '}
              {topCategory.percent.toFixed(1)}%
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
