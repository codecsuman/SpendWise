import CustomSelect from './ui/CustomSelect'
import { useId, useState } from 'react'
import DateField from './DateField'

interface ReportPeriodFieldProps {
  value: string
  onChange: (value: string) => void
}

export default function ReportPeriodField({ value, onChange }: ReportPeriodFieldProps) {
  const labelId = useId()
  const modeId = useId()
  const [mode, setMode] = useState<'month' | 'date'>('month')

  return (
    <div className="report-period-fields min-w-0">
      <div className="field-stack text-xs text-muted-foreground">
        <label htmlFor={modeId}>View by</label>
        <CustomSelect
          id={modeId}
          value={mode}
          onChange={(event) => {
            const next = event.target.value === 'date' ? 'date' : 'month'
            setMode(next)
            if (next === 'month') onChange(value.slice(0, 7))
          }}
        >
          <option value="month">Month</option>
          <option value="date">Date</option>
        </CustomSelect>
      </div>
      <div className="field-stack text-xs text-muted-foreground">
        <label htmlFor={labelId}>{mode === 'month' ? 'Month' : 'Date'}</label>
        {/* Start Date mode blank until the user confirms an exact day. */}
        <DateField
          key={mode}
          id={labelId}
          type={mode}
          value={mode === 'month' ? value.slice(0, 7) : value.length === 10 ? value : ''}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </div>
  )
}
