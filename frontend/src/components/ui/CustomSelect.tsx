import { Select } from 'radix-ui'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import {
  Children, isValidElement, useId, useLayoutEffect, useRef, useState,
  type ComponentPropsWithRef, type ComponentPropsWithoutRef,
} from 'react'

type Props = Omit<ComponentPropsWithRef<'select'>, 'multiple' | 'size' | 'value' | 'defaultValue'> & {
  value?: string | number
  defaultValue?: string | number
  placeholder?: string
}

const keyFor = (value: string) => `option:${value}`

export default function CustomSelect({
  children, id, className, ref, value, defaultValue, disabled, required, name, form,
  onChange, onBlur, onInvalid, placeholder = 'Choose an option',
  'aria-label': ariaLabel, 'aria-labelledby': labelledBy, 'aria-describedby': describedBy,
  'aria-invalid': invalid,
}: Props) {
  const native = useRef<HTMLSelectElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const errorId = useId()
  const [container, setContainer] = useState<HTMLElement>()
  const [nativeValue, setNativeValue] = useState<string>()
  const [validationMessage, setValidationMessage] = useState('')
  const open = useRef(false)
  const options = new Map<string, { label: string; disabled?: boolean }>()
  for (const child of Children.toArray(children)) {
    if (!isValidElement<ComponentPropsWithoutRef<'option'>>(child) || child.type !== 'option') continue
    const label = child.props.label ?? Children.toArray(child.props.children).join('')
    const optionValue = String(child.props.value ?? label)
    if (!options.has(optionValue)) options.set(optionValue, { label, disabled: child.props.disabled })
  }

  // Retain native form submission, validation and React Hook Form registration.
  function attachNative(element: HTMLSelectElement | null) {
    native.current = element
    if (typeof ref === 'function') return ref(element)
    if (ref) ref.current = element
  }

  useLayoutEffect(() => {
    const host = trigger.current?.closest<HTMLElement>('dialog, .page-theme')
    if (host) setContainer(host)
  }, [])

  useLayoutEffect(() => {
    if (value === undefined && native.current) setNativeValue(native.current.value)
  }, [value, children, ref])

  useLayoutEffect(() => {
    const field = native.current
    if (!field?.form) return
    let frame = 0
    const reset = () => {
      frame = requestAnimationFrame(() => {
        setNativeValue(field.value)
        setValidationMessage('')
      })
    }
    field.form.addEventListener('reset', reset)
    return () => {
      field.form?.removeEventListener('reset', reset)
      cancelAnimationFrame(frame)
    }
  }, [form])

  const selected = value === undefined
    ? nativeValue ?? String(defaultValue ?? options.keys().next().value ?? '')
    : String(value)

  function selectValue(key: string) {
    const field = native.current
    if (!field) return
    field.value = key.slice('option:'.length)
    field.dispatchEvent(new Event('change', { bubbles: true }))
  }

  function notifyBlur() {
    native.current?.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
  }

  return (
    <Select.Root
      value={options.has(selected) ? keyFor(selected) : ''}
      onValueChange={selectValue}
      onOpenChange={(next) => {
        open.current = next
        if (!next) notifyBlur()
      }}
      disabled={disabled}
    >
      <Select.Trigger
        ref={trigger}
        id={id}
        className={`custom-select-trigger form-control${className ? ` ${className}` : ''}`}
        aria-label={ariaLabel}
        aria-labelledby={labelledBy}
        aria-describedby={[describedBy, validationMessage && errorId].filter(Boolean).join(' ') || undefined}
        aria-invalid={invalid || Boolean(validationMessage) || undefined}
        aria-required={required}
        onBlur={() => { if (!open.current) notifyBlur() }}
      >
        <span className="custom-select-value"><Select.Value placeholder={placeholder} /></span>
        <Select.Icon asChild><ChevronDown className="custom-select-chevron" aria-hidden="true" /></Select.Icon>
      </Select.Trigger>
      <select
        ref={attachNative}
        aria-hidden="true"
        tabIndex={-1}
        className="sr-only"
        name={name}
        form={form}
        value={value}
        defaultValue={defaultValue}
        disabled={disabled}
        required={required}
        onChange={(event) => {
          setNativeValue(event.currentTarget.value)
          if (event.currentTarget.validity.valid) setValidationMessage('')
          onChange?.(event)
        }}
        onBlur={onBlur}
        onFocus={() => trigger.current?.focus()}
        onInvalid={(event) => {
          event.preventDefault()
          setValidationMessage(event.currentTarget.validationMessage)
          const field = event.currentTarget
          const invalidField = field.form?.querySelector('input:invalid, select:invalid, textarea:invalid')
          if (!invalidField || invalidField === field) trigger.current?.focus()
          onInvalid?.(event)
        }}
      >
        {children}
      </select>
      {validationMessage && <span id={errorId} className="text-xs text-destructive" role="alert">{validationMessage}</span>}
      {container && (
        <Select.Portal container={container}>
          <Select.Content className="custom-select-menu" position="popper" align="start" sideOffset={6} collisionPadding={8}>
            <Select.ScrollUpButton className="custom-select-scroll"><ChevronUp size={16} /></Select.ScrollUpButton>
            <Select.Viewport className="custom-select-viewport">
              {Array.from(options, ([optionValue, option]) => (
                <Select.Item key={optionValue} value={keyFor(optionValue)} disabled={option.disabled} className="custom-select-option">
                  <Select.ItemText>{option.label}</Select.ItemText>
                  <span className="custom-select-check"><Select.ItemIndicator><Check size={16} /></Select.ItemIndicator></span>
                </Select.Item>
              ))}
              {options.size === 0 && <span className="custom-select-empty">No options available</span>}
            </Select.Viewport>
            <Select.ScrollDownButton className="custom-select-scroll"><ChevronDown size={16} /></Select.ScrollDownButton>
          </Select.Content>
        </Select.Portal>
      )}
    </Select.Root>
  )
}
