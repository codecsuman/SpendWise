import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import EmailCodeInput from '../features/auth/components/EmailCodeInput'
import {
  useAuthOptionsQuery,
  useForgotPasswordMutation,
  useResetPasswordMutation,
} from '../features/auth/services/authApi'
import { getAuthError } from '../features/auth/services/authError'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [requested, setRequested] = useState(false)
  const [complete, setComplete] = useState(false)
  const [error, setError] = useState('')
  const { data: options } = useAuthOptionsQuery()
  const [requestCode, { isLoading: sending }] = useForgotPasswordMutation()
  const [resetPassword, { isLoading: resetting }] = useResetPasswordMutation()
  const busy = sending || resetting
  const unavailable = options?.emailCodes === false

  async function sendCode() {
    setError('')
    try {
      await requestCode({ email: email.trim() }).unwrap()
      setRequested(true)
    } catch (error) {
      setError(getAuthError(error, 'Could not request a code. Try again shortly.'))
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!requested) {
      await sendCode()
      return
    }

    setError('')
    if (password !== confirmation) {
      setError('The new passwords do not match.')
      return
    }

    try {
      await resetPassword({ email: email.trim(), code, password }).unwrap()
      setPassword('')
      setConfirmation('')
      setCode('')
      setComplete(true)
    } catch (error) {
      setError(getAuthError(error, 'Could not reset your password. Try again shortly.'))
    }
  }

  function useAnotherEmail() {
    setRequested(false)
    setCode('')
    setPassword('')
    setConfirmation('')
    setError('')
  }

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <section className="surface-card w-full max-w-md space-y-5 p-6 sm:p-8">
        <header>
          <h1 className="page-title">Reset your password</h1>
          <p className="page-description">Use the email address on your SpendWise account.</p>
        </header>

        {complete ? (
          <div className="space-y-3">
            <p role="status">Password reset. Sign in with your new password.</p>
            <Link to="/login" className="button-primary w-full">Sign in</Link>
          </div>
        ) : (
          <>
            {unavailable && <p role="status" className="text-sm text-muted-foreground">Email delivery is unavailable right now.</p>}
            {error && <p role="alert" className="form-error">{error}</p>}
            <form onSubmit={(event) => void submit(event)} className="space-y-4">
              <div className="field-stack">
                <label htmlFor="reset-email" className="text-sm font-medium">Email</label>
                <input
                  id="reset-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  readOnly={requested}
                  disabled={busy || unavailable}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="form-control w-full px-3"
                />
              </div>

              {requested && (
                <>
                  <p role="status" className="text-sm text-muted-foreground">
                    If the email is registered, check your inbox or spam for a code. Wait one minute before requesting another.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="button-secondary" onClick={() => void sendCode()} disabled={busy || unavailable}>
                      {sending ? 'Requesting…' : 'Resend code'}
                    </button>
                    <button type="button" className="button-secondary" onClick={useAnotherEmail} disabled={busy}>
                      Use another email
                    </button>
                  </div>
                  <EmailCodeInput value={code} onChange={setCode} disabled={busy} />
                  <div className="field-stack">
                    <label htmlFor="reset-password" className="text-sm font-medium">New password</label>
                    <input
                      id="reset-password"
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      maxLength={128}
                      required
                      disabled={busy}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      aria-describedby="reset-password-hint"
                      className="form-control w-full px-3"
                    />
                    <p id="reset-password-hint" className="text-xs text-muted-foreground">Use 8 or more characters, including uppercase, lowercase, a number and a symbol.</p>
                  </div>
                  <div className="field-stack">
                    <label htmlFor="reset-confirmation" className="text-sm font-medium">Confirm new password</label>
                    <input
                      id="reset-confirmation"
                      type="password"
                      autoComplete="new-password"
                      required
                      disabled={busy}
                      value={confirmation}
                      onChange={(event) => setConfirmation(event.target.value)}
                      className="form-control w-full px-3"
                    />
                  </div>
                </>
              )}

              <button type="submit" disabled={busy || unavailable} className="button-primary w-full">
                {busy ? (requested && resetting ? 'Resetting…' : 'Requesting…') : requested ? 'Reset password' : 'Send email code'}
              </button>
            </form>
            <Link to="/login" className="inline-block text-sm font-medium text-primary hover:underline">Back to sign in</Link>
          </>
        )}
      </section>
    </main>
  )
}
