import { useId } from 'react'

interface EmailCodeInputProps {
  value: string
  onChange(value: string): void
  disabled?: boolean
}

export default function EmailCodeInput({ value, onChange, disabled }: EmailCodeInputProps) {
  const id = useId()
  return (
    <div className="field-stack">
      <label htmlFor={id} className="text-sm font-medium">Email code</label>
      <input
        id={id}
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={6}
        required
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, ''))}
        className="form-control w-full px-3 tracking-widest"
      />
    </div>
  )
}
