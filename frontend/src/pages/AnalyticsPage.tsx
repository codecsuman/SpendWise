// ============================================================================
// AnalyticsPage.tsx — a deeper look than the Dashboard.
//
// Same endpoint, different lens: where the money went (donut) plus how income
// and expense moved over a chosen number of months (area chart).
//
// No page-wrap: MainLayout supplies page-analytics + the moving grid.
// ============================================================================

import { useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { useGetMeQuery } from '../features/auth/services/authApi'
import { useGetOverviewQuery } from '../features/analytics/services/analyticsApi'
import type { AnalyticsQuery } from '../features/analytics/services/analyticsApi'

const monthShort = new Intl.DateTimeFormat(undefined, { month: 'short' })

function shortMonth(month: string) {
  const [year, m] = month.split('-').map(Number)
  if (!year || !m) return month
  return monthShort.format(new Date(Date.UTC(year, m - 1, 1)))
}

function formatMoney(value: number, currency: string) {
  const safe = Number.isFinite(value) ? value : 0
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(safe)
  } catch {
    return `${safe.toFixed(2)} ${currency}`
  }
}

const ranges = [3, 6, 12]

export default function AnalyticsPage() {
  const [month, setMonth] = useState('')
  const [months, setMonths] = useState(6)

  const { data: me } = useGetMeQuery()
  const currency = me?.user.currency ?? 'USD'

  const query: AnalyticsQuery = { months }
  if (month) query.month = month

  const { data, isLoading, isError, refetch } = useGetOverviewQuery(query)
  const overview = data?.overview

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-10 w-56 rounded-lg" />
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="skeleton h-96 rounded-2xl" />
          <div className="skeleton h-96 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (isError || !overview) {
    return (
      <div className="card-lift p-6">
        <h2 className="text-lg font-semibold">Analytics are unavailable</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Check the backend is running, then try again.
        </p>
        <button type="button" onClick={() => refetch()} className="btn-3d mt-4">
          Try again
        </button>
      </div>
    )
  }

  const hasExpenses = overview.categories.length > 0

  return (
    <div className="space-y-6">
      {/* ---------------- header ---------------- */}
      <div className="fade-up flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Analytics
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Spending split and the trend for {overview.month}
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Month
            <input
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className="field rounded-lg px-3 py-2 text-sm text-foreground"
            />
          </label>

          <div className="flex gap-1">
            {ranges.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setMonths(value)}
                className={`btn-3d sm ${months === value ? '' : 'gray'}`}
              >
                {value}m
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {/* ---------------- donut ---------------- */}
        <section className="card-lift p-5">
          <h2 className="font-semibold">Spending by category</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Share of {formatMoney(overview.expense, currency)} spent this month
          </p>

          {!hasExpenses ? (
            <p className="mt-6 text-sm text-muted-foreground">
              No expenses recorded for {overview.month}.
            </p>
          ) : (
            <>
              <div className="mt-4">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={overview.categories}
                      dataKey="amount"
                      nameKey="name"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={2}
                    >
                      {overview.categories.map((row) => (
                        <Cell key={row.categoryId} fill={row.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatMoney(Number(value), currency)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <ul className="space-y-2">
                {overview.categories.map((row) => (
                  <li
                    key={row.categoryId}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="size-3 shrink-0 rounded-full"
                        style={{ background: row.color }}
                        aria-hidden="true"
                      />
                      <span className="truncate">{row.name}</span>
                    </span>
                    <span className="shrink-0 text-muted-foreground">
                      {row.percent.toFixed(1)}% ·{' '}
                      {formatMoney(row.amount, currency)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        {/* ---------------- trend ---------------- */}
        <section className="card-lift p-5">
          <h2 className="font-semibold">Income vs expense</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Last {months} months, starting from {overview.month}
          </p>

          <div className="mt-4">
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart
                data={overview.trend}
                margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
              >
                <defs>
                  <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="var(--income)"
                      stopOpacity={0.45}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--income)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="var(--expense)"
                      stopOpacity={0.45}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--expense)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="month"
                  tickFormatter={(value: string) => shortMonth(value)}
                  tick={{ fontSize: 12 }}
                />
                <YAxis tick={{ fontSize: 12 }} width={56} />
                <Tooltip
                  formatter={(value) => formatMoney(Number(value), currency)}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="income"
                  name="Income"
                  stroke="var(--income)"
                  fill="url(#incomeFill)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  name="Expense"
                  stroke="var(--expense)"
                  fill="url(#expenseFill)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
            <div className="rounded-xl bg-muted p-3">
              <p className="text-xs text-muted-foreground">Income</p>
              <p className="amount-income mt-1">
                {formatMoney(overview.income, currency)}
              </p>
            </div>
            <div className="rounded-xl bg-muted p-3">
              <p className="text-xs text-muted-foreground">Expense</p>
              <p className="amount-expense mt-1">
                {formatMoney(overview.expense, currency)}
              </p>
            </div>
            <div className="rounded-xl bg-muted p-3">
              <p className="text-xs text-muted-foreground">Saved</p>
              <p className="mt-1 font-bold">
                {formatMoney(overview.savings, currency)}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
