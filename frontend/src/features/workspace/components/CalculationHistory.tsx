// ============================================================================
// CalculationHistory.tsx — the last 30 calculator results.
//
// History is stored in localStorage by CalculatorPanel, so it stays on this
// device and needs no API.
// ============================================================================

import { History, Trash2 } from 'lucide-react'

import type { CalculationEntry } from '../types/workspace.types'

interface CalculationHistoryProps {
  entries: CalculationEntry[]
  onSelect: (result: string) => void
  onClear: () => void
}

export default function CalculationHistory({
  entries,
  onSelect,
  onClear,
}: CalculationHistoryProps) {
  return (
    <section className="flex min-h-0 flex-col gap-2 border-t border-border pt-3">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold">
          <History className="size-3.5" />
          History
        </h3>

        {entries.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition hover:text-destructive"
          >
            <Trash2 className="size-3" />
            Clear
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Your calculations will appear here.
        </p>
      ) : (
        <ul className="flex max-h-44 flex-col gap-1 overflow-y-auto pr-1">
          {entries.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => onSelect(entry.result)}
                className="w-full rounded-lg px-2 py-1.5 text-left transition hover:bg-muted"
                title="Use this result"
              >
                <span className="block truncate text-[11px] text-muted-foreground">
                  {entry.expression}
                </span>
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold">{entry.result}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Intl.DateTimeFormat(undefined, {
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(new Date(entry.createdAt))}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
