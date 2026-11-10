// ============================================================================
// CalculatorPanel.tsx — a slide-over calculator with local history.
//
// No eval(): arithmetic is a small switch, so user input can never execute
// code. History lives in localStorage (see useLocalStorage).
// ============================================================================

import { Delete, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

import { useLocalStorage } from '../hooks/useWorkspace'
import type {
  CalculationEntry,
  CalculatorOperator,
} from '../types/workspace.types'
import CalculationHistory from './CalculationHistory'

interface CalculatorPanelProps {
  open: boolean
  onClose: () => void
}

const SYMBOLS: Record<CalculatorOperator, string> = {
  '+': '+',
  '-': '−',
  '*': '×',
  '/': '÷',
}

function format(value: number): string {
  if (!Number.isFinite(value)) return '0'

  // Trim floating-point noise such as 0.30000000000000004.
  const rounded = Math.round((value + Number.EPSILON) * 1e10) / 1e10
  return String(rounded)
}

function calculate(
  left: number,
  right: number,
  operator: CalculatorOperator
): number {
  switch (operator) {
    case '+':
      return left + right
    case '-':
      return left - right
    case '*':
      return left * right
    case '/':
      if (right === 0) throw new Error('Cannot divide by zero')
      return left / right
  }
}

interface CalcButtonProps {
  children: ReactNode
  onClick: () => void
  variant?: 'digit' | 'operator' | 'action' | 'equals'
  className?: string
  label?: string
}

function CalcButton({
  children,
  onClick,
  variant = 'digit',
  className = '',
  label,
}: CalcButtonProps) {
  const styles = {
    digit: 'bg-muted hover:bg-p-soft',
    operator: 'bg-p1/10 text-p1 hover:bg-p1/20',
    action: 'bg-secondary text-secondary-foreground hover:bg-muted',
    equals: 'bg-primary text-primary-foreground hover:opacity-90',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`h-12 rounded-xl text-lg font-semibold transition active:scale-95 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

export default function CalculatorPanel({
  open,
  onClose,
}: CalculatorPanelProps) {
  const [display, setDisplay] = useState('0')
  const [stored, setStored] = useState<number | null>(null)
  const [operator, setOperator] = useState<CalculatorOperator | null>(null)
  const [waiting, setWaiting] = useState(false)
  const [expression, setExpression] = useState('')
  const [error, setError] = useState('')

  const [history, setHistory] = useLocalStorage<CalculationEntry[]>(
    'spendwise.workspace.calculator',
    []
  )

  useEffect(() => {
    if (!open) return

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  const inputDigit = (digit: string) => {
    setError('')

    if (waiting) {
      setDisplay(digit)
      setWaiting(false)
      return
    }

    setDisplay((previous) => {
      if (digit === '.') {
        return previous.includes('.') ? previous : `${previous}.`
      }

      return previous === '0' ? digit : `${previous}${digit}`
    })
  }

  const chooseOperator = (next: CalculatorOperator) => {
    setError('')
    const current = Number(display)

    if (operator && stored !== null && !waiting) {
      try {
        const result = calculate(stored, current, operator)
        setStored(result)
        setDisplay(format(result))
        setExpression(`${format(result)} ${SYMBOLS[next]}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Cannot calculate')
        return
      }
    } else {
      setStored(current)
      setExpression(`${display} ${SYMBOLS[next]}`)
    }

    setOperator(next)
    setWaiting(true)
  }

  const handleEquals = () => {
    if (operator === null || stored === null) return

    setError('')

    try {
      const result = calculate(stored, Number(display), operator)
      const entry: CalculationEntry = {
        id: crypto.randomUUID(),
        expression: `${format(stored)} ${SYMBOLS[operator]} ${display}`,
        result: format(result),
        createdAt: new Date().toISOString(),
      }

      setHistory((previous) => [entry, ...previous].slice(0, 30))
      setExpression(`${format(stored)} ${SYMBOLS[operator]} ${display} =`)
      setDisplay(format(result))
      setStored(null)
      setOperator(null)
      setWaiting(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot calculate')
    }
  }

  const handlePercent = () => {
    setDisplay((previous) => format(Number(previous) / 100))
  }

  const handleBackspace = () => {
    if (waiting) return

    setDisplay((previous) =>
      previous.length <= 1 ? '0' : previous.slice(0, -1)
    )
  }

  const handleClear = () => {
    setDisplay('0')
    setStored(null)
    setOperator(null)
    setWaiting(false)
    setExpression('')
    setError('')
  }

  const useHistoryResult = (result: string) => {
    setDisplay(result)
    setExpression('')
    setError('')
    setWaiting(true)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm"
      onMouseDown={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="calculator-title"
        onMouseDown={(event) => event.stopPropagation()}
        className="flex h-full w-full max-w-sm flex-col gap-3 overflow-y-auto border-l border-border bg-card p-4 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 id="calculator-title" className="text-base font-semibold">
            Calculator
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close calculator"
            className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Display */}
        <div className="rounded-2xl border border-border bg-background p-4 text-right">
          <p className="h-4 truncate text-xs text-muted-foreground">
            {expression || '\u00a0'}
          </p>
          <p
            className="mt-1 truncate text-3xl font-bold tracking-tight"
            aria-live="polite"
          >
            {display}
          </p>
        </div>

        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-4 gap-2">
          <CalcButton variant="action" onClick={handleClear} label="Clear">
            C
          </CalcButton>
          <CalcButton
            variant="action"
            onClick={handlePercent}
            label="Percent"
          >
            %
          </CalcButton>
          <CalcButton
            variant="action"
            onClick={handleBackspace}
            label="Backspace"
          >
            <Delete className="mx-auto size-5" />
          </CalcButton>
          <CalcButton
            variant="operator"
            onClick={() => chooseOperator('/')}
            label="Divide"
          >
            ÷
          </CalcButton>

          {['7', '8', '9'].map((digit) => (
            <CalcButton key={digit} onClick={() => inputDigit(digit)}>
              {digit}
            </CalcButton>
          ))}
          <CalcButton
            variant="operator"
            onClick={() => chooseOperator('*')}
            label="Multiply"
          >
            ×
          </CalcButton>

          {['4', '5', '6'].map((digit) => (
            <CalcButton key={digit} onClick={() => inputDigit(digit)}>
              {digit}
            </CalcButton>
          ))}
          <CalcButton
            variant="operator"
            onClick={() => chooseOperator('-')}
            label="Subtract"
          >
            −
          </CalcButton>

          {['1', '2', '3'].map((digit) => (
            <CalcButton key={digit} onClick={() => inputDigit(digit)}>
              {digit}
            </CalcButton>
          ))}
          <CalcButton
            variant="operator"
            onClick={() => chooseOperator('+')}
            label="Add"
          >
            +
          </CalcButton>

          <CalcButton
            onClick={() => inputDigit('0')}
            className="col-span-2"
          >
            0
          </CalcButton>
          <CalcButton onClick={() => inputDigit('.')} label="Decimal point">
            .
          </CalcButton>
          <CalcButton variant="equals" onClick={handleEquals} label="Equals">
            =
          </CalcButton>
        </div>

        <CalculationHistory
          entries={history}
          onSelect={useHistoryResult}
          onClear={() => setHistory([])}
        />
      </div>
    </div>
  )
}
