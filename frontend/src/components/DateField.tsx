import { addDays, addMonths, addYears, endOfMonth, format, parseISO, startOfMonth } from 'date-fns'
import { CalendarDays, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { useCallback, useId, useLayoutEffect, useRef, useState, type ComponentPropsWithRef, type KeyboardEvent } from 'react'

type DateFieldProps = Omit<ComponentPropsWithRef<'input'>, 'type' | 'className'> & {
  type?: 'date' | 'month'
}

const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const buttonClass = 'inline-flex size-8 items-center justify-center rounded-md hover:bg-primary/10'

export default function DateField({
  type = 'date',
  ref,
  value,
  defaultValue,
  onChange,
  onBlur,
  ...props
}: DateFieldProps) {
  const titleId = useId()
  const formatId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const lastInput = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const activeCell = useRef<HTMLButtonElement>(null)
  const moveFocus = useRef(false)
  const savedValue = useRef('')
  const committing = useRef(false)
  const [draft, setDraft] = useState<{ text: string; originalValue: typeof value } | null>(null)
  const [cursor, setCursor] = useState(() => new Date())
  const [selection, setSelection] = useState('')

  const monthOnly = type === 'month'
  const valueFormat = monthOnly ? 'yyyy-MM' : 'yyyy-MM-dd'
  const displayFormat = monthOnly ? 'YYYY-MM' : 'YYYY-MM-DD'
  const first = startOfMonth(cursor)
  const leadingCells = first.getDay()
  const dayCount = endOfMonth(cursor).getDate()
  const cells = Array.from({ length: monthOnly ? 12 : Math.ceil((leadingCells + dayCount) / 7) * 7 }, (_, index) => {
    if (monthOnly) return addMonths(first, index - first.getMonth())
    const day = index - leadingCells + 1
    return day >= 1 && day <= dayCount ? addDays(first, day - 1) : null
  })
  const columns = monthOnly ? 3 : 7

  const attachInput = useCallback((element: HTMLInputElement | null) => {
    inputRef.current = element
    const cleanup = typeof ref === 'function' ? ref(element) : undefined
    if (ref && typeof ref !== 'function') ref.current = element
    if (element && element !== lastInput.current) {
      lastInput.current = element
      savedValue.current = element.value
    }
    return cleanup
  }, [ref])

  // External changes, such as clearing a report filter, replace the draft.
  useLayoutEffect(() => {
    const input = inputRef.current
    if (input && value !== undefined && input.value !== String(value)) {
      input.value = String(value)
      input.setCustomValidity('')
    }
    if (value !== undefined) savedValue.current = String(value)
  }, [value])

  useLayoutEffect(() => {
    if (moveFocus.current) {
      moveFocus.current = false
      activeCell.current?.focus()
    }
  }, [cursor])

  function parseValue(text: string) {
    const pattern = monthOnly ? /^\d{4}-\d{2}$/ : /^\d{4}-\d{2}-\d{2}$/
    if (!pattern.test(text)) return null
    const date = parseISO(monthOnly ? text + '-01' : text)
    return !Number.isNaN(date.getTime()) && date.getFullYear() > 0 ? date : null
  }

  function openCalendar() {
    const text = inputRef.current?.value ?? ''
    const initial = parseValue(text)
    setSelection(initial ? text : '')
    moveFocus.current = true
    setCursor(initial ?? new Date())
    dialogRef.current?.showModal()
  }

  function moveCursor(next: Date, focus = false) {
    if (next.getFullYear() < 1 || next.getFullYear() > 9999) return
    moveFocus.current = focus
    setCursor(next)
  }

  function navigateGrid(event: KeyboardEvent<HTMLTableElement>) {
    const step = monthOnly ? addMonths : addDays
    let next: Date

    switch (event.key) {
      case 'ArrowLeft': next = step(cursor, -1); break
      case 'ArrowRight': next = step(cursor, 1); break
      case 'ArrowUp': next = step(cursor, -columns); break
      case 'ArrowDown': next = step(cursor, columns); break
      case 'Home':
        next = step(cursor, -(monthOnly ? cursor.getMonth() % columns : cursor.getDay()))
        break
      case 'End':
        next = step(cursor, columns - 1 - (monthOnly ? cursor.getMonth() % columns : cursor.getDay()))
        break
      case 'PageUp':
        next = monthOnly || event.shiftKey ? addYears(cursor, -1) : addMonths(cursor, -1)
        break
      case 'PageDown':
        next = monthOnly || event.shiftKey ? addYears(cursor, 1) : addMonths(cursor, 1)
        break
      default: return
    }

    event.preventDefault()
    moveCursor(next, true)
  }

  function saveValue(text: string) {
    const input = inputRef.current
    if (!input || (text ? !parseValue(text) : props.required)) return

    // Reset React's tracked value first so typing and calendar selection both
    // emit one change when the user confirms a new value.
    input.value = savedValue.current
    input.setCustomValidity('')
    if (text !== savedValue.current) {
      committing.current = true
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, text)
      input.dispatchEvent(new Event('input', { bubbles: true }))
      committing.current = false
    }
    setDraft(null)
  }

  function applySelection() {
    if (!selection) return
    saveValue(selection)
    dialogRef.current?.close()
  }

  const pending = draft && draft.originalValue === value && !props.disabled && !props.readOnly ? draft.text : null

  return (
    <div className="inline-flex min-w-0 flex-wrap items-center gap-2">
      <div className="relative min-w-0 flex-1">
      <input
        {...props}
        ref={attachInput}
        type="text"
        placeholder={displayFormat}
        defaultValue={value ?? defaultValue}
        aria-describedby={[props['aria-describedby'], formatId].filter(Boolean).join(' ')}
        onChange={(event) => {
          const input = event.currentTarget
          if (committing.current) {
            savedValue.current = input.value
            onChange?.(event)
            return
          }

          setDraft(input.value === savedValue.current ? null : { text: input.value, originalValue: value })
          const valid = !input.value || Boolean(parseValue(input.value))
          input.setCustomValidity(input.value === savedValue.current ? '' : valid
            ? 'Select Save to apply this value.'
            : `Enter a valid ${monthOnly ? 'month' : 'date'} as ${displayFormat}.`)
        }}
        onBlur={(event) => {
          if (event.currentTarget.value === savedValue.current) onBlur?.(event)
        }}
        onKeyDown={(event) => {
          props.onKeyDown?.(event)
          if (event.key === 'Enter' && pending !== null && !event.defaultPrevented) {
            event.preventDefault()
            saveValue(event.currentTarget.value)
          }
        }}
        className="form-control date-field w-full px-3 pr-10"
      />
      <span id={formatId} className="sr-only">Type {displayFormat} or use the calendar button.</span>
      <button
        ref={triggerRef}
        type="button"
        aria-label={monthOnly ? 'Choose month and year' : 'Choose date'}
        aria-haspopup="dialog"
        disabled={props.disabled || props.readOnly}
        className="absolute inset-y-0 right-0 flex w-9 items-center justify-center rounded-r-md text-primary disabled:opacity-50"
        onClick={openCalendar}
      >
        <CalendarDays className="size-4" aria-hidden="true" />
      </button>
      </div>
      {pending !== null && (
        <button type="button" className="button-primary control-height" onClick={() => saveValue(pending)} disabled={pending ? !parseValue(pending) : props.required}>
          Save
        </button>
      )}

      {/* A native modal contains keyboard focus and supports Escape to cancel. */}
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClose={() => triggerRef.current?.focus()}
        className="date-picker-dialog floating-shadow m-auto w-[22rem] rounded-2xl border border-primary/40 bg-card p-4 text-card-foreground backdrop:bg-black/50"
      >
        <header className="flex items-center justify-between gap-1 rounded-lg bg-primary/10 p-1 text-primary">
          {!monthOnly && (
            <button type="button" aria-label="Previous year" className={buttonClass} onClick={() => moveCursor(addYears(cursor, -1))}>
              <ChevronsLeft className="size-4" aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            aria-label={monthOnly ? 'Previous year' : 'Previous month'}
            className={buttonClass}
            onClick={() => moveCursor(monthOnly ? addYears(cursor, -1) : addMonths(cursor, -1))}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <h2 id={titleId} aria-live="polite" className="flex-1 text-center text-sm font-semibold text-foreground">
            {format(cursor, monthOnly ? 'yyyy' : 'MMMM yyyy')}
          </h2>
          <button
            type="button"
            aria-label={monthOnly ? 'Next year' : 'Next month'}
            className={buttonClass}
            onClick={() => moveCursor(monthOnly ? addYears(cursor, 1) : addMonths(cursor, 1))}
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
          {!monthOnly && (
            <button type="button" aria-label="Next year" className={buttonClass} onClick={() => moveCursor(addYears(cursor, 1))}>
              <ChevronsRight className="size-4" aria-hidden="true" />
            </button>
          )}
        </header>

        <table role="grid" aria-labelledby={titleId} className="mt-2 w-full table-fixed text-center text-sm" onKeyDown={navigateGrid}>
          {!monthOnly && (
            <thead>
              <tr>
                {weekDays.map((day) => (
                  <th key={day} scope="col" abbr={day} className="py-2 text-xs text-muted-foreground">{day.slice(0, 2)}</th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {Array.from({ length: cells.length / columns }, (_, row) => (
              <tr key={row}>
                {cells.slice(row * columns, (row + 1) * columns).map((date, column) => {
                  if (!date) return <td key={column} />
                  const value = format(date, valueFormat)
                  const active = value === format(cursor, valueFormat)
                  const selected = value === selection
                  return (
                    <td key={column} aria-selected={selected} className="p-0.5">
                      <button
                        ref={active ? activeCell : undefined}
                        type="button"
                        tabIndex={active ? 0 : -1}
                        aria-label={format(date, monthOnly ? 'MMMM yyyy' : 'EEEE, MMMM d, yyyy')}
                        className={`h-9 w-full rounded-md ${selected ? 'bg-primary text-primary-foreground' : 'hover:bg-primary/10'}`}
                        onClick={() => {
                          setCursor(date)
                          setSelection(value)
                        }}
                      >
                        {format(date, monthOnly ? 'MMM' : 'd')}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>

        <p aria-live="polite" className="mt-3 text-sm text-muted-foreground">
          {selection ? `Selected: ${format(parseISO(monthOnly ? selection + '-01' : selection), monthOnly ? 'MMMM yyyy' : 'MMMM d, yyyy')}` : monthOnly ? 'Choose a month.' : 'Choose a day.'}
        </p>

        <div className="mt-3 flex justify-end gap-2">
          <button type="button" className="rounded-md px-3 text-sm hover:bg-muted" onClick={() => dialogRef.current?.close()}>
            Cancel
          </button>
          <button type="button" disabled={!selection} className="button-primary h-9" onClick={applySelection}>
            OK
          </button>
        </div>
      </dialog>
    </div>
  )
}
