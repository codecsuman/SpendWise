// ============================================================================
// BudgetChart.tsx — how much of each budget is used, as a percentage.
//
// Percent (not money) is on the X axis on purpose: budgets can have different
// currencies, so adding their amounts into one axis would be wrong.
// The dashed line marks 100%; anything to the right of it is overspending.
// ============================================================================

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { BudgetStatus } from '../../features/budgets/services/budgetApi'

// One entry per budget row. Built by BudgetsPage after joining the category.
interface BudgetChartRow {
  name: string
  percent: number
  status: BudgetStatus
}

interface BudgetChartProps {
  data: BudgetChartRow[]
}

// Same colours as the status badges in the list below the chart.
const statusColor: Record<BudgetStatus, string> = {
  normal: '#10b981',
  warning: '#f59e0b',
  exceeded: '#ef4444',
}

export default function BudgetChart({ data }: BudgetChartProps) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No budgets to chart for this month yet.
      </p>
    )
  }

  // Round up to a 25% step so the 100% line is always visible and the ticks
  // stay readable, even when someone is at 180%.
  const maxPercent =
    Math.ceil(Math.max(100, ...data.map((row) => row.percent)) / 25) * 25

  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 46)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 8, right: 24, bottom: 8, left: 8 }}
      >
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <XAxis
          type="number"
          domain={[0, maxPercent]}
          tickFormatter={(value: number) => `${value}%`}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={110}
          tickFormatter={(value: string) =>
            value.length > 14 ? `${value.slice(0, 13)}…` : value
          }
        />
        <Tooltip cursor={{ fill: 'rgba(0, 0, 0, 0.04)' }} />
        <ReferenceLine x={100} stroke="#ef4444" strokeDasharray="4 4" />
        <Bar dataKey="percent" name="Used" unit="%" radius={[0, 4, 4, 0]}>
          {data.map((row) => (
            <Cell key={row.name} fill={statusColor[row.status]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
