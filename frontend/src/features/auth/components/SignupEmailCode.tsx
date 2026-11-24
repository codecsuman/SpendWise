import { useState } from 'react'
import { z } from 'zod'
import EmailCodeInput from './EmailCodeInput'
import { useSendSignupCodeMutation } from '../services/authApi'
import { getAuthError } from '../services/authError'

interface SignupEmailCodeProps {
  email: string
  code: string
  onCodeChange(value: string): void
  disabled: boolean
}

export default function SignupEmailCode({ email, code, onCodeChange, disabled }: SignupEmailCodeProps) {
  const [requestCode, { isLoading }] = useSendSignupCodeMutation()
  const [sentFor, setSentFor] = useState('')
  const [error, setError] = useState('')
  const address = email.trim().toLowerCase()
  const sent = address !== '' && address === sentFor

  async function send() {
    setError('')
    if (!z.email().safeParse(address).success) {
      setError('Enter your email address before requesting a code.')
      return
    }

    try {
      await requestCode({ email: address }).unwrap()
      setSentFor(address)
      onCodeChange('')
    } catch (error) {
      setError(getAuthError(error, 'Could not request a code. Try again shortly.'))
    }
  }

  return (
    <div className="space-y-2">
      <button type="button" onClick={() => void send()} disabled={disabled || isLoading} className="button-secondary">
        {isLoading ? 'Requesting…' : sent ? 'Resend email code' : 'Send email code'}
      </button>
      {sent && <p role="status" className="text-sm text-muted-foreground">Check your inbox and spam for the code. If you already have an account, sign in or reset your password.</p>}
      {error && <p role="alert" className="form-error">{error}</p>}
      <EmailCodeInput value={code} onChange={onCodeChange} disabled={disabled || isLoading} />
    </div>
  )
}
