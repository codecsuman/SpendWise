import { useState, type FormEvent } from 'react'
import EmailCodeInput from './EmailCodeInput'
import {
  useAuthOptionsQuery,
  useGetMeQuery,
  useSendEmailVerificationCodeMutation,
  useVerifyEmailMutation,
} from '../services/authApi'
import { getAuthError } from '../services/authError'

export default function EmailVerificationCard() {
  const { data: session } = useGetMeQuery()
  const { data: options } = useAuthOptionsQuery()
  const [sendCode, { isLoading: sending }] = useSendEmailVerificationCodeMutation()
  const [verify, { isLoading: verifying, data: verified }] = useVerifyEmailMutation()
  const [code, setCode] = useState('')
  const [requested, setRequested] = useState(false)
  const [error, setError] = useState('')

  const user = session?.user
  const emailVerified = verified?.user.emailVerified || user?.emailVerified
  if (!user || (!options?.emailCodes && !emailVerified)) return null

  const busy = sending || verifying

  async function request() {
    setError('')
    try {
      await sendCode().unwrap()
      setRequested(true)
    } catch (error) {
      setError(getAuthError(error, 'Could not request an email code. Try again shortly.'))
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    try {
      await verify({ code }).unwrap()
      setCode('')
    } catch (error) {
      setError(getAuthError(error, 'Could not verify your email. Try again shortly.'))
    }
  }

  return (
    <section className="surface-card space-y-3 p-6">
      <h2 className="text-base font-semibold">Email verification</h2>
      {emailVerified ? (
        <p role="status" className="text-sm text-muted-foreground">{user.email} is verified.</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">Send a six-digit code to {user.email}.</p>
          <button type="button" disabled={busy} onClick={() => void request()} className="button-secondary">
            {sending ? 'Requesting…' : requested ? 'Resend code' : 'Send email code'}
          </button>
          {error && <p role="alert" className="form-error">{error}</p>}
          {requested && (
            <form onSubmit={(event) => void submit(event)} className="max-w-xs space-y-3">
              <p role="status" className="text-sm text-muted-foreground">Check your inbox or spam. Wait one minute before requesting another code.</p>
              <EmailCodeInput value={code} onChange={setCode} disabled={busy} />
              <button type="submit" disabled={busy} className="button-primary">
                {verifying ? 'Verifying…' : 'Verify email'}
              </button>
            </form>
          )}
        </>
      )}
    </section>
  )
}
