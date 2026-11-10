// ============================================================================
// GoalProgressChart.tsx — how far each goal has come, as a percentage.
//
// Percent (not money) is on the X axis on purpose: goals can use different
// currencies, so adding their amounts into one axis would be wrong.
// The dashed line marks 100% (target reached).
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

import type { GoalStatus } from '../../features/goals/services/goalApi'

// One entry per goal row. Built by GoalsPage.
interface GoalProgressRow {
  name: string
  percent: number
  status: GoalStatus
}

interface GoalProgressChartProps {
  data: GoalProgressRow[]
}

// Token colors, so the chart follows the page theme (and dark mode).
const statusColor: Record<GoalStatus, string> = {
  active: 'var(--p1)',
  completed: 'var(--income)',
  cancelled: 'var(--muted-foreground)',
}

export default function GoalProgressChart({ data }: GoalProgressChartProps) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No goals to chart yet.
      </p>
    )
  }

  // Round up to a 25% step so the 100% line is always visible and the ticks
  // stay readable, even when a goal is over-funded.
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
        <ReferenceLine x={100} stroke="var(--income)" strokeDasharray="4 4" />
        <Bar dataKey="percent" name="Saved" unit="%" radius={[0, 4, 4, 0]}>
          {data.map((row) => (
            <Cell key={row.name} fill={statusColor[row.status]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
